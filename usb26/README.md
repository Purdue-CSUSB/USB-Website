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
