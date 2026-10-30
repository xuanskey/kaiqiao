const CACHE = 'kaiqiao-2c13c904e95e';
const ASSETS = ["./","./index.html","./manifest.webmanifest","./assets/index-BnwA7WO4.css","./assets/index-CAb0Ylrz.js","./assets/classroom-BDbHcLkL.js"];
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
  // 应用页和本版本缓存的脚本同属一个版本：直接用缓存，打开时不必先等一趟网络（国内访问海外节点很慢）；
  // 缓存缺失才走网络。新版本仍按上面的流程切换：装好后提示「有新版本」，点更新或关掉全部标签后生效。
  // 缓存里的页面可能是跟随重定向取回的，导航不能直接用带 redirected 标记的响应，所以重新包一层。
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE)
      .then((cache) => cache.match('./').then((hit) => hit || cache.match('./index.html')))
      .then((hit) => hit ? new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers: hit.headers }) : fetch(request)));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
