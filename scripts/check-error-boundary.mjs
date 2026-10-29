// 某一页渲染抛异常时，错误边界显示可读提示，导航仍可用，切换页面后恢复；不白屏。
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('site/www.yanghat.cn');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (path.relative(root, file).startsWith('..')) throw new Error('path');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // 只在练习应用里让课堂页用到的 matchMedia 抛错，模拟某一页的渲染故障。
  await context.addInitScript(() => {
    if (location.pathname.startsWith('/app/')) window.matchMedia = () => { throw new Error('模拟渲染故障'); };
  });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(base) && new URL(url).pathname !== '/e' && !new URL(url).pathname.startsWith('/api/')) return route.continue();
    return route.fulfill({ status: 204, body: '' });
  });
  const page = await context.newPage();
  const app = page.frameLocator('#practice-frame');
  const nav = app.getByRole('navigation', { name: '主导航' });
  await page.goto(`${base}/?practice=1&lesson=fraction-mul`);
  const alert = app.getByRole('alert').filter({ hasText: '这一页出了点问题' });
  await alert.waitFor({ timeout: 10000 });
  assert.ok(await nav.isVisible(), '出错后导航仍在');
  assert.equal(await alert.getByRole('button', { name: '重新加载' }).count(), 1);
  await nav.getByRole('button', { name: '首页' }).click();
  await alert.waitFor({ state: 'detached', timeout: 5000 });
  assert.ok((await app.locator('main').innerText()).trim().length > 20, '切换页面后恢复');
  console.log('PASS 错误边界：课堂渲染出错显示提示与重新加载，导航可用，切回首页后恢复');
} finally {
  await browser?.close();
  server.close();
}
