// 验证主站对外入口是 /?practice=1：地址栏不出现 /app/，练习用同域 iframe 内嵌 /app/。
import { mkdir } from 'node:fs/promises';
import { CHAPTERS } from '../src/lib/math/chapters.ts';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  await mkdir('reports/fix3-shots', { recursive: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const dialogs = [];
  const pageErrors = [];
  page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.goto(base);
  const link = page.locator('a[href*="lesson=decimal-div"]').first();
  console.log('真实课程卡链接:', await link.getAttribute('href'));
  await link.click();
  const app = page.frameLocator('#practice-frame');
  await app.getByRole('heading', { name: '小数除法', exact: false }).waitFor();
  assert.equal(await app.locator('#grade').inputValue(), '5');
  assert.match(await app.locator('.eyebrow').allTextContents().then(x => x.join(' ')), /五年级 · 数学/);
  await page.screenshot({ animations: 'disabled', path: 'reports/fix3-shots/grade5-lesson.png' });
  await app.getByRole('button', { name: '题库', exact: true }).click();
  assert.equal(await app.locator('#grade').inputValue(), '5');
  await app.getByRole('heading', { name: '题库与闯关', exact: true }).waitFor();
  const titles = (await app.locator('h1,h2,h3').allTextContents()).slice(1);
  assert.deepEqual(titles, CHAPTERS.filter(c => c.grade === 5).map(c => c.name));
  console.log('五年级题库:', titles);
  await page.screenshot({ animations: 'disabled', path: 'reports/fix3-shots/grade5-bank.png' });
  await app.getByRole('button', { name: '首页', exact: true }).click();
  await app.getByRole('button', { name: '完成每日练习', exact: false }).click();
  await app.locator('.question-prompt').waitFor();
  const frame = page.frames().find(f => f.url().includes('/app/'));
  const gradeOfQuestions = await frame.evaluate(async () => {
    return { title: document.querySelector('.practice-heading').textContent, prompt: document.querySelector('.question-prompt').textContent };
  });
  assert.match(gradeOfQuestions.prompt, /\d+\/\d+ [+-] \d+\/\d+ = \?/);
  console.log('五年级练习:', gradeOfQuestions);
  const exit = app.getByRole('button', { name: '结束练习', exact: true });
  await exit.click();
  const dialog = app.getByRole('dialog', { name: '结束练习？' });
  await dialog.waitFor();
  assert.equal(await dialog.getAttribute('aria-modal'), 'true');
  const focused = () => frame.evaluate(() => document.activeElement.textContent);
  assert.equal(await focused(), '继续练习');
  await page.screenshot({ animations: 'disabled', path: 'reports/fix3-shots/confirm-390.png' });
  await page.keyboard.press('Shift+Tab');
  assert.equal(await focused(), '结束练习');
  await page.keyboard.press('Tab');
  assert.equal(await focused(), '继续练习');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await focused(), '结束练习');
  assert.equal(await app.locator('.question-prompt').count(), 1);
  await exit.click();
  await page.keyboard.press('Enter'); // Safe default button cancels.
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await app.locator('.question-prompt').count(), 1);
  await exit.click();
  await page.mouse.click(5, 5); // Backdrop cancels.
  await dialog.waitFor({ state: 'detached' });
  await exit.click();
  assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth));
  assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await dialog.getByRole('button', { name: '结束练习', exact: true }).focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor({ state: 'detached' });
  await app.locator('#plan-title').waitFor();
  assert.equal(await app.locator('.question-prompt').count(), 0);
  console.log('PASS: 弹层 Esc/遮罩/安全 Enter 取消，Tab 循环与焦点恢复，确认后结束，无原生 dialog');
  assert.match(await app.locator('.hero-kicker').innerText(), /今日计划 · 还差 2 个学习步骤/);
  await page.screenshot({ animations: 'disabled', path: 'reports/fix3-shots/plan-unit-390.png' });
  console.log('PASS: 今日计划还差 2 个学习步骤，390px 无溢出');
  await app.getByRole('button', { name: '90 秒小挑战' }).click();
  await app.locator('.question-prompt').waitFor();
  await app.getByRole('button', { name: '结束练习', exact: true }).click();
  await app.getByRole('dialog', { name: '结束练习？' }).waitFor();
  await frame.evaluate(() => {
    const orig = window.requestAnimationFrame.bind(window);
    let extra = 0;
    window.requestAnimationFrame = (cb) => orig((t) => { extra += 1000; cb(t + extra); });
  });
  await app.getByRole('heading', { name: '时间到', exact: true }).waitFor();
  const afterTimer = await frame.evaluate(() => ({
    dialogs: document.querySelectorAll('dialog').length,
    modal: document.querySelector(':modal')?.tagName ?? null,
    inert: document.body.inert || document.documentElement.inert,
  }));
  assert.deepEqual(afterTimer, { dialogs: 0, modal: null, inert: false });
  await app.getByRole('button', { name: '回到练习', exact: true }).click();
  await app.locator('#plan-title').waitFor();
  console.log('PASS: 限时弹层期间时钟走完后弹层卸掉，结果页可操作，无报错');
  await app.getByRole('button', { name: '和窍窍比一比' }).click();
  await app.locator('.question-prompt').waitFor();
  await app.getByRole('button', { name: '结束练习', exact: true }).click();
  const duelDialog = app.getByRole('dialog', { name: '结束本轮对决？' });
  await duelDialog.waitFor();
  assert.match(await duelDialog.innerText(), /已提交的答案会保留。/);
  assert.equal(await duelDialog.getByRole('button', { name: '继续对决', exact: true }).count(), 1);
  assert.ok(await duelDialog.evaluate((el) => el.scrollWidth <= el.clientWidth));
  await page.keyboard.press('Escape');
  await duelDialog.waitFor({ state: 'detached' });
  assert.equal(await app.locator('.question-prompt').count(), 1);
  console.log('PASS: 结束对决使用独立文案，Esc 取消后题目仍在');
  assert.deepEqual(dialogs, []);
  assert.deepEqual(pageErrors, []);
  console.log('PASS: 真实课程卡年级、课堂页头、五年级题库与出题');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
