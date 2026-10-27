"""Decide which scraped Instagram posts are events, from image *and* caption.

USB announces events as flyer graphics: the date, time and room number are very
often burned into the image and never written in the caption. A text-only
classifier misses those, so this sends the post picture alongside its text to
Groq's vision model.

Determinism comes from three things: temperature 0 with a fixed seed, a verdict
cache keyed by post id + caption fingerprint so a post is only ever judged once,
and a keyword heuristic that takes over if Groq is unreachable.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Dict, List, Sequence

from groq import BadRequestError, Groq, NotFoundError, RateLimitError

from .instagram import ScrapedPost

log = logging.getLogger(__name__)


class DailyQuotaExhausted(RuntimeError):
    """Groq's per-day token budget is gone; no amount of waiting helps today."""


class ModelUnavailable(RuntimeError):
    """GROQ_MODEL does not exist (Groq retires preview models); every request will fail."""


def _quota_summary(message: str) -> str:
    """Pull the useful numbers out of Groq's very long rate-limit message."""
    limit = re.search(r"Limit (\d+), Used (\d+), Requested (\d+)", message)
    retry = re.search(r"try again in ([\dhms.]+)", message)
    kind = "TPD" if ("per day" in message or "TPD" in message) else "TPM"
    parts = [kind]
    if limit:
        parts.append(f"limit {limit.group(1)}, used {limit.group(2)}, requested {limit.group(3)}")
    if retry:
        parts.append(f"resets in {retry.group(1)}")
    return "; ".join(parts)

SYSTEM_PROMPT = """You classify Instagram posts from Purdue University's Computer Science \
Undergraduate Student Board (USB), a student organization. For each post you are given its \
caption and its image.

An EVENT post ADVERTISES A GATHERING that USB is hosting and that students can physically \
show up to: a panel, forum, social, info session, workshop, tabling, study night, game night, \
"pizza with professors", help room hours, town hall, and so on.

Apply this test: could a student read this post, put something in their calendar, and turn up \
somewhere? If not, is_event is false. A real event post names an occasion AND tells you when \
and/or where to be - a date, a time, a room or building, or a QR/RSVP link. That detail is \
frequently only in the flyer image, not the caption, so read the image text.

Two independent reasons to answer is_event = false:

1. The image is not a designed promotional flyer. Reject candid photographs, recap photo \
dumps, group or crowd shots, screenshots, memes, and frames that look like camera footage - \
including anything with a timestamp, camera label or timecode overlaid on it. A hype caption \
over a photo is not an event announcement.

2. The post is not advertising a gathering, even though it IS a polished graphic. USB posts a \
lot of well-designed graphics that are not events, and these are the easiest mistake to make. \
Reject anything whose purpose is to celebrate, recognise, introduce or recruit a PERSON: \
"member of the month", member spotlights, honorable mentions, awards, superlatives, \
congratulations, graduate or senior send-offs, new board member announcements, officer \
introductions, birthday posts, recruitment and application callouts, and mentor or volunteer \
sign-ups. A graphic naming a student and their fun fact is a recognition post, not an event, \
however professionally it is laid out.

Also not events: recaps or thank-yous for something that already happened, holiday greetings, \
general announcements, informational infographics, merch drops, and link-in-bio reminders.

Reply with ONLY a JSON object:
{"posts": [{"id": "<post_id>", "is_event": true, "title": "<max 6 words>", "event_date": "YYYY-MM-DD or null"}]}

Rules:
- Include exactly one entry for every post_id you were given, in the same order.
- "title" is a short human label, e.g. "CS Tracks Panel". Use null when is_event is false.
- "event_date" is when the event takes place, read from the caption or the flyer. Use null if \
it is not stated. If only a month and day are shown, infer the year from posted_at.
- Judge the post as a whole: a caption with no details but a flyer full of them is an event,
while an exciting caption over a photograph is not.
- When you are unsure, answer false. A missed event is better than a recognition post shown
as one."""

# Bumped whenever SYSTEM_PROMPT changes in a way that could change a verdict. It
# is part of the cache key, so old verdicts are re-derived under the new rules
# instead of being silently reused.
PROMPT_VERSION = "v3-attendable-events"

EVENT_HINTS = re.compile(
    r"\b(rsvp|join us|come out|panel|forum|social|workshop|info session|game night|"
    r"pizza with|town hall|help room|movie night|study|networking|tabling|"
    r"mark your calendar|see you there|doors open|sign up to attend)\b",
    re.IGNORECASE,
)
DATE_HINTS = re.compile(
    r"\b(\d{1,2}/\d{1,2}|"
    # The ordinal suffix is optional but must be consumed: without it the closing
    # \b lands between "5" and "th" and the whole match fails, so "March 5th" -
    # how USB actually writes dates - would not be recognised.
    r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?|"
    r"\d{1,2}(st|nd|rd|th)\s+(of\s+)?(january|february|march|april|may|june|july|august|"
    r"september|october|november|december)|"
    r"\d{1,2}\s*(am|pm)|\d{1,2}:\d{2})\b",
    re.IGNORECASE,
)


