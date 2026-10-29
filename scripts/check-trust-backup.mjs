// 验证主站对外入口是 /?practice=1：地址栏不出现 /app/，练习用同域 iframe 内嵌 /app/。
import { mkdir } from 'node:fs/promises';
import { readPracticeBackup } from '../src/lib/math/practice-backup.ts';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { assertSameOriginMetrics, recordMetrics } from './metrics-request-assert.mjs';

const root = path.resolve('site/www.yanghat.cn');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.jpg': 'image/jpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/练习' || pathname === '/练习/') {
      const extra = url.search.startsWith('?') ? '&' + url.search.slice(1) : '';
      res.writeHead(301, { Location: '/?practice=1' + extra }).end();
      return;
    }
    if (pathname === '/app') {
      res.writeHead(301, { Location: '/app/' + url.search }).end();
      return;
    }
    let file = path.resolve(root, '.' + pathname);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path');
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: encodeURI(pathname + '/') + url.search }).end();
        return;
      }
      file = path.join(file, 'index.html');
    }
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  await mkdir('reports/trust-shots', { recursive: true });
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, serviceWorkers: 'block', acceptDownloads: true });
    const external = [], dialogs = [], events = [];
    context.on('request', req => { if (!/^https?:/.test(req.url())) return; const url = new URL(req.url()); if (url.origin !== base) external.push(req.url()); });
    await context.route('**/*', async route => {
      const request = route.request();
      if (!request.url().startsWith(base)) return route.abort();
      if (new URL(request.url()).pathname === '/e') return recordMetrics(route, events);
      return route.continue();
    });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('dialog', async d => { dialogs.push(d.type()); await d.dismiss(); });
    await page.goto(base);
    const mail = page.locator('.trust-footer a');
    assert.equal(new URL(await mail.getAttribute('href')).searchParams.get('subject'), '开窍反馈');
    await page.locator('.trust-footer').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `reports/trust-shots/footer-${width}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.goto(base + '/?practice=1');
    const app = page.frameLocator('#practice-frame');
    await app.locator('#grade').selectOption('1');
    await app.getByRole('button', { name: '完成每日练习', exact: false }).click();
    let frame = page.frames().find(f => f.url().includes('/app/'));
    for (let i = 0; i < 3; i++) {
      await app.locator('.question-prompt').waitFor();
      await page.keyboard.type('0'); await page.keyboard.press('Enter');
      await app.getByRole('button', { name: /看懂了，继续|下一题/ }).click();
    }
    await app.getByRole('button', { name: '结束练习', exact: true }).click();
    await app.getByRole('dialog').getByRole('button', { name: '结束练习', exact: true }).click();
    await app.getByRole('button', { name: '学情', exact: true }).click();
    await app.getByRole('heading', { name: '学习小结' }).waitFor();
    const read = () => frame.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => /^(kaiqiao\.save\.v1$|kaiqiao\.review\.|kaiqiao-class-log$|kaiqiao-activity$)/.test(k)).map(k => [k, JSON.parse(localStorage.getItem(k))])));
    const before = await read();
    assert.equal(before['kaiqiao.save.v1'].stats.answered, 3);
    const downloading = page.waitForEvent('download'); await app.getByRole('button', { name: '导出备份', exact: true }).click();
    const download = await downloading; assert.match(download.suggestedFilename(), /^开窍练习备份-\d{8}-\d{4}\.json$/);
    const file = await download.path(), raw = await readFile(file, 'utf8');
    const parsed = readPracticeBackup(raw); assert.equal(parsed.data.stats.answered, 3);
    assert.equal(JSON.parse(raw).origin, base);
    await app.locator('#backup-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `reports/trust-shots/report-${width}.png` });
    await frame.evaluate(() => localStorage.clear());
    await page.reload();
    await app.locator('#grade').waitFor();
    frame = page.frames().find(f => f.url().includes('/app/'));
    await app.getByRole('button', { name: '学情', exact: true }).click();
    const input = app.getByLabel('选择备份文件');
    await input.setInputFiles(file);
    await app.getByRole('button', { name: '确认替换并恢复' }).click();
    const dialog = app.getByRole('dialog', { name: '导入备份？' }); await dialog.waitFor();
    await page.screenshot({ path: `reports/trust-shots/confirm-${width}.png` });
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth));
    const cleared = await read();
    await dialog.getByRole('button', { name: '取消', exact: true }).click();
    assert.deepEqual(await read(), cleared);
    await app.getByRole('button', { name: '确认替换并恢复' }).click();
    await app.getByRole('dialog').getByRole('button', { name: '确认导入', exact: true }).click();
    await app.getByText('已恢复备份。', { exact: true }).waitFor();
    const after = await read();
    for (const [key, value] of Object.entries(before)) assert.deepEqual(after[key], value, key);
    assert.equal(after['kaiqiao.save.v1'].stats.answered, 3);
    const oldPayload = { app: 'kaiqiao', format: 1, exportedAt: '2026-10-29T00:00:00.000Z', data: parsed.data, extras: parsed.extras };
    await input.setInputFiles({ name: '旧格式备份.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(oldPayload)) });
    await app.getByRole('button', { name: '确认替换并恢复' }).click();
    await app.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
    assert.deepEqual(await read(), after, '旧格式取消不写入');
    await app.getByRole('button', { name: '确认替换并恢复' }).click();
    await app.getByRole('dialog').getByRole('button', { name: '确认导入', exact: true }).click();
    await app.getByText('已恢复备份。', { exact: true }).waitFor();
    assert.deepEqual(await read(), after, '旧格式确认恢复');
    await input.setInputFiles({ name: '旧格式损坏.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...oldPayload, data: { ...parsed.data, stats: { answered: -1, correct: 0 } } })) });
    await app.getByRole('alert').waitFor(); assert.deepEqual(await read(), after, '旧格式坏数据不改变记录');
    await input.setInputFiles({ name: '旧格式回滚.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...oldPayload, data: { ...parsed.data, xp: parsed.data.xp + 1 } })) });
    await frame.evaluate(() => {
      const original = Storage.prototype.setItem;
      let failed = false;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'kaiqiao-class-log' && !failed) { failed = true; throw new DOMException('test quota', 'QuotaExceededError'); }
        return original.call(this, key, value);
      };
    });
    await app.getByRole('button', { name: '确认替换并恢复' }).click();
    await app.getByRole('dialog').getByRole('button', { name: '确认导入', exact: true }).click();
    await app.getByRole('alert').filter({ hasText: '恢复失败，请检查' }).waitFor();
    assert.deepEqual(await read(), after, '旧格式写入失败五键回滚');

    await input.setInputFiles({ name: '坏文件.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    await app.getByRole('alert').filter({ hasText: 'JSON' }).waitFor();
    await app.getByRole('alert').filter({ hasText: 'JSON' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `reports/trust-shots/error-${width}.png` });
    assert.deepEqual(await read(), after);
    assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(new URL(await app.locator('a[href^="mailto:"]').getAttribute('href')).searchParams.get('subject'), '开窍反馈');
    assert.deepEqual(external, []); assert.deepEqual(dialogs, []);
    assertSameOriginMetrics(events, base);
    assert.ok(events.some(event => JSON.parse(event.body).event === 'backup_export_click'), '导出备份点击应发往同源 /e，载荷仍只有 v/event/grade/count');
    console.log(`PASS ${width}: 首页/练习/学情零非同源请求；3题导出→清空→取消不写入→确认恢复五键；旧format:1确认/取消/坏数据/写入失败回滚；坏文件提示；无原生 dialog/溢出；反馈 subject 正确`);
    await context.close();
  }
  // Hostnames are fulfilled from the local static server; no real domain is contacted.
  for (const hasRecords of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (!['yanghat.cn', 'www.yanghat.cn'].includes(u.hostname)) return route.abort();
      const response = await route.fetch({ url: base + u.pathname + u.search });
      await route.fulfill({ response });
    });
    if (hasRecords) await ctx.addInitScript(() => { if (location.hostname === 'yanghat.cn') localStorage.setItem('kaiqiao-class-log', '{}'); });
    const p = await ctx.newPage();
    await p.goto('https://yanghat.cn/?practice=1&grade=5#keep');
    if (hasRecords) {
      await p.locator('.domain-notice').waitFor();
      assert.equal(new URL(p.url()).hostname, 'yanghat.cn');
      assert.ok(await p.locator('.domain-notice').isVisible());
      assert.ok(await p.locator('#practice-frame').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.domain-notice').getBoundingClientRect().bottom - 1));
      assert.equal(new URL(p.frames().find(f => f.url().includes('/app/')).url()).hostname, 'yanghat.cn');
      await p.screenshot({ path: 'reports/trust-shots/apex-records-390.png' });
    } else {
      await p.waitForURL('https://www.yanghat.cn/?practice=1&grade=5#keep');
    }
    await ctx.close();
  }
  console.log('PASS: 本地模拟裸域无记录软跳保留参数/hash；有记录保留裸域且提示条不遮挡 iframe');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
