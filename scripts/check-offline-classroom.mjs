// S7：课堂改为按需加载后，离线仍能上课——在线首访后断网刷新进课堂；离线单文件版 offline.html 直接打开也能进课堂。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';

const sw = await readFile('site/www.yanghat.cn/app/sw.js', 'utf8');
const chunk = sw.match(/"\.\/(assets\/classroom-[\w-]+\.js)"/)?.[1];
assert.ok(chunk, 'SW 预缓存清单里有课堂块');
const offlineHtml = await readFile('site/www.yanghat.cn/app/offline.html', 'utf8');
assert.doesNotMatch(offlineHtml, /classroom-[\w-]+\.js/, 'offline.html 不依赖外部课堂块');
assert.doesNotMatch(offlineHtml, /<script\b[^>]*src="\.?\/?assets\//, 'offline.html 入口脚本已内嵌');

const server = await homePreview();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(server.base + '/?practice=1');
  const frame = page.frameLocator('#practice-frame');
  await frame.getByText('练习年级', { exact: true }).waitFor();
  const app = () => page.frames().find((f) => new URL(f.url()).pathname.startsWith('/app/'));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await app().waitForFunction(() => !!navigator.serviceWorker.controller);
  assert.ok(await app().evaluate(async (c) => !!(await caches.match('./' + c)), chunk), '课堂块已在 SW 缓存');
  await context.setOffline(true);
  await page.reload();
  await frame.getByText('练习年级', { exact: true }).waitFor();
  await frame.getByRole('button', { name: '课堂' }).first().click();
  await frame.getByRole('heading', { name: '互动课堂' }).waitFor();
  await context.close();
  assert.deepEqual(errors, []);
  console.log('PASS 在线首访后断网：刷新、进课堂正常（课堂块来自 SW 预缓存）');

  const local = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const requests = [];
  const p2 = await local.newPage();
  p2.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) requests.push(r.url()); });
  await local.route(/^https?:/, (route) => route.abort());
  await p2.goto(pathToFileURL(path.resolve('site/www.yanghat.cn/app/offline.html')).href);
  await p2.getByText('练习年级', { exact: true }).waitFor();
  await p2.getByRole('button', { name: '课堂' }).first().click();
  await p2.getByRole('heading', { name: '互动课堂' }).waitFor();
  assert.deepEqual(requests, []);
  await local.close();
  console.log('PASS 离线单文件版 offline.html（file://）进课堂正常，无网络请求');
} finally { await browser.close(); await server.close(); }