# Phrases that are never an event announcement, whatever else the caption says.
# Word boundaries matter: a bare "graduat" matches "UNDERgraduate", and USB writes
# "Computer Science Undergraduate Student Board" in most of its captions.
HARD_NON_EVENT_HINTS = re.compile(
    r"(member of the month|member spotlight|honorable mention|senior send|"
    r"\bsuperlatives?\b|we are hiring|applications? (are )?(now )?open|"
    r"apply (now|today|here)|meet (our|the) (new )?board|introducing (our|the))",
    re.IGNORECASE,
)

# Weaker signals: usually a recognition post, but they also turn up inside real
# invitations ("Curious about life after graduation? Join us March 5th..."), so
# these only veto when the caption lacks both an event word and a concrete date.
SOFT_NON_EVENT_HINTS = re.compile(
    r"(\bcongrats|\bcongratulations|\bshoutout\b|\bshout out\b|welcome our|"
    r"thank you (all )?for|\brecap\b|\bgraduat|happy (birthday|holidays|new year)|"
    r"\bawards?\b)",
    re.IGNORECASE,
)


def _heuristic_verdict(post: ScrapedPost) -> dict:
    """
    Caption-only fallback for when Groq is unreachable. It cannot see the flyer,
    so it leans on wording: a clear non-event phrase vetoes the post outright,
    which is what keeps recognition posts like "Member of the Month" out even
    when their captions mention a date.
    """
    caption = post.caption or ""
    no = {"is_event": False, "title": None, "event_date": None, "source": "heuristic"}

    if HARD_NON_EVENT_HINTS.search(caption):
        return no

    has_event_word = bool(EVENT_HINTS.search(caption))
    has_date = bool(DATE_HINTS.search(caption))

    # A soft signal only loses to a caption that reads unmistakably like an
    # invitation: it names an event AND says when.
    if SOFT_NON_EVENT_HINTS.search(caption) and not (has_event_word and has_date):
        return no

    return {
        "is_event": has_event_word or has_date,
        "title": None,
        "event_date": None,
        "source": "heuristic",
    }


def _build_batch_messages(batch: Sequence[ScrapedPost], images: Dict[str, str]) -> list:
    """Interleave each post's text with its image so the model can pair them up."""
    content: list = [
        {
            "type": "text",
            "text": f"Classify these {len(batch)} posts. Each post's text is followed by its image.",
        }
    ]
    for post in batch:
        content.append({"type": "text", "text": post.summary_for_llm()})
        data_url = images.get(post.shortcode)
        if data_url:
            content.append({"type": "image_url", "image_url": {"url": data_url}})
        else:
            content.append({"type": "text", "text": "(image unavailable - judge from the caption)"})
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": content},
    ]


