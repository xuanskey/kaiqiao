import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, rm, cp } from 'node:fs/promises';
import path from 'node:path';

const html = await readFile('dist/index.html', 'utf8');
const allFiles = (await readdir('dist/assets')).map((name) => `assets/${name}`);
// 只预缓存首页直接引用的资源；PDF、Word、PPT、拍照识别等按需加载的大组件不进预缓存，用到时再联网下载。
const referenced = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => m[1]);
const files = allFiles.filter((f) => referenced.includes(f));
if (!files.some((f) => f.endsWith('.js'))) throw new Error('index.html 中没有找到入口脚本');
const version = createHash('sha256').update(html).digest('hex').slice(0, 12);
const precache = ['./', './index.html', './manifest.webmanifest', ...files.map((file) => `./${file}`)];
const worker = `const CACHE = 'kaiqiao-${version}';
const ASSETS = ${JSON.stringify(precache)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('kaiqiao-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then((cache) => cache.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
`;
await writeFile('dist/sw.js', worker);
let offline = html.replace(/<link[^>]+rel="manifest"[^>]*>/g, '');
for (const file of files) {
  if (file.endsWith('.js')) {
    const code = (await readFile(path.join('dist', file), 'utf8')).replace(/<\/script/gi, '<\\/script');
    const tag = new RegExp(`<script\\b[^>]*src="\\.?/?${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*><\\/script>`);
    offline = offline.replace(tag, () => `<script type="module">${code}</script>`);
  } else if (file.endsWith('.css')) {
    const css = await readFile(path.join('dist', file), 'utf8');
    offline = offline.replace(/<link[^>]+rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`);
  }
}
await writeFile('dist/offline.html', offline);
await rm('docs', { recursive: true, force: true });
await cp('dist', 'docs', { recursive: true });
console.log(`Release ready: docs/ and docs/offline.html (${version})`);
await import('./sync-app-to-site.mjs');
