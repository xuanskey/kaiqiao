import { cp, rm, readFile, access } from 'node:fs/promises';
const target = 'site/www.yanghat.cn/app';
const html = await readFile('dist/index.html', 'utf8');
if (!html.includes('assets/')) throw new Error('缺少应用入口资源');
await access('dist/assets');
await rm(target, { recursive: true, force: true });
await cp('dist', target, { recursive: true });
console.log(`App synced: ${target}/ (internal; public entry is https://www.yanghat.cn/?practice=1)`);
