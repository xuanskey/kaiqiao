import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./entry";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/** 网站上的 /app/ 才注册 Service Worker。iOS 壳走 file: 或 capacitor:，资源已在安装包里。 */
function nativeShell(): boolean {
  if (location.protocol === "file:" || location.protocol === "capacitor:") return true;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

if (import.meta.env.PROD && !nativeShell() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // The page and explicit offline file remain usable without a worker.
    });
  });
}
