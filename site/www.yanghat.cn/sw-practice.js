// 只接管 /?practice=1 的文档导航。不缓存、不改写门面首页，也不碰 /app/。
const SHELL = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#285847">
<title>开窍 · 养习</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23285847'/%3E%3C/svg%3E">
<style>html,body{margin:0;height:100%;background:#f7f6ef}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#f7f6ef}</style>
</head>
<body>
<iframe id="practice-frame" title="开窍练习"></iframe>
<script>
var params=new URLSearchParams(location.search);
var inner=new URLSearchParams();
["lesson","grade"].forEach(function(key){var value=params.get(key);if(value)inner.set(key,value);});
document.getElementById("practice-frame").src="/app/"+(inner.toString()?"?"+inner.toString():"")+location.hash;
if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw-practice.js").catch(function(){});
</script>
</body>
</html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname !== "/" || url.searchParams.get("practice") !== "1") return;
  event.respondWith(new Response(SHELL, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
});
