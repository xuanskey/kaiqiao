// 验证主站对外入口是 /?practice=1：地址栏不出现 /app/，练习用同域 iframe 内嵌 /app/。
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { emptyPersist, SAVE_KEY } from '../src/lib/math/save.ts';
import { enqueueReview, emptyReview, REVIEW_CONTENT_KEY, REVIEW_SCHEDULE_KEY } from '../src/lib/math/review.ts';

const root = path.resolve('site/www.yanghat.cn');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.jpg': 'image/jpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/e' && req.method === 'POST') { res.writeHead(204).end(); return; }
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
const practicePath = (page) => decodeURIComponent(new URL(page.url()).pathname);
const assertPracticeUrl = (page, extra = {}) => {
  const current = new URL(page.url());
  assert.equal(practicePath(page), '/');
  assert.equal(current.searchParams.get('practice'), '1');
  assert.equal(current.href.includes('/app'), false);
  assert.equal(current.searchParams.get('lesson'), extra.lesson ?? null);
  assert.equal(current.searchParams.get('grade'), extra.grade ?? null);
};
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [], external = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    external.push(url); return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const appFrame = async () => {
    const frame = page.frames().find((item) => {
      if (item.isDetached()) return false;
      try { return /\/app\/?$/.test(decodeURIComponent(new URL(item.url()).pathname).replace(/\/index\.html$/, '')); }
      catch { return false; }
    });
    if (!frame) throw new Error('缺少 /app/ 内嵌框架');
    return frame;
  };

  await page.goto(base + '/');
  assert.equal(practicePath(page), '/');
  assert.equal(new URL(page.url()).search, '');
  const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  const entries = links.filter(href => href?.includes('practice=1') || href?.includes('/app') || href?.includes('kaiqiao.yanghat.cn'));
  assert.ok(entries.length >= 8, `练习入口过少: ${entries.join(', ')}`);
  assert.ok(entries.every(href => href.startsWith('/?practice=1')), entries.join(', '));
  assert.equal(await page.evaluate(() => navigator.serviceWorker?.controller ?? null), null);

  await page.getByRole('link', { name: '进入开窍', exact: false }).first().click();
  await page.frameLocator('iframe[title="开窍练习"]').getByText('练习年级', { exact: true }).waitFor();
  assertPracticeUrl(page);
  const embedded = await (await appFrame()).evaluate(() => location.pathname);
  assert.equal(embedded, '/app/');

  const q = { chapterId: 'warmup', prompt: '12 + 3 = ?', answer: '15', given: '0', explain: '相加', at: Date.now(), mode: 'keypad' };
  const review = enqueueReview(emptyReview(), q, Date.now() - 86400000);
  await context.addInitScript(({ saveKey, contentKey, scheduleKey, save, review }) => {
    if (sessionStorage.getItem('review-fixture')) return;
    sessionStorage.setItem('review-fixture', '1');
    localStorage.setItem(saveKey, JSON.stringify(save));
    localStorage.setItem(contentKey, JSON.stringify(review.content));
    localStorage.setItem(scheduleKey, JSON.stringify(review.schedule));
  }, { saveKey: SAVE_KEY, contentKey: REVIEW_CONTENT_KEY, scheduleKey: REVIEW_SCHEDULE_KEY, save: { ...emptyPersist(), muted: true }, review });
  await page.reload();
  const app = () => page.frameLocator('iframe[title="开窍练习"]');
  await app().getByRole('button', { name: '错题本', exact: true }).click();
  await app().getByRole('button', { name: '开始今日复习', exact: true }).click();
  await app().locator('.question-prompt').waitFor();
  const keys = app().getByRole('group', { name: '数字键盘' });
  await keys.getByRole('button', { name: '1', exact: true }).click();
  await keys.getByRole('button', { name: '5', exact: true }).click();
  await keys.getByRole('button', { name: '确定', exact: true }).click();
  await app().locator('.feedback-box').waitFor();
  await app().getByRole('button', { name: '下一题', exact: true }).click();
  await app().getByText('本轮复习已完成。', { exact: false }).waitFor();
  await app().getByRole('button', { name: '回到错题本', exact: false }).click();
  await app().getByText('今天暂无到期题。', { exact: false }).waitFor();
  assert.ok(await (await appFrame()).evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.reload();
  assertPracticeUrl(page);
  await app().getByRole('button', { name: '错题本', exact: true }).click();
  await app().getByText('今天暂无到期题。', { exact: false }).waitFor();
  const saved = await (await appFrame()).evaluate(key => JSON.parse(localStorage.getItem(key)), REVIEW_SCHEDULE_KEY);
  assert.equal(Object.values(saved)[0].stage, 1);

  await page.goto(base + '/');
  await page.getByRole('link', { name: '小数除法：除数是小数怎么办' }).click();
  await app().getByRole('heading', { name: '小数除法', exact: false }).waitFor();
  assertPracticeUrl(page, { lesson: 'decimal-div', grade: '5' });
  assert.equal(await (await appFrame()).evaluate(() => location.pathname), '/app/');
  await page.goto(base + '/?practice=1&lesson=fraction-mul&grade=6');
  await app().getByRole('heading', { name: '分数乘法', exact: false }).waitFor();
  assertPracticeUrl(page, { lesson: 'fraction-mul', grade: '6' });

  await page.goto(base + '/app/?lesson=decimal-div&grade=5');
  await page.waitForURL(url => url.pathname === '/' && url.searchParams.get('practice') === '1' && url.searchParams.get('lesson') === 'decimal-div');
  await app().getByRole('heading', { name: '小数除法', exact: false }).waitFor();
  assertPracticeUrl(page, { lesson: 'decimal-div', grade: '5' });
  await page.goto(base + '/app');
  await page.waitForURL(url => url.pathname === '/' && url.searchParams.get('practice') === '1' && !url.searchParams.get('lesson'));
  assertPracticeUrl(page);

  await page.goto(base + '/?practice=1');
  await app().getByText('练习年级', { exact: true }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await (await appFrame()).evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const practice = await appFrame();
  await practice.waitForFunction(() => !!navigator.serviceWorker.controller);
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope), base + '/');
  assert.ok((await page.evaluate(() => navigator.serviceWorker.controller.scriptURL)).endsWith('/sw-practice.js'));
  assert.equal(await practice.evaluate(async () => (await navigator.serviceWorker.ready).scope), base + '/app/');
  assert.ok((await practice.evaluate(() => navigator.serviceWorker.controller.scriptURL)).endsWith('/app/sw.js'));
  await page.goto(base + '/');
  await page.getByRole('heading', { name: /不急着学会/ }).waitFor();
  assert.equal(await page.locator('#practice-frame').count(), 0);
  assert.equal((await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '')).includes('/app/sw.js'), false);
  await page.goto(base + '/?practice=1');
  await app().getByText('练习年级', { exact: true }).waitFor();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await (await appFrame()).waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await app().getByText('练习年级', { exact: true }).waitFor();
  assertPracticeUrl(page);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log('PASS: 主站入口 /?practice=1、地址栏无 /app/、iframe 内嵌、手机复习与刷新、课程直达、顶层 /app/ 回到 /?practice=1、练习 SW 不改写门面、离线刷新');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
