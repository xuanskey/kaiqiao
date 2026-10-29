import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const helpEndpoint = loadEnv('production', process.cwd(), 'VITE_').VITE_HELP_ENDPOINT ?? '';
if (helpEndpoint !== '' && helpEndpoint !== '/api/help') throw new Error('Only the same-origin /api/help endpoint can be enabled');

// 离线单文件版（offline.html）另行构建：按需加载的界面改为静态导入，产物只有一个入口脚本。
const singleFile = process.env.KAIQIAO_SINGLE_FILE === '1';
const screensStatic = path.resolve(__dirname, "src/components/math/screens.static.ts");

export default defineConfig({
  // 相对资源路径同时支持主站内嵌的 /app/、docs 与离线包。对外地址是 /?practice=1。
  base: "./",
  plugins: [tailwindcss(), react()],
  resolve: { alias: [
    ...(singleFile ? [{ find: /^\.\/screens$/, replacement: screensStatic }] : []),
    { find: "@", replacement: path.resolve(__dirname, "src") },
  ] },
  ...(singleFile ? { build: { outDir: "dist-single", emptyOutDir: true } } : {}),
  server: { host: true, port: 5173, proxy: { "/api/ai": "http://127.0.0.1:8787" } },
});
