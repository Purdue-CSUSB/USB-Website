/* Builds frontend/dist, the folder Vercel serves (same output directory as before).
   1. regenerate the blog / Student Wiki / 404 pages from public/ (build-content.mjs)
   2. copy public/ verbatim: board roster + photos, Instagram fallback posts, logos (what Vite did)
   3. copy the redesign in site/ on top
   The Instagram API is the existing /api function; nothing here talks to MongoDB. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const PUB = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

const content = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build-content.mjs')], { stdio: 'inherit' });
if (content.status !== 0) process.exit(content.status || 1);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// Source material the build already baked into site/ (blog + wiki markdown, full-size initiative photos).
const BAKED = new Set(['Blog', 'Student Wiki', 'initiatives']);
for (const name of fs.readdirSync(PUB)) {
  if (BAKED.has(name)) continue;
  fs.cpSync(path.join(PUB, name), path.join(DIST, name), { recursive: true, filter: (p) => !/\.bak$|\.build-cache\.json$/.test(p) });
}
const SKIP = new Set(['_archive', 'README.md']);
for (const name of fs.readdirSync(SITE)) {
  if (SKIP.has(name) || name.startsWith('.')) continue;
  fs.cpSync(path.join(SITE, name), path.join(DIST, name), { recursive: true });
}
console.log(`dist ready: ${fs.readdirSync(DIST, { recursive: true }).length} entries`);
