import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const helpEndpoint = loadEnv('production', process.cwd(), 'VITE_').VITE_HELP_ENDPOINT ?? '';
if (helpEndpoint !== '' && helpEndpoint !== '/api/help') throw new Error('Only the same-origin /api/help endpoint can be enabled');

export default defineConfig({
  // 相对资源路径同时支持主站内嵌的 /app/、docs 与离线包。对外地址是 /?practice=1。
  base: "./",
  plugins: [tailwindcss(), react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: { host: true, port: 5173, proxy: { "/api/ai": "http://127.0.0.1:8787" } },
});
