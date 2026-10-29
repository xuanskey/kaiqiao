import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  // 相对资源路径同时支持主站内嵌的 /app/、docs 与离线包。对外地址是 /?practice=1。
  base: "./",
  plugins: [tailwindcss(), react(), {
    // vite preview has no Pages Function. Answer the anonymous beacon so a production build does not log a 404.
    name: "same-origin-metrics-sink",
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/e") return next();
        if (req.method !== "POST") { res.statusCode = 405; res.setHeader("Allow", "POST"); res.end(); return; }
        res.statusCode = 204;
        res.end();
      });
    },
  }],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: { host: true, port: 5173, proxy: { "/api/ai": "http://127.0.0.1:8787" } },
});
