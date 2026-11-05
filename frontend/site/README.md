# Purdue USB: Windows XP desktop (design prototype)

This folder is the Open Design project `purdueusb-com-redesign`. Open `index.html` through a local server (below).

A static, no-build prototype of the purdueusb.com homepage as a Windows XP desktop. Content comes from the live site
(`Purdue-CSUSB/USB-Website-Revamp`); only the design is new.

## Run it

Any static server works. From this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` straight from disk also works, apart from the Font Awesome social icons needing internet.)

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page: five windows, desktop icons, Start menu, taskbar |
| `desktop.css` | All styling (XP Luna theme, Explorer-style windows, CRT screen effect) |
| `desktop.js` | Window manager, icons, Start menu, roster and Instagram rendering, CRT toggle |
| `data.js` | Snapshot of the board roster, former members and the six latest Instagram posts |
| `icons.js` | The XP-style vector icon set (inserted into the page before first paint) |
| `wallpaper.svg` | The "Purdue USB 26/27" hills wallpaper |
| `initiatives/*.html` | The initiative pages that live on the USB site (Blog, Career Resources, Club Hub, CS193, Help Room, Mentorship, Panels, Social Wellness, Student Forum / Town Hall, You Don't Need a New Laptop), each a full-screen old-style page. Purdue Technical Projects and Research Resources have their own domains and are untouched |
| `initiatives/help-room.js`, `help-room-data.js`, `blog.js` | The TA finder (with the check-in step), and the blog list/post switching (`blog.html#/post-slug`) |
| `sub.css`, `sub.js` | Shared styling and the screen-texture switch for those pages |
| `cursors.css` | The 8-bit mouse cursors |
| `_archive/` | Earlier iterations (Aero version, pixel theme, old stylesheets, and the redesigned Research Resources site in `research-site/`). Not used by the page; safe to delete |
| `assets/` | Real images from the site: group photo, member photos (AVIF + WebP at 256/512 px), Instagram post images, USB icon, objective icons |

## How it behaves

- On screens at least 900x540 the About Us window opens at startup (with a tip about the icons); on smaller screens nothing is open so the icons show first. Desktop icons: About Us, Meet the Board, Contact Us, Stay Connected, Initiatives, Student Wiki, Tutor List.
- Click selects, double-click opens (a single tap on touch). Windows drag, resize, minimize, maximize and close on wide screens; narrow screens show one window at a time.
- The CRT texture is on by default; the monitor button in the tray turns it off (remembered per browser).

## Preview-only behaviour (remove when porting to the real site)

- Research Resources: the log-in / sign-up dialogs and "Post a Project" do not connect to any backend; the calendar embeds the live Google Calendar.
- `go()` in `desktop.js` shows a "Design preview" notice for pages that are not built here (initiative pages, Student Wiki).
- The Contact form posts to a Google Apps Script that fills a Google Sheet (see "Contact form" below). Until `contact-config.js` has the script's URL, Send shows a notice with the USB email address.
- `data.js` is a snapshot. The live site loads the roster from `board-members.json` and posts from `/api/instagram/posts`.

## Notes

- Former members are listed as text only (the live site shows photos for them too).
- Image alt text for member avatars is empty because the name is shown right beside each photo.

## Live data and deploying

This is wired into the same deploy as the React site: Vercel still runs the root `npm run vercel-build` (which installs and builds `frontend/`) and serves `frontend/dist`, and the `api/` functions, MongoDB and the Instagram sync workflow are untouched.
On this branch `frontend/` builds this redesign instead of the React app (`npm run build:react` / `npm run dev:react` still run the old one).

What the build does (`frontend/scripts/build-site.mjs`): regenerates the blog, Student Wiki and 404 page from `frontend/public` (`build-content.mjs`), copies `public/` into `dist/` as before (board photos and roster, Instagram fallback posts, logos), then copies `site/` on top.

| Piece | How it stays current |
| --- | --- |
| Instagram posts | Read in the browser from `/api/instagram/posts` (MongoDB, filled by the scraper), falling back to `Instagram Posts/insta_posts.json`, then to the snapshot in `data.js` |
| Board roster, photos, former members | Read in the browser from `Board Member Photos/board-members.json` and `/board-photos/` (the files the React site uses), falling back to `data.js` |
| Blog posts, Student Wiki | Regenerated on every build, so a new markdown file plus its manifest entry appears on the next deploy |
| Initiative pages (Mentorship, CS193, Club Hub, Help Room, ...) | Static HTML in `site/initiatives/`. Edit the page by hand; Club Hub's club list and the Help Room TA schedule are copies |

Kept in `data.js` as `overrides` (not in the live files): each member's initiatives, the "Former President" / "Former Treasurer" titles for Maria Molina and Tristan Sze, and Chris McLoughlin's profile link. They are matched to the live roster by name.

`vercel.json` differs from the React version in three small ways, because this is a set of static pages instead of one single-page app: `cleanUrls`, two rewrites so old `/initiatives/blog/<slug>` and `/student-wiki/<slug>` links open the article, and redirects for `/contact` and `/initiatives`. The catch-all rewrite to `index.html` is gone (unknown paths get `404.html`), and `/assets/` is no longer cached as immutable because these files are not content-hashed.

Local preview: `cd frontend && npm install && npm run dev` builds and serves http://localhost:4026. `/api` needs MongoDB, so locally the pages use their fallbacks (set `USB_API_STUB=1` to answer the Instagram endpoint from the checked-in posts).
The scheduled Instagram sync only runs from the repository's default branch, so keep `.github/workflows/instagram-sync.yml` there.

## Contact form

Contact Us posts to a Google Apps Script web app, which adds a row to a Google Sheet and emails the board.
The code for it is `frontend/scripts/contact-sheet.gs`. The page reads the script's URL from `contact-config.js`.

Set up (once, with a Google account that should own the Sheet, for example the USB account):

1. Create a Google Sheet (any name). Open **Extensions > Apps Script**.
2. Replace the editor's contents with `frontend/scripts/contact-sheet.gs`. Check `NOTIFY` (the inbox that also gets each message, or `''` for none). Save.
3. **Deploy > New deployment > Web app.** Execute as: **Me**. Who has access: **Anyone**. Deploy and approve the permissions (Sheets, and Gmail for sending the notification).
4. Copy the **Web app URL** (ends in `/exec`) into `endpoint` in `contact-config.js`, then commit and deploy the site.
5. Send a test message from the site. A "Messages" tab is created in the Sheet on the first one.

Notes:
- After changing the script, use **Deploy > Manage deployments > Edit > New version** so the same URL keeps working.
- The URL is public, as with any form endpoint, so the page includes a hidden spam-trap field. The Sheet is only visible to the people you share it with.
- With `endpoint` empty, or if sending fails, Send shows a notice with the USB email address (no error is shown).
