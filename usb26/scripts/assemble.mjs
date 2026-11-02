/* Builds usb26/dist: the site files plus the live data the pages read at run time
   (board roster + photos, Instagram fallback posts). The Instagram API itself is the existing /api function. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.resolve(SITE, '../frontend/public');
const DIST = path.join(SITE, 'dist');

const SKIP = new Set(['scripts', 'node_modules', 'dist', '_archive', 'package.json', 'package-lock.json']);
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const name of fs.readdirSync(SITE)) {
  if (SKIP.has(name) || name.startsWith('.')) continue;
  fs.cpSync(path.join(SITE, name), path.join(DIST, name), { recursive: true });
}

// Read at run time by desktop.js; the same files the React site reads.
for (const dir of ['Board Member Photos', 'board-photos', 'Instagram Posts']) {
  const from = path.join(PUB, dir);
  if (!fs.existsSync(from)) { console.warn('assemble: missing', from); continue; }
  fs.cpSync(from, path.join(DIST, dir), { recursive: true, filter: (p) => !/\.(bak|json\.bak)$|build-cache/.test(p) });
}
const count = (d) => fs.readdirSync(d, { recursive: true }).length;
console.log(`dist ready: ${count(DIST)} entries`);