def _parse_batch(raw: str, valid_ids: set[str]) -> Dict[str, dict]:
    data = json.loads(raw)
    rows = data.get("posts") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        raise ValueError("response had no 'posts' array")

    out: Dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        pid = str(row.get("id", "")).strip()
        if pid not in valid_ids or pid in out:
            continue
        title = row.get("title")
        date = row.get("event_date")
        out[pid] = {
            "is_event": bool(row.get("is_event")),
            "title": str(title).strip()[:80] if isinstance(title, str) and title.strip() else None,
            "event_date": date if isinstance(date, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", date.strip()) else None,
            "source": "groq",
        }
    return out


def _retry_after(exc: Exception, attempt: int) -> float:
    """Groq puts 'Please try again in 6.9s' in the message; honour it when present."""
    match = re.search(r"try again in ([\d.]+)s", str(exc))
    if match:
        return min(float(match.group(1)) + 1.0, 90.0)
    return min(2 ** attempt * 5.0, 90.0)


def _classify_batch(
    client: Groq,
    batch,
    images,
    model: str,
    max_retries: int,
    max_tokens: int,
    reasoning_effort: str,
) -> Dict[str, dict]:
    """One request, retried on rate limits and empty generations. {} if it never succeeds."""
    ids = {p.shortcode for p in batch}
    messages = _build_batch_messages(batch, images)
    effort = reasoning_effort

    for attempt in range(max_retries):
        try:
            kwargs = dict(
                model=model,
                messages=messages,
                temperature=0,
                top_p=1,
                seed=42,
                response_format={"type": "json_object"},
                max_tokens=max_tokens,
            )
            if effort:
                kwargs["reasoning_effort"] = effort
            completion = client.chat.completions.create(**kwargs)
            return _parse_batch(completion.choices[0].message.content or "", ids)

        except RateLimitError as exc:
            message = str(exc)
            # A per-DAY limit does not refill in seconds - retrying just burns
            # requests. Give up on the whole run so the caller can leave the
            # database alone rather than degrade it.
            if "per day" in message or "TPD" in message:
                raise DailyQuotaExhausted(_quota_summary(message)) from exc

            # Per-minute budgets do refill on a rolling window, so waiting works.
            wait = _retry_after(exc, attempt)
            if attempt == max_retries - 1:
                log.warning("Groq still rate limited after %d attempts: %s", max_retries, message[:200])
                return {}
            log.info("Groq rate limited (%s), waiting %.0fs (attempt %d/%d)",
                     _quota_summary(message), wait, attempt + 1, max_retries)
            time.sleep(wait)

        except NotFoundError as exc:
            raise ModelUnavailable(str(exc)[:200]) from exc

        except BadRequestError as exc:
            message = str(exc)
            if effort and "reasoning" in message.lower():
                log.info("Model rejected reasoning_effort=%s; retrying without it", effort)
                effort = ""
                continue
            if "json_validate_failed" in message:
                # Usually the reasoning tokens consumed the whole budget before
                # any JSON appeared. Retrying is cheap and normally succeeds.
                log.info("Groq returned unparseable JSON (attempt %d/%d); retrying",
                         attempt + 1, max_retries)
                time.sleep(2.0)
                continue
            log.warning("Groq vision request failed (%s)", message[:200])
            return {}

        except (json.JSONDecodeError, ValueError) as exc:
            log.info("Could not parse Groq response (%s); retrying", exc)
            time.sleep(2.0)

        except Exception as exc:
            log.warning("Groq vision request failed (%s)", str(exc)[:200])
            return {}
    return {}


def classify_posts(
    posts: Sequence[ScrapedPost],
    images: Dict[str, str],
    api_key: str,
    model: str,
    batch_size: int,
    batch_pause: float = 0.0,
    max_retries: int = 4,
    max_tokens: int = 4096,
    reasoning_effort: str = "",
) -> Dict[str, dict]:
    """
    Returns {shortcode: {is_event, title, event_date, source}} for every post.
    Callers pass only the posts that still need a verdict.
    """
    verdicts: Dict[str, dict] = {}
    if not posts:
        return verdicts

    client = Groq(api_key=api_key)
    batches = [list(posts[i : i + batch_size]) for i in range(0, len(posts), batch_size)]

    for index, batch in enumerate(batches):
        if index and batch_pause:
            time.sleep(batch_pause)
        log.info("Groq vision batch %d/%d (%d post(s))", index + 1, len(batches), len(batch))
        try:
            parsed = _classify_batch(client, batch, images, model, max_retries,
                                     max_tokens, reasoning_effort)
        except DailyQuotaExhausted as exc:
            # Fill the remainder from the heuristic so the caller still gets a
            # complete map, but let it know the run is not trustworthy.
            log.error("Groq daily token quota exhausted (%s); stopping classification", exc)
            for remaining in batches[index:]:
                for post in remaining:
                    verdicts.setdefault(post.shortcode, _heuristic_verdict(post))
            break
        except ModelUnavailable as exc:
            log.error("Groq model %s is unavailable (%s); set GROQ_MODEL to a current "
                      "vision model from https://console.groq.com/docs/models", model, exc)
            for remaining in batches[index:]:
                for post in remaining:
                    verdicts.setdefault(post.shortcode, _heuristic_verdict(post))
            break
        for post in batch:
            verdicts[post.shortcode] = parsed.get(post.shortcode) or _heuristic_verdict(post)

    groq_count = sum(1 for v in verdicts.values() if v["source"] == "groq")
    log.info("Classified %d post(s): %d by %s, %d by heuristic",
             len(verdicts), groq_count, model, len(verdicts) - groq_count)
    return verdicts


def select_events(
    posts: Sequence[ScrapedPost],
    verdicts: Dict[str, dict],
    limit: int,
) -> List[dict]:
    """The `limit` most recent event posts, newest first."""
    selected = []
    for post in posts:  # already newest-first
        verdict = verdicts.get(post.shortcode)
        if not verdict or not verdict.get("is_event"):
            continue
        selected.append(
            {"id": post.shortcode, "title": verdict.get("title"), "event_date": verdict.get("event_date")}
        )
        if len(selected) >= limit:
            break
    log.info("Selected %d event post(s) out of %d considered", len(selected), len(posts))
    return selected
