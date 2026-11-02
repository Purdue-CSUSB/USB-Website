/* Regenerates the pages whose content lives in the repo's frontend/public folder, so a new blog post or wiki article
   shows up on the next deploy: initiatives/blog.html, student-wiki.html (+ wiki-data.js), 404.html.
   Run with `npm run content` (also part of `npm run build`). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import sharp from 'sharp';
import { esc, shell } from './shell.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const PUB = path.resolve(SITE, '../frontend/public');
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(SITE, rel)), { recursive: true }); fs.writeFileSync(path.join(SITE, rel), text); };

const slugify = (t) => String(t || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const categoryLabel = (raw) => {
  if (!raw) return '';
  const s = String(raw).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  return s.split(' ').map((w) => (/^[A-Z0-9]{2,}$/.test(w) ? w : cap(w.toLowerCase()))).join(' ');
};

/* ---- Author photos come from the same board data the live site uses ---- */
const board = JSON.parse(read(path.join(PUB, 'Board Member Photos/board-members.json')));
const photoBase = new Map();
for (const m of [...(board.members || []), ...(board.alumni || [])]) {
  const file = String(m.photo || '').match(/([^/]+)\.webp$/i);
  if (file && m.srcBase) photoBase.set(file[1].toLowerCase(), m.srcBase);
}
function avatar(authorImage, name) {
  const m = String(authorImage || '').match(/([^/]+?)\.(?:webp|png)$/i);
  const base = m && photoBase.get(m[1].toLowerCase());
  return base
    ? `<img class="by-img" src="${base}-256.webp" alt="" width="36" height="36">`
    : `<span class="by-img by-ph" aria-hidden="true">${esc(String(name || '?').trim()[0])}</span>`;
}

const mdToHtml = (md) => marked.parse(md.replace(/^---[\s\S]*?---\s*/m, ''), { gfm: true })
  .replace(/<a href="(https?:[^"]*)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');

/* ---- Blog ---- */
async function buildBlog() {
  const json = JSON.parse(read(path.join(PUB, 'Blog/blog-posts.json')));
  const list = Array.isArray(json) ? json : (json.blogPosts || json.posts || []);
  const slugOf = (p) => slugify(p.slug || p.title);
  const cards = list.map((p) => `<li><a class="postcard" href="#/${slugOf(p)}"><h2>${esc(p.title)}</h2>${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}<span class="byline">${avatar(p.authorImage, p.author)}<span>${esc(p.author)}</span><span class="date">${esc(p.date || '')}</span>${p.category ? `<span class="cat">${esc(categoryLabel(p.category))}</span>` : ''}</span></a></li>`).join('\n');
  const posts = list.map((p) => {
    const file = path.join(PUB, 'Blog', p.markdownFile || `blog posts/${p.slug || slugify(p.title)}.md`);
    if (!fs.existsSync(file)) { console.warn('blog: missing markdown for', p.title); return ''; }
    const me = slugOf(p);
    const more = list.filter((q) => slugOf(q) !== me).slice(0, 4).map((q) => `<li><a href="#/${slugOf(q)}">${esc(q.title)}</a></li>`).join('');
    const meta = `<div class="postmeta"><h2>About this post</h2><dl><dt>Author</dt><dd>${esc(p.author)}</dd>${p.date ? `<dt>Posted</dt><dd>${esc(p.date)}</dd>` : ''}${p.category ? `<dt>Filed under</dt><dd><span class="cat">${esc(categoryLabel(p.category))}</span></dd>` : ''}</dl></div>`;
    return `<article class="post" id="post-${me}" data-slug="${me}" data-title="${esc(p.title)}" hidden><p class="backrow"><a class="btn" href="#/">&larr; Back to Blog Posts</a></p><header class="rr-head"><h1>${esc(p.title)}</h1>${p.subtitle ? `<p class="lead">${esc(p.subtitle)}</p>` : ''}</header><div class="posttop">${meta}<aside class="morebox" aria-label="More posts"><h2>More posts</h2><ul>${more}</ul></aside></div><div class="md">${mdToHtml(fs.readFileSync(file, 'utf8'))}</div></article>`;
  }).join('\n');
  const body = `<section id="bloglist"><header class="rr-head"><h1>Blog Posts</h1></header><ul class="postlist">\n${cards}\n</ul></section>\n${posts}`;
  write('initiatives/blog.html', shell({ title: 'Blog', slugKey: 'blog', body, scripts: ['/initiatives/blog.js'] }));
  console.log(`blog: ${list.length} posts`);
}

