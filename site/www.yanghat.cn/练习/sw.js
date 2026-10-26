// 修改 index.html 时同时改 CACHE，否则已安装的练习壳会继续用旧页面。
const CACHE = "yanghat-practice-shell-v1";
const SHELL = "./index.html";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("yanghat-practice-shell-") && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { return; }
  if (url.origin !== self.location.origin || !path.startsWith("/练习/")) return;
  event.respondWith((async () => {
    const cached = await caches.match(SHELL);
    if (cached) return cached;
    return fetch(request);
  })());
});
