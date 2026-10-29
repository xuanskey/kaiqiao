import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./entry";
import { ErrorBoundary } from "./components/error-boundary";
import { UpdatePrompt } from "./components/update-prompt";
import { watchServiceWorker } from "./lib/sw-update";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary scope="app">
      <App />
      <UpdatePrompt />
    </ErrorBoundary>
  </StrictMode>,
);

if (import.meta.env.PROD && location.protocol !== "file:" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((reg) => watchServiceWorker(reg)).catch(() => {
      // The page and explicit offline file remain usable without a worker.
    });
  });
}
