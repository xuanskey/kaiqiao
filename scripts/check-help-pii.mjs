// 网页客服：个人信息在浏览器里就被隐去，请求体和对话记录都看不到原文；自由输入保留。不调用真实模型。
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';

const server = await homePreview();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const bodies = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== server.base) return route.abort();
    if (url.pathname === '/help-config.js') return route.fulfill({ contentType: 'application/javascript', body: 'export default "/api/help";\n' });
    if (url.pathname === '/api/help') { bodies.push(route.request().postData() || ''); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ v: 1, answer: '请不要发个人信息哦。', source: 'ai' }) }); }
    if (url.pathname === '/e') return route.fulfill({ status: 204 });
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(server.base + '/', { waitUntil: 'load' });
  await page.getByRole('button', { name: '帮助', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const input = dialog.getByLabel('你的问题');
  assert.equal(await input.getAttribute('placeholder'), '请勿输入姓名电话等');
  await input.fill('我儿子叫王小明，电话１３８１２３４５６７８，在阳光小学，怎么开始？');
  await dialog.getByRole('button', { name: '发送', exact: true }).click();
  await dialog.getByRole('status').filter({ hasText: '请不要发个人信息哦' }).waitFor();
  assert.equal(bodies.length, 1);
  assert.doesNotMatch(bodies[0], /王小明|１３８|138|阳光小学/);
  assert.match(bodies[0], /\[名字\].*\[电话\].*\[学校\]/);
  const note = dialog.locator('.help-redacted');
  assert.ok(await note.isVisible(), '提示已隐去个人信息');
  assert.match(await note.innerText(), /已在发送前隐去个人信息/);
  assert.doesNotMatch(await dialog.locator('.help-log').innerText(), /王小明|138|阳光小学/);
  await input.fill('3 + 5 等于几？');
  await dialog.getByRole('button', { name: '发送', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.help-log li').length === 4);
  assert.match(bodies[1], /3 \+ 5 等于几？/);
  assert.ok(!(await note.isVisible()), '正常问题不提示');
  console.log('PASS 网页客服在浏览器内隐去个人信息，正常问题原样发送');
} finally { await browser.close(); await server.close(); }
