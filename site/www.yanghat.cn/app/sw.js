const CACHE = 'kaiqiao-edc0d42290b4';
const ASSETS = ["./","./index.html","./manifest.webmanifest","./assets/index-Icz4xrcF.js","./assets/index-NtHXhrNh.css","./assets/classroom-Bmdl2TOY.js"];
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
