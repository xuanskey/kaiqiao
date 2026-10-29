// 新版本 Service Worker 不再自动接管：安装好后进入等待，页面提示「有新版本」，由用户点更新，
// 或所有标签页关闭后浏览器自然切换。不在练习中途强制刷新。
type Listener = () => void;
const listeners = new Set<Listener>();
let waiting: ServiceWorker | null = null;
let requested = false;

function set(next: ServiceWorker | null) {
  if (waiting === next) return;
  waiting = next;
  for (const listener of listeners) listener();
}

export const updateStore = {
  subscribe(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  ready: () => waiting !== null,
};

/** 用户点「更新」：让等待中的新版本接管，接管后本页刷新一次。其他标签页不会被强制刷新。 */
export function applyUpdate() {
  if (!waiting) return;
  requested = true;
  waiting.postMessage("SKIP_WAITING");
}

export function watchServiceWorker(reg: ServiceWorkerRegistration, container: ServiceWorkerContainer = navigator.serviceWorker, reload = () => location.reload()) {
  const track = (worker: ServiceWorker | null) => {
    if (!worker) return;
    const check = () => { if (worker.state === "installed" && container.controller) set(worker); };
    check();
    worker.addEventListener("statechange", check);
  };
  if (reg.waiting && container.controller) set(reg.waiting);
  track(reg.installing);
  reg.addEventListener("updatefound", () => track(reg.installing));
  container.addEventListener("controllerchange", () => {
    set(null);
    if (requested) reload();
  });
  // 练习页常开不刷新：回到前台时顺便检查一次新版本（同源 sw.js，no-cache）。
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void reg.update().catch(() => {}); });
}
