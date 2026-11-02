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

- Nothing is open at startup. Desktop icons: About Us, Meet the Board, Contact Us, Stay Connected, Initiatives, Student Wiki, Tutor List.
- Click selects, double-click opens (a single tap on touch). Windows drag, resize, minimize, maximize and close on wide screens; narrow screens show one window at a time.
- The CRT texture is on by default; the monitor button in the tray turns it off (remembered per browser).

## Preview-only behaviour (remove when porting to the real site)

- Research Resources: the log-in / sign-up dialogs and "Post a Project" do not connect to any backend; the calendar embeds the live Google Calendar.
- `go()` in `desktop.js` shows a "Design preview" notice for pages that are not built here (initiative pages, Student Wiki).
- The Contact form does not send anything; the submit handler shows a notice. The real site posts to Formspree.
- `data.js` is a snapshot. The live site loads the roster from `board-members.json` and posts from `/api/instagram/posts`.

## Notes

- Former members are listed as text only (the live site shows photos for them too).
- Image alt text for member avatars is empty because the name is shown right beside each photo.

## Live data and deploying (this branch)

`vercel.json` on this branch serves `usb26/dist` instead of the React app, so a deploy from `usb26` publishes this redesign.
The existing `api/` functions, the MongoDB database and the daily Instagram sync workflow are unchanged and keep working.

| Piece | How it stays current |
| --- | --- |
| Instagram posts | Read in the browser from `/api/instagram/posts` (MongoDB, filled by the scraper), falling back to `Instagram Posts/insta_posts.json`, then to the snapshot in `data.js` |
| Board roster, photos, former members | Read in the browser from `Board Member Photos/board-members.json` and `/board-photos/` (the files the React site uses), falling back to `data.js` |
| Blog posts, Student Wiki | Regenerated from `frontend/public` on every build (`npm run content`), so a new markdown file plus its manifest entry appears on the next deploy |
| Initiative pages (Mentorship, CS193, Club Hub, Help Room, ...) | Static HTML. Edit the page or re-convert it from the React source; Club Hub's club list and the Help Room TA schedule are copies |

Not in the live files, kept in `data.js` as `overrides`: each member's initiatives list, the "Former President" and "Former Treasurer" titles (Maria Molina, Tristan Sze), and Chris McLoughlin's profile link. They are matched to the live roster by name.

Commands (from the repo root): `npm run usb26:build` builds `usb26/dist`; `npm run usb26:dev` builds and serves it at http://localhost:4026.
`/api` needs MongoDB, so locally the pages use their fallbacks (set `USB_API_STUB=1` to answer the Instagram endpoint from the checked-in posts).

The scheduled Instagram sync only runs from the repository's default branch, so keep `.github/workflows/instagram-sync.yml` there.
Old React URLs keep working: `/initiatives/<name>`, `/initiatives/blog/<slug>`, `/student-wiki/<slug>`, `/contact` (opens the Contact window) and `/initiatives` (opens the Initiatives folder).
