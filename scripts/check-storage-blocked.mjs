// 浏览器禁用网站数据（访问 localStorage 抛 SecurityError）时，应用各页仍能渲染，不白屏、不抛未捕获异常。
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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    const deny = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: deny });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get: deny });
  });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(base) && new URL(url).pathname !== '/e' && !new URL(url).pathname.startsWith('/api/')) return route.continue();
    return route.fulfill({ status: 204, body: '' });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const app = page.frameLocator('#practice-frame');
  const nav = app.getByRole('navigation', { name: '主导航' });
  const alive = async (label) => {
    await page.waitForTimeout(300);
    const text = (await app.locator('#root').innerText()).trim();
    assert.ok(text.length > 20, `${label}：页面白屏`);
    assert.deepEqual(errors, [], `${label}：未捕获异常`);
  };
  await page.goto(`${base}/?practice=1`);
  await nav.waitFor({ timeout: 10000 });
  await alive('首页');
  for (const name of ['课堂', '题库', '错题本', '学情', '首页']) {
    await nav.getByRole('button', { name }).first().click();
    await alive(name);
  }
  await page.goto(`${base}/?practice=1&lesson=fraction-mul`);
  await nav.waitFor({ timeout: 10000 });
  await alive('课堂直达');
  console.log('PASS 禁用本机存储：首页/课堂/题库/错题本/学情/课堂直达均正常渲染，无未捕获异常');
} finally {
  await browser?.close();
  server.close();
}
