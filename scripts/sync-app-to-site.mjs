import { cp, rm, readFile, writeFile, access } from 'node:fs/promises';
const target = 'site/www.yanghat.cn/app';
const html = await readFile('dist/index.html', 'utf8');
if (!html.includes('assets/')) throw new Error('缺少应用入口资源');
await access('dist/assets');
await rm(target, { recursive: true, force: true });
await cp('dist', target, { recursive: true });
// 主页练习入口预下载应用的入口脚本和样式（见 index.html 的 APP_ENTRY），文件名随构建变化，这里同步写入。
const home = 'site/www.yanghat.cn/index.html';
const entry = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => `/app/${m[1]}`);
if (!entry.some((f) => f.endsWith('.js')) || !entry.some((f) => f.endsWith('.css'))) throw new Error('找不到应用入口脚本或样式');
const page = await readFile(home, 'utf8');
if (!/var APP_ENTRY = \[[^\]]*\];/.test(page)) throw new Error(`${home} 缺少 APP_ENTRY`);
await writeFile(home, page.replace(/var APP_ENTRY = \[[^\]]*\];/, `var APP_ENTRY = ${JSON.stringify(entry)};`));
console.log(`App synced: ${target}/ (internal; public entry is https://www.yanghat.cn/?practice=1)`);
