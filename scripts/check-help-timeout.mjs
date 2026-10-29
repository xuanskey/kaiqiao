// 客服请求挂起（网络无响应）时，20 秒后给出友好提示并可重试；不调用真实模型。
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';

const server = await homePreview();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  let calls = 0;
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== server.base) return route.abort();
    if (url.pathname === '/help-config.js') return route.fulfill({ contentType: 'application/javascript', body: 'export default "/api/help";\n' });
    if (url.pathname === '/api/help') { calls++; return; } // 永不响应
    if (url.pathname === '/e') return route.fulfill({ status: 204 });
    return route.continue();
  });
  const page = await context.newPage();
  await page.clock.install();
  await page.goto(server.base + '/', { waitUntil: 'load' });
  await page.getByRole('button', { name: '帮助', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('你的问题').fill('怎么开始练习？');
  const send = dialog.getByRole('button', { name: '发送', exact: true });
  await send.click();
  await page.waitForFunction(() => document.querySelector('.help-answer')?.textContent === '小助手正在想…');
  assert.equal(calls, 1);
  await page.clock.fastForward(19000);
  assert.equal(await dialog.getByRole('status').innerText(), '小助手正在想…', '20 秒前不提前放弃');
  await page.clock.fastForward(1500);
  await dialog.getByRole('status').filter({ hasText: '小助手太久没有回应' }).waitFor();
  assert.ok(await send.isEnabled(), '超时后可重试');
  assert.equal(await dialog.getByLabel('你的问题').inputValue(), '怎么开始练习？', '超时不清掉家长输入');
  assert.equal(await dialog.locator('.help-log li').count(), 0);
  console.log('PASS 客服请求挂起 20 秒后提示并可重试，问题保留');
} finally { await browser.close(); await server.close(); }
