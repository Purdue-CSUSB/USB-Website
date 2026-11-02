/* Page frame shared by the generated pages (blog, student wiki, 404). The static initiative pages use the same markup. */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const PAGES = {
  blog: 'blog.html', 'career-resources': 'career-resources.html', 'club-hub': 'club-hub.html', cs193: 'cs193.html',
  'help-room': 'help-room.html', mentorship: 'mentorship.html', panels: 'panels.html', 'social-wellness': 'social-wellness.html',
  'town-hall': 'town-hall.html', 'you-dont-need-a-new-laptop': 'you-dont-need-a-new-laptop.html',
};
export const NAV = [
  ['Blog', 'blog'], ['Career Resources', 'career-resources'], ['Club Hub', 'club-hub'], ['CS193', 'cs193'], ['Help Room', 'help-room'],
  ['Mentorship', 'mentorship'], ['Panels', 'panels'], ['Social Wellness', 'social-wellness'], ['Student Forum / Town Hall', 'town-hall'],
  ['You Don’t Need a New Laptop', 'you-dont-need-a-new-laptop'],
];
const OTHER = [['Purdue Technical Projects', 'https://www.usb-purdue-technical-projects.com/'], ['Research Resources', 'https://www.usb-research-resources.com/']];
const ext = (n, u) => `<li><a class="ext" href="${u}" target="_blank" rel="noopener">${n}<span class="sr-only"> (opens in a new tab)</span></a></li>`;

/** root: true for pages that sit at the site root (student-wiki.html, 404.html); false for pages in initiatives/. */
export function shell({ title, slugKey, body, desc, scripts = [], root = false, navHtml, sideHtml, crumbsHtml, sitename = 'Our Initiatives', sitelink = 'blog.html' }) {
  const link = (k) => `<li><a href="${root ? 'initiatives/' : ''}${PAGES[k]}"${k === slugKey ? ' aria-current="page"' : ''}>`;
  const nav = NAV.map(([n, k]) => `${link(k)}${n}</a></li>`).join('');
  const other = OTHER.map(([n, u]) => ext(n, u)).join('');
  const up = root ? '' : '../';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Purdue USB</title>
<meta name="description" content="${esc(desc || title + ' - a Purdue Undergraduate Student Board initiative.')}">
<link rel="icon" href="/assets/brand/usb-icon.webp">
<link rel="stylesheet" href="/sub.css">
<link rel="stylesheet" href="/cursors.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div id="site">
  <header id="masthead">
    <a class="logo" href="/"><img src="/assets/brand/usb-icon.webp" alt="" width="64" height="64"></a>
    <div class="mast-text"><p class="kicker">Purdue Undergraduate Student Board presents</p><p class="sitename"><a href="${sitelink}" id="sitename-link">${sitename}</a></p></div>
    <p class="mast-links"><a href="/">&laquo; Purdue USB desktop</a></p>
  </header>
  <nav id="topnav" aria-label="Sections"><ul>${navHtml || nav}</ul></nav>
  <p id="crumbs" aria-label="You are here">${crumbsHtml || `<a href="/">Purdue USB</a> &raquo; Initiatives &raquo; <span id="crumb-page">${esc(title)}</span>`}</p>
  <div id="cols">
    <aside id="side" aria-label="More">
      ${sideHtml || `<section class="sbox"><h2>Initiatives</h2><ul>${nav}</ul></section>
      <section class="sbox"><h2>Elsewhere</h2><ul>${other}</ul></section>`}
      <section class="sbox"><h2>Connect with USB</h2><ul>
        ${ext('Instagram', 'https://www.instagram.com/purdueusb/')}
        ${ext('LinkedIn', 'https://www.linkedin.com/company/purdueusb/posts/?feedView=all')}
        <li><a href="mailto:usb@cs.purdue.edu">Email</a></li>
        ${ext('Tutor List', 'https://usb.notion.site/fc8013a0d21a4483982d126cad0c372f?v=c2423acbb3f54dca8e902e84c013aa05')}</ul></section>
    </aside>
    <main id="main" class="page">
${body}
    </main>
  </div>
  <footer class="rr-foot"><a href="/"><img src="/assets/brand/usb-icon.webp" alt="Purdue USB" height="36" width="36"></a>
<ul>${ext('Instagram', 'https://www.instagram.com/purdueusb/')}${ext('LinkedIn', 'https://www.linkedin.com/company/purdueusb/posts/?feedView=all')}<li><a href="mailto:usb@cs.purdue.edu">Email</a></li>${ext('Newsletter', 'https://docs.google.com/forms/d/e/1FAIpQLScv6lNPqYwarlTKhdp5O8htD0DzRKmNRZNln0LPwj8EslcjYA/viewform')}<li><button type="button" id="effect" aria-pressed="false">Old-screen effect: on</button></li></ul>
<p>&copy; ${new Date().getFullYear()} Undergraduate Student Board. All rights reserved.</p></footer>
</div>
<div class="crt" aria-hidden="true"><div class="crt-lines"></div><div class="crt-noise"></div><div class="crt-vignette"></div><div class="crt-flicker"></div></div>
<script src="/sub.js"></script>
${scripts.map((s) => `<script src="${s}"></script>`).join('\n')}
</body>
</html>
`;
}
