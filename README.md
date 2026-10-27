# USB-Website-Revamp

Purdue USB main website.

## Layout

```
frontend/          Vite + React + Tailwind SPA (the site itself)
  public/            static data & images (blog, wiki, members, initiatives)
  public/board-photos/   GENERATED avatar derivatives - do not edit by hand
  src/               pages, components, and lib/ data loaders
  scripts/           build tooling (board photo optimizer)
api/               Vercel serverless functions (Node) - reads MongoDB
backend/           Python Instagram -> Groq -> MongoDB sync job
.github/workflows/ the nightly sync Action
```

## Tech stack

- **Frontend:** React, Tailwind, Vite, Framer Motion, Embla carousel
- **API:** Vercel serverless functions, MongoDB Atlas
- **Sync job:** Python (instagrapi + Groq + PyMongo) on GitHub Actions

---

## Board photos

The originals in `frontend/public/Board Member Photos/{png,webp}` are
camera-resolution files — 210 MB total, up to 23 MB each — that the homepage
renders into a 224 px circle. They are **inputs**, never served.

`npm run optimize:photos` turns each one into 256/512 px AVIF + WebP crops plus
a ~100-byte blurred placeholder recorded in `board-members.json`, and writes
them to `public/board-photos/`. Filenames embed a hash of the source image, so
they are served `immutable` and a refresh re-requests nothing.

The result for the 30 visible members: **67 MB → 697 KB.**

This runs automatically as part of `npm run build`, and the originals are
stripped from `dist/` afterwards.

**When you add or replace a board member:** edit
`frontend/public/Board Member Photos/board-members.json`, drop the photo in
`png/` or `webp/`, then run `npm run optimize:photos`. Committing the generated
`public/board-photos/` output is what makes it live.

---

## Instagram pipeline

Replaces the hand-maintained `insta_posts.json`, which stays in the repo as an
offline fallback.

```
GitHub Action (daily 07:10 UTC)
  └─ backend/run_sync.py
       ├─ instagrapi   → 20 most recent @purdueusb posts
       ├─ Groq vision  → reads each flyer + caption, marks events
       ├─ Pillow       → post images re-encoded to WebP @1080px
       └─ MongoDB      → written ONLY if the content hash changed

Browser
  └─ /api/instagram/posts        → JSON, cached 1h at the edge (SWR 24h)
      └─ /api/instagram/image/:hash → WebP bytes, immutable
          └─ falls back to /Instagram Posts/insta_posts.json if Atlas is down
```

Post images live in MongoDB as binary rather than as Instagram CDN links,
because those links are signed and expire. Serving them from
`/api/instagram/image/<hash>` means the URL is content-addressed and cacheable
forever.

**Why instagrapi and not Instaloader.** Instaloader lists posts only through
Instagram's web GraphQL endpoint, and Instagram returns a blanket 401 there for
scraper-ish accounts - even for the account's own timeline. Its profile lookup is
separately broken for `@purdueusb`, whose professional-account metadata trips a
server-side schema error (`ig_business_category_subvertical`). instagrapi talks
to the private mobile API (`api/v1/...`) instead, which answers normally for the
same account and credentials. Posts come back with pinned ones first, so the
scraper re-sorts by timestamp.

**Classification looks at the picture, not just the caption.** USB announces
events as flyer graphics where the date, time and room number are burned into
the image and never written in the caption, so a text-only classifier misses
them. `qwen/qwen3.8-27b` is Groq's vision model (free preview tier); it takes at
most 5 images per request, so posts go up in batches of 5 with each caption
interleaved before its own image.

**Only flyers count.** Videos and Reels are filtered out at scrape time by
`media_type`, not left to the classifier - a video thumbnail is an arbitrary
frame, not a designed graphic. One Reel of security-camera footage was picked as
an event with its burned-in timecode ("TCR 10-09") read as the event date. The
scraper over-fetches so dropping videos still leaves a full set of candidates,
and the prompt additionally rejects candid photos, recap dumps and screenshots.

**Groq's free tier is 200,000 tokens per day**, and `max_tokens` counts against
it whether or not the model generates that much. One post costs roughly 3,900
tokens, so classifying a full batch of 20 uses about 40% of the day's budget.
That is affordable because it is rare: the verdict cache means a normal night
classifies whatever is new, usually nothing. Bumping `PROMPT_VERSION` re-derives
all 20 and does cost a full batch.

If the day's tokens run out mid-run the job stops immediately rather than
retrying (a per-day limit does not refill in seconds), and if fewer than
`MIN_LLM_COVERAGE` of the posts got a real verdict it **leaves the database
alone**. The caption-only heuristic cannot read flyers, so it yields events with
no title and no date - strictly worse than yesterday's data, and not worth
publishing. `--allow-heuristic` overrides that when you would rather have the
right posts now than the right metadata later.

Only model verdicts are cached. Heuristic ones are deliberately not, because
caching a fallback would mark the post "already classified" and stop the model
from ever looking at it again.

The job is idempotent, which matters because it runs unattended every night:

- Verdicts are cached in `instagram_classified`, keyed by post id + a hash of
  the caption. A post is sent to the model **once**; an edited caption
  re-triggers it. Steady state is however many things USB posted since
  yesterday — usually zero, sometimes one.
- The write is gated on a content hash over exactly what the site renders (ids,
  captions, titles, image hashes, ordering). No change, no write.
- Already-stored images are reused for known posts, so Instagram re-encoding its
  own CDN media doesn't cause daily churn.
