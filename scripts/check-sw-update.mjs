// S6：新版本不自动接管。两标签页开着时发布新版本：两边都提示、都不刷新；一个标签点「更新」后
// 只有它刷新，另一个不被强制刷新；上一版缓存保留；全部标签关闭后再打开即为新版本；断网仍可用。
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'kq-sw-'));
await cp('site/www.yanghat.cn', root, { recursive: true });
const swFile = path.join(root, 'app/sw.js');
const v1 = (await readFile(swFile, 'utf8')).match(/const CACHE = '(kaiqiao-[\w]+)'/)[1];
assert.doesNotMatch(await readFile(swFile, 'utf8'), /\.then\(\(\) => self\.skipWaiting\(\)\)/, '安装后不自动 skipWaiting');
const publish = async (tag) => { const s = await readFile(swFile, 'utf8'); await writeFile(swFile, s.replace(/const CACHE = '[^']+'/, `const CACHE = '${v1}-${tag}'`)); };

const server = await homePreview(root);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const app = (page) => page.frames().find((f) => new URL(f.url()).pathname.startsWith('/app/'));
  const open = async () => {
    const page = await context.newPage();
    await page.goto(server.base + '/?practice=1');
    await page.frameLocator('#practice-frame').getByText('练习年级', { exact: true }).waitFor();
    await app(page).waitForFunction(() => !!navigator.serviceWorker.controller);
    await app(page).evaluate(() => { window.__marker = 'still-here'; });
    return page;
  };
  const marker = (page) => app(page).evaluate(() => window.__marker ?? null);
  const keys = (page) => app(page).evaluate(() => caches.keys());
  const prompt = (page) => page.frameLocator('#practice-frame').getByRole('status').filter({ hasText: '有新版本' });

  const a = await open(), b = await open();
  assert.equal(await prompt(a).count(), 0, '没有新版本时不提示');
  await publish('v2');
  await app(a).evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await prompt(a).waitFor();
  await prompt(b).waitFor();
  assert.equal(await marker(a), 'still-here'); assert.equal(await marker(b), 'still-here');
  assert.ok(await app(a).evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting), '新版本在等待');
  console.log('PASS 发布新版本：两标签页都提示「有新版本」，都没有被刷新，旧版本仍在控制');

  await prompt(a).getByRole('button', { name: '更新' }).click();
  await a.waitForFunction(() => { const f = document.querySelector('#practice-frame'); return f && f.contentWindow && f.contentWindow.__marker === undefined && f.contentWindow.document.readyState === 'complete'; });
  await a.frameLocator('#practice-frame').getByText('练习年级', { exact: true }).waitFor();
  assert.equal(await marker(a), null, '点更新的标签刷新了');
  assert.equal(await marker(b), 'still-here', '另一个标签没有被强制刷新');
  await prompt(b).waitFor({ state: 'detached' });
  const after = await keys(a);
  assert.ok(after.includes(`${v1}-v2`) && after.includes(v1), `新旧缓存都在：${after}`);
  console.log('PASS 点更新：只有本标签刷新，另一标签继续练习；上一版缓存保留');

  await publish('v3');
  await app(b).evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await prompt(b).waitFor();
  await a.close(); await b.close();
  const c = await open();
  const reg = await app(c).evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { waiting: !!r.waiting, active: r.active?.state }; });
  assert.deepEqual(reg, { waiting: false, active: 'activated' });
  const k = await keys(c);
  assert.ok(k.includes(`${v1}-v3`) && k.includes(`${v1}-v2`) && !k.includes(v1), `全部关闭后新版本生效，只留上一版：${k}`);
  assert.equal(await prompt(c).count(), 0);
  await context.setOffline(true);
  await c.reload();
  await c.frameLocator('#practice-frame').getByText('练习年级', { exact: true }).waitFor();
  await c.frameLocator('#practice-frame').getByRole('button', { name: '课堂' }).first().click();
  await c.frameLocator('#practice-frame').getByRole('heading', { name: '互动课堂' }).waitFor();
  console.log('PASS 全部标签关闭后再打开即为新版本，更早的缓存已清理；断网刷新、进课堂正常');
  await context.close();
} finally { await browser.close(); await server.close(); await rm(root, { recursive: true, force: true }); }
