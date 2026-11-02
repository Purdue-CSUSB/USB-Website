/* Local preview of usb26/dist. /api/* is not available here (it needs MongoDB), so the pages use their built-in fallbacks;
   set USB_API_STUB=1 to answer /api/instagram/posts from the checked-in posts file instead. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const PORT = Number(process.env.PORT) || 4026;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  if (p === '/api/instagram/posts' && process.env.USB_API_STUB) {
    const posts = JSON.parse(fs.readFileSync(path.join(DIST, 'Instagram Posts/insta_posts.json'), 'utf8'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ syncedAt: new Date().toISOString(), source: 'stub', posts }));
  }
  if (p.startsWith('/api/')) { res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end('{"error":"api_unavailable_locally"}'); }
  // the same two rewrites as vercel.json: old per-article paths open the article page
  const rewritten = p.replace(/^\/initiatives\/blog\/[^/]+\/?$/, '/initiatives/blog').replace(/^\/student-wiki\/[^/]+\/?$/, '/student-wiki');
  // cleanUrls, like Vercel: /initiatives/blog -> initiatives/blog.html
  const candidates = [rewritten, rewritten + '.html', path.join(rewritten, 'index.html')].map((c) => path.join(DIST, c));
  const file = candidates.find((c) => c.startsWith(DIST) && fs.existsSync(c) && fs.statSync(c).isFile());
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(fs.readFileSync(path.join(DIST, '404.html'))); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`usb26 preview on http://localhost:${PORT}`));
