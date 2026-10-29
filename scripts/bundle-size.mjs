// 统计练习应用首屏必须下载的 JS/CSS（入口 + modulepreload），原始字节与 gzip 字节。只读 docs/ 构建产物。
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
export function initialAssets(root = 'docs') {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const js = [...html.matchAll(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"/g), ...html.matchAll(/<link rel="modulepreload"[^>]*href="\.\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"/g)].map((m) => m[1]);
  if (!js.length || !css.length) throw Error('docs/index.html 中找不到入口 JS/CSS');
  const measure = (files) => files.reduce((sum, file) => { const data = readFileSync(path.join(root, file)); return { raw: sum.raw + data.length, gzip: sum.gzip + gzipSync(data, { level: 9 }).length }; }, { raw: 0, gzip: 0 });
  return { files: { js, css }, js: measure(js), css: measure(css) };
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(initialAssets(process.argv[2] || 'docs'), null, 2));
