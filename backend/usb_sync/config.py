"""Configuration for the Instagram sync job.

Only the values that genuinely differ per person or per deploy come from the
environment. Everything else is a constant below, so .env stays short and there
is exactly one place to change a collection name or a tuning number.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:  # optional locally, absent in CI where secrets come from the environment
    from dotenv import load_dotenv

    for candidate in (Path.cwd() / ".env", Path(__file__).resolve().parents[2] / ".env"):
        if candidate.is_file():
            load_dotenv(candidate, override=False)
except ImportError:  # pragma: no cover
    pass


# --- Fixed configuration -----------------------------------------------------
# api/_lib/mongo.js hardcodes the same posts/meta collection names.
POSTS_COLLECTION = "instagram_events"
META_COLLECTION = "instagram_meta"
# Verdict cache, so each post is only ever sent to the model once.
CLASSIFIED_COLLECTION = "instagram_classified"

# Default for GROQ_MODEL. Must be vision-capable: USB announces events as flyer
# graphics where the date, time and location often live in the image rather than
# the caption, so the classifier has to actually look at the picture.
DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b"
# Groq allows up to 5 images per request, but the free tier caps qwen3.8-27b at
# 8,000 tokens/minute and images are expensive (~1,300 tokens each at 512px). One
# post per request keeps each call near 2,200 tokens, and means a single bad
# generation costs one verdict instead of a whole batch.
VISION_BATCH_SIZE = 1
# Seconds between requests: 3/min at ~2,200 tokens is ~6,600 TPM, under the cap.
# Only the first run pays this in full - afterwards the verdict cache means there
# are usually zero new posts to classify.
VISION_BATCH_PAUSE = 20.0
# How many times to retry a request that is rate limited or returns bad JSON.
VISION_MAX_RETRIES = 4
# Groq charges max_tokens against the rate-limit budget whether or not the model
# generates that much, so this is a direct multiplier on daily quota. The reply
# is a few dozen tokens of JSON; the headroom is only there because qwen3.8 is a
# reasoning model and can emit some thinking before the answer.
VISION_MAX_TOKENS = 1024
# ...so also ask it not to think. Dropped automatically if the model rejects it.
VISION_REASONING_EFFORT = "none"

# Refuse to overwrite good data with guesses. If the vision model classified a
# smaller share of the posts than this, the run is treated as unreliable and the
# database is left alone - the caption-only heuristic cannot read flyers, so it
# produces events with no title and no date, which is strictly worse than
# yesterday's data.
MIN_LLM_COVERAGE = 0.6

# Pull FETCH_COUNT recent posts, keep the EVENT_COUNT most recent events.
FETCH_COUNT = 20
EVENT_COUNT = 6

# Post images are re-encoded to WebP at this max edge before being stored.
IMAGE_MAX_DIM = 1080
IMAGE_QUALITY = 80
# Downscaled JPEG sent to the vision model. Vision token cost scales with area,
# so this is the main lever on staying inside the free tier's token budget while
# keeping flyer text readable.
CLASSIFY_IMAGE_DIM = 512
CLASSIFY_IMAGE_QUALITY = 72


class ConfigError(RuntimeError):
    pass


def _password_login_allowed() -> bool:
    """
    Whether this environment may fall back to a username/password login.

    Instagram issues a `challenge_required` checkpoint for password logins that
    arrive from datacenter IPs, and every GitHub-hosted runner is one. The
    checkpoint can only be cleared by a human on a trusted device, so attempting
    the login in CI cannot succeed - it can only burn a login attempt and make
    the account look more suspicious. CI therefore runs session-only by default;
    a developer on a residential connection still gets the fallback.
    """
    override = os.getenv("IG_ALLOW_PASSWORD_LOGIN", "").strip().lower()
    if override:
        return override in {"1", "true", "yes", "on"}
    return not os.getenv("GITHUB_ACTIONS")


def _require(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True)
class Config:
    mongodb_uri: str
    mongodb_db: str

    ig_profile: str
    ig_username: str
    ig_password: str
    ig_session: str
    ig_totp_secret: str
    ig_proxy: str
    ig_allow_password_login: bool

    groq_api_key: str
    groq_model: str

    dry_run: bool = False
    allow_heuristic: bool = False

    @classmethod
    def from_env(cls, dry_run: bool = False, allow_heuristic: bool = False) -> "Config":
        return cls(
            mongodb_uri=_require("MONGODB_URI"),
            mongodb_db=os.getenv("MONGODB_DB", "").strip() or "InstagramPosts",
            ig_profile=os.getenv("IG_PROFILE", "").strip().lstrip("@") or "purdueusb",
            ig_username=os.getenv("IG_USERNAME", "").strip(),
            ig_password=os.getenv("IG_PASSWORD", "").strip(),
            ig_session=os.getenv("IG_SESSION", "").strip(),
            ig_totp_secret=os.getenv("IG_TOTP_SECRET", "").strip(),
            ig_proxy=os.getenv("IG_PROXY", "").strip(),
            ig_allow_password_login=_password_login_allowed(),
            groq_api_key=_require("GROQ_API_KEY"),
            groq_model=os.getenv("GROQ_MODEL", "").strip() or DEFAULT_GROQ_MODEL,
            dry_run=dry_run,
            allow_heuristic=allow_heuristic,
        )