/* ---- Student Wiki ---- */
async function buildWiki() {
  const WIKI = path.join(PUB, 'Student Wiki');
  const list = JSON.parse(read(path.join(WIKI, 'student-wiki-posts.json'))).studentWikiPosts || [];
  const cats = (p) => String(p.category || '').split(',').map((x) => x.trim()).filter(Boolean);
  const when = (p) => { const t = Date.parse(p.date); return Number.isNaN(t) ? 0 : t; };
  const sorted = [...list].sort((a, b) => when(b) - when(a));
  const allCats = [...new Set(list.flatMap(cats))].sort();

  // Article screenshots: converted to WebP under assets/wiki/ (skipped when already up to date).
  const jobs = new Map();
  const wikiImage = (src) => {
    const rel = src.replace(/^\/assets\/images\/wiki\//, 'images/').replace(/^\.\//, '');
    if (!/^images\//.test(rel)) return src;
    const from = path.join(WIKI, rel);
    if (!fs.existsSync(from)) { console.warn('wiki: image missing in source, left out:', rel); return null; }
    const m = rel.match(/^images\/(.*?)([^/]+)\.(png|jpe?g|webp|gif|svg)$/i);
    const dir = m[1].split('/').map((s) => slugify(s)).filter(Boolean).join('/');
    const svg = /svg$/i.test(m[3]);
    const dest = `assets/wiki/${dir ? dir + '/' : ''}${slugify(m[2])}.${svg ? 'svg' : 'webp'}`;
    jobs.set(dest, { from, svg });
    return '/' + dest;
  };

  const texts = {};
  const cards = sorted.map((p) => `<li data-slug="${slugify(p.title)}" data-cats="${esc(cats(p).join('|'))}"><a class="postcard" href="#/${slugify(p.title)}">${p.date ? `<span class="date">${esc(p.date)}</span>` : ''}<h2>${esc(p.title)}</h2>${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}<span class="byline">${avatar(p.authorImage, p.author)}<span>${esc(p.author)}</span>${cats(p).map((c) => `<span class="cat">${esc(cap(c))}</span>`).join('')}</span></a></li>`).join('\n');
  const posts = sorted.map((p) => {
    const file = path.join(WIKI, p.markdownFile);
    if (!fs.existsSync(file)) { console.warn('wiki: missing markdown for', p.title); return ''; }
    let html = mdToHtml(fs.readFileSync(file, 'utf8'));
    html = html.replace(/<img src="([^"]*)"([^>]*)>/g, (_, u, rest) => { const d = wikiImage(u); return d ? `<img loading="lazy" src="${esc(d)}"${rest}>` : ''; });
    const me = slugify(p.title);
    texts[me] = `${p.title} ${p.subtitle || ''} ${p.author} ${p.category || ''} ${p.date || ''} ${html.replace(/<[^>]+>/g, ' ')}`.toLowerCase().replace(/\s+/g, ' ');
    const more = sorted.filter((q) => slugify(q.title) !== me).slice(0, 4).map((q) => `<li><a href="#/${slugify(q.title)}">${esc(q.title)}</a></li>`).join('');
    const meta = `<div class="postmeta"><h2>About this article</h2><dl><dt>Author</dt><dd>${esc(p.author)}</dd>${p.date ? `<dt>Posted</dt><dd>${esc(p.date)}</dd>` : ''}${cats(p).length ? `<dt>Filed under</dt><dd>${cats(p).map((c) => `<span class="cat">${esc(cap(c))}</span>`).join(' ')}</dd>` : ''}</dl></div>`;
    return `<article class="post" id="post-${me}" data-slug="${me}" data-title="${esc(p.title)}" hidden><p class="backrow"><a class="btn" href="#/">&larr; Back to the Wiki</a></p><header class="rr-head"><h1>${esc(p.title)}</h1>${p.subtitle ? `<p class="lead">${esc(p.subtitle)}</p>` : ''}</header><div class="posttop">${meta}<aside class="morebox" aria-label="More articles"><h2>More articles</h2><ul>${more}</ul></aside></div><div class="md">${html}</div></article>`;
  }).join('\n');

  for (const [dest, { from, svg }] of jobs) {
    const out = path.join(SITE, dest);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(from).mtimeMs) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (svg) fs.copyFileSync(from, out);
    else await sharp(from).resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
  }

  write('wiki-data.js', 'window.WIKI_TEXT = ' + JSON.stringify(texts) + ';\n');
  const chips = ['<button type="button" class="chip" data-cat="" aria-pressed="true">All</button>']
    .concat(allCats.map((c) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="false">${esc(cap(c))}</button>`)).join('');
  const body = `<section id="bloglist"><header class="rr-head"><h1>Student Wiki</h1></header><p class="lead">Contains locally sourced, organic wisdom. Shared by the student body, curated by USB.</p>
<div class="wikibar"><label for="wiki-q">Search the wiki</label><input id="wiki-q" type="search" placeholder="Search wiki..." autocomplete="off"><div class="chips" role="group" aria-label="Filter by category">${chips}</div><p id="wiki-count" class="wiki-count" aria-live="polite">${sorted.length} articles</p></div>
<ul class="postlist">
${cards}
</ul><p id="wiki-none" class="empty-note" hidden>No results found. Try fewer or different words.</p></section>
${posts}`;
  const navHtml = '<li><a href="/student-wiki" aria-current="page">Student Wiki</a></li>';
  const sideHtml = `<section class="sbox"><h2>Explore</h2><ul><li><a href="/student-wiki" aria-current="page">Student Wiki</a></li><li><a href="/initiatives/blog">Blog</a></li><li><a href="/initiatives/mentorship">Mentorship</a></li><li><a href="/initiatives/cs193">CS193</a></li><li><a href="/">Purdue USB desktop</a></li></ul></section>`;
  write('student-wiki.html', shell({
    title: 'Student Wiki', body, root: true, navHtml, sideHtml, sitename: 'Student Wiki', sitelink: '/student-wiki',
    desc: 'Locally sourced, organic wisdom. Shared by the student body, curated by USB.', scripts: ['/wiki-data.js', '/wiki.js'],
    crumbsHtml: '<a href="/">Purdue USB</a> &raquo; Student Wiki &raquo; <span id="crumb-page">All articles</span>',
  }));
  console.log(`wiki: ${sorted.length} articles, ${jobs.size} images`);
}

/* ---- 404 ---- */
function build404() {
  const body = `<header class="rr-head"><h1>Page not found</h1></header>
<p class="lead">That page doesn&rsquo;t exist, or it has moved. Try one of these instead.</p>
<p class="btnrow"><a class="btn default" href="/">Purdue USB desktop</a> <a class="btn" href="/initiatives/blog">Blog</a> <a class="btn" href="/student-wiki">Student Wiki</a></p>`;
  write('404.html', shell({ title: 'Page not found', body, root: true, navHtml: '<li><a href="/">Purdue USB desktop</a></li>', sideHtml: '', sitename: 'Purdue USB', sitelink: '/', crumbsHtml: '<a href="/">Purdue USB</a> &raquo; Page not found' }));
}

await buildBlog();
await buildWiki();
build404();
