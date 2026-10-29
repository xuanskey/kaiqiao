import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, writeFile, rm, cp } from 'node:fs/promises';
import path from 'node:path';

const html = await readFile('dist/index.html', 'utf8');
const allFiles = (await readdir('dist/assets')).map((name) => `assets/${name}`);
// 只预缓存首页直接引用的资源和按需加载的课堂块（离线也要能上课）；PDF、Word、PPT、拍照识别等按需加载的大组件不进预缓存，用到时再联网下载。
const referenced = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => m[1]);
const entryFiles = allFiles.filter((f) => referenced.includes(f));
if (!entryFiles.some((f) => f.endsWith('.js'))) throw new Error('index.html 中没有找到入口脚本');
const screenSeeds = allFiles.filter((f) => /^assets\/classroom-[\w-]+\.(?:js|css)$/.test(f));
if (!screenSeeds.some((f) => f.endsWith('.js'))) throw new Error('没有找到按需加载的课堂块 classroom-*.js');
const screenFiles = new Set(screenSeeds);
for (const queue = [...screenSeeds]; queue.length;) {
  const file = queue.shift();
  if (!file.endsWith('.js')) continue;
  // 只跟静态依赖（from "./x" / import "./x"），不跟 import("./x") 动态依赖，避免把 PDF 等大块带进预缓存。
  for (const [, name] of (await readFile(path.join('dist', file), 'utf8')).matchAll(/(?:from|import)\s*"\.\/([^"]+)"/g)) {
    const dep = `assets/${name}`;
    if (allFiles.includes(dep) && !screenFiles.has(dep) && !entryFiles.includes(dep)) { screenFiles.add(dep); queue.push(dep); }
  }
}
const files = [...entryFiles, ...screenFiles];
const version = createHash('sha256').update(html).digest('hex').slice(0, 12);
const precache = ['./', './index.html', './manifest.webmanifest', ...files.map((file) => `./${file}`)];
const worker = `const CACHE = 'kaiqiao-${version}';
const ASSETS = ${JSON.stringify(precache)};
// 新版本装好后等待，不自动接管；页面提示后由用户点「更新」（SKIP_WAITING），或所有标签页关闭后自然生效。
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
// 激活后才清理：保留上一版缓存，仍开着的旧标签页按需加载旧版本文件时还能取到；更早的版本删除。
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => {
    const old = keys.filter((key) => key.startsWith('kaiqiao-') && key !== CACHE);
    return Promise.all(old.slice(0, -1).map((key) => caches.delete(key)));
  }).then(() => self.clients.claim()));
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
// 离线单文件版另行构建：课堂改为静态导入（KAIQIAO_SINGLE_FILE），入口脚本内嵌后一个文件即可上课。
const single = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--logLevel', 'warn'], { env: { ...process.env, KAIQIAO_SINGLE_FILE: '1' }, stdio: 'inherit' });
if (single.status !== 0) throw new Error('离线单文件版构建失败');
const singleHtml = await readFile('dist-single/index.html', 'utf8');
const singleFiles = (await readdir('dist-single/assets')).map((name) => `assets/${name}`);
if (singleFiles.some((f) => f.startsWith('assets/classroom-'))) throw new Error('离线单文件版不应拆出课堂块');
const singleEntry = singleFiles.filter((f) => [...singleHtml.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].some((m) => m[1] === f));
let offline = singleHtml.replace(/<link[^>]+rel="manifest"[^>]*>/g, '');
for (const file of singleEntry) {
  if (file.endsWith('.js')) {
    const code = (await readFile(path.join('dist-single', file), 'utf8')).replace(/<\/script/gi, '<\\/script');
    const tag = new RegExp(`<script\\b[^>]*src="\\.?/?${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*><\\/script>`);
    offline = offline.replace(tag, () => `<script type="module">${code}</script>`);
  } else if (file.endsWith('.css')) {
    const css = await readFile(path.join('dist-single', file), 'utf8');
    offline = offline.replace(/<link[^>]+rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`);
  }
}
if (/<script\b[^>]*src="\.?\/?assets\//.test(offline)) throw new Error('offline.html 仍引用外部入口脚本');
await rm('dist-single', { recursive: true, force: true });
await writeFile('dist/offline.html', offline);
await rm('docs', { recursive: true, force: true });
await cp('dist', 'docs', { recursive: true });
console.log(`Release ready: docs/ and docs/offline.html (${version})`);
await import('./sync-app-to-site.mjs');
const { writeManifest } = await import('./build-manifest.mjs');
const manifest = writeManifest(process.cwd());
console.log(`Build manifest: site/build-manifest.json (source ${manifest.files.source} files, output ${manifest.files.output} files, switches ${JSON.stringify(manifest.switches)})`);