- The Instagram session is cached in MongoDB and reused. Instagram treats
  repeated logins as suspicious, and an unattended nightly job would otherwise
  log in from scratch 365 times a year; this makes it roughly one login per
  session lifetime. It self-heals - a stale session is detected, dropped, and
  replaced by a fresh login. That is why no session blob lives in `.env`: it is
  internal state, not configuration.

If Groq is unreachable or answers with nonsense, a keyword heuristic picks the
events instead — a slightly worse carousel beats an empty one.

The model id is `GROQ_MODEL` in `.env` — swap it for any vision-capable Groq
model. The rest of the tuning (batch size, how many posts to pull, image
dimensions, collection names) lives in `backend/usb_sync/config.py`.

### Setup

1. `cp .env.example .env` and fill it in — seven keys.
2. **MongoDB Atlas** — free tier is plenty (~1 MB of data). Allow `0.0.0.0/0`
   under Network Access; both Vercel and GitHub Actions call from rotating IPs.
3. **Groq** — free key at <https://console.groq.com/keys>. The vision model is
   on the free preview tier; 5 images per request, a handful of requests a day.
4. **Instagram login.** Set `IG_USERNAME` and `IG_PASSWORD` to an established
   throwaway
   Instagram account that follows @purdueusb - not a personal one, and not
   @purdueusb itself. The password goes into repo secrets, so anyone with admin
   on this repo can read it.

   The account must not have two-factor auth enabled; an unattended job cannot
   answer a 2FA prompt. Prefer an account with some history - Instagram
   throttles low-reputation accounts hard, and a burst of requests can earn a
   soft block lasting hours. If login fails the job logs a loud error and
   continues anonymously, which works for a public profile but gets rate limited
   quickly from GitHub's runners.

   The account must be able to log in without a checkpoint. If it cannot, the
   job fails loudly rather than writing partial data.

5. **GitHub repo secrets:** `MONGODB_URI`, `GROQ_API_KEY`, `IG_USERNAME`,
   `IG_PASSWORD`. `GROQ_MODEL`, `MONGODB_DB` and `IG_PROFILE` can be repo
   *variables* rather than secrets.
6. **Vercel env vars:** `MONGODB_URI` (plus `MONGODB_DB` if not `purdue_usb`).
   The functions only ever read.

Test the whole pipeline without touching the database:

```bash
npm run sync:instagram:dry
```

### Keeping the database awake

MongoDB Atlas pauses a free cluster after a stretch with no connection, and a
paused cluster refuses every connection until somebody clicks Resume in the
dashboard - it does not wake itself when traffic arrives. A serverless site only
touches Mongo when someone visits, so a quiet summer can genuinely reach that
threshold. `.github/workflows/keep-database-awake.yml` runs
`backend/keep_database_awake.py` daily to prevent it.

It pings the deployed `/api/instagram/posts` rather than connecting with the
driver: that endpoint already reads MongoDB, so serving it resets the idle
timer, no database credential has to live in the workflow, and it exercises the
whole Vercel-to-Atlas path as an uptime check. It insists on the endpoint's JSON
shape, so a misconfigured URL that falls through to the SPA and returns HTML
with a 200 fails loudly instead of passing.

Set `SITE_URL` as a repository **variable** (not a secret - the URL is public)
under Settings -> Secrets and variables -> Actions -> Variables.

Note that scheduled workflows only fire from the default branch, and GitHub
auto-disables them on public repos after 60 days with no new commits.

### ⚠️ Required Vercel change

`api/` lives at the repo root, so the Vercel project's **Root Directory must be
the repository root**, not `frontend/`. Settings → General → Root Directory →
`./`. The root `vercel.json` handles the build, the SPA rewrite, and caching;
`frontend/vercel.json` was removed because it would shadow it.

---

## Running it locally

```bash
npm install                  # once, at the repo root (installs the API's mongodb driver)
npm --prefix frontend install
npm run dev                  # http://localhost:5173
```

`npm run dev` serves the whole thing: the React app, and the `api/` serverless
functions mounted at `/api/*` by a dev-only Vite plugin. That means the
Instagram carousel shows real MongoDB data locally, exactly as in production.
Without it Vite would 404 those routes and the carousel would quietly fall back
to the checked-in `insta_posts.json`, which is easy to mistake for "working".

The API functions read `MONGODB_URI` / `MONGODB_DB` from the root `.env`, so
that file has to exist. Check they are alive with:

```bash
curl localhost:5173/api/health
curl localhost:5173/api/instagram/posts
```

The Python backend is **not** a server - it is a batch job the GitHub Action
runs once a day. Run it by hand only when you want to refresh the data:

```bash
npm run sync:instagram:dry   # scrape + classify, no writes
npm run sync:instagram       # ...and write to MongoDB
```

There is nothing to keep running for the site to work: the frontend reads
MongoDB through `/api/*`, and MongoDB is only ever written by that job.

## Commands

```bash
npm run dev                  # frontend dev server
npm run build                # optimize photos + build to frontend/dist
npm run optimize:photos      # regenerate avatar derivatives only
npm run seed:database        # seed Mongo from the checked-in posts
npm run keepalive            # ping the deployed API so Atlas stays awake
npm run sync:instagram       # run the sync locally (writes to Mongo)
npm run sync:instagram:dry   # same, but --dry-run: no writes
python3 backend/run_sync.py --allow-heuristic   # write without the vision model
npm run lint
```

Endpoints: `/api/instagram/posts`, `/api/instagram/image/<hash>`, `/api/health`.
