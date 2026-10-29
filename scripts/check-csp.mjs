// 安全响应头：按 _headers 本地还原后逐页走一遍，记录任何 CSP 拦截；覆盖首页练习框、各年级页、充值页、404、
// 离线单文件版、客服、课堂、PDF 导入（pdf.js worker）与图片识字（tesseract blob worker + wasm）。不联网。
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';

const server = await homePreview();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const violations = [];
try {
  const head = await fetch(server.base + '/');
  const csp = head.headers.get('content-security-policy') || '';
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "form-action 'self'"]) assert.ok(csp.includes(d), d);
  assert.doesNotMatch(csp, /[ ;]'unsafe-eval'|\*/, '不放开 eval 和通配来源');
  const hsts = head.headers.get('strict-transport-security') || '';
  assert.match(hsts, /^max-age=\d{7,}$/); assert.doesNotMatch(hsts, /preload|includeSubDomains/i);
  assert.match(head.headers.get('permissions-policy') || '', /camera=\(\)/);
  assert.equal(head.headers.get('x-frame-options'), 'SAMEORIGIN');
  console.log('PASS 安全响应头齐全：CSP、HSTS（无 preload/子域）、Permissions-Policy、X-Frame-Options');

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSPV ${e.violatedDirective} ${e.blockedURI} @${location.pathname}`));
    const ss = window.speechSynthesis; if (ss) { ss.speak = () => {}; ss.cancel = () => {}; }
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.continue();
    if (url.origin !== server.base) return route.abort();
    if (url.pathname === '/help-config.js') return route.fulfill({ contentType: 'application/javascript', body: 'export default "/api/help";\n' });
    if (url.pathname === '/api/help') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ v: 1, answer: '点开始练习。', source: 'ai' }) });
    if (url.pathname === '/e') return route.fulfill({ status: 204 });
    return route.continue();
  });
  const watch = (page) => {
    page.on('console', (m) => { const t = m.text(); if (/CSPV|Content Security Policy|Refused to/.test(t)) violations.push(t); });
    page.on('pageerror', (e) => { if (/Content Security Policy|EvalError/.test(String(e))) violations.push(String(e)); });
  };
  const page = await context.newPage(); watch(page);
  for (const path of ['/', '/grade/1/', '/grade/3/', '/grade/6/', '/topup/', '/no-such-page', '/app/', '/app/offline.html']) {
    await page.goto(server.base + path, { waitUntil: 'load' });
    await page.waitForTimeout(300);
  }
  assert.deepEqual(violations, [], violations.join('\n'));
  console.log('PASS 各页面打开无 CSP 拦截');

  await page.goto(server.base + '/?practice=1', { waitUntil: 'load' });
  const frame = page.frameLocator('#practice-frame');
  await frame.getByRole('button', { name: '课堂' }).first().click();
  await frame.getByRole('heading', { name: '互动课堂' }).waitFor();
  await page.goto(server.base + '/', { waitUntil: 'load' });
  await page.getByRole('button', { name: '帮助', exact: true }).click();
  await page.getByRole('dialog').getByLabel('你的问题').fill('怎么开始？');
  await page.getByRole('dialog').getByRole('button', { name: '发送', exact: true }).click();
  await page.getByRole('dialog').getByRole('status').filter({ hasText: '点开始练习' }).waitFor();
  console.log('PASS 首页练习框、课堂、客服在 CSP 下正常');

  // /app/ 顶层会回到首页练习框，导入在练习框里做。
  await page.goto(server.base + '/?practice=1', { waitUntil: 'load' });
  await frame.getByRole('button', { name: '课堂' }).first().click();
  await frame.getByRole('heading', { name: '互动课堂' }).waitFor();
  const app = page.frames().find((f) => new URL(f.url()).pathname.startsWith('/app/'));
  const fileInput = frame.locator('.import-panel input[type=file]').first();
  const pdf = (() => {
    const content = 'BT /F1 18 Tf 50 750 Td (12+35=) Tj ET';
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    let s = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const x = s.length; s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
    return Buffer.from(s, 'latin1');
  })();
  await fileInput.setInputFiles({ name: 'lesson.pdf', mimeType: 'application/pdf', buffer: pdf });
  await app.waitForFunction(() => document.querySelector('.import-panel textarea')?.value.includes('12+35='), null, { timeout: 30000 });
  console.log('PASS PDF 导入（pdf.js worker）在 CSP 下正常');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 520; c.height = 140; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 520, 140); g.fillStyle = '#000'; g.font = 'bold 64px sans-serif'; g.fillText('36+27=', 40, 95); return c.toDataURL('image/png').split(',')[1]; });
  await fileInput.setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await app.waitForFunction(() => /36\s*\+\s*27/.test(document.querySelector('.import-panel textarea')?.value ?? ''), null, { timeout: 120000 });
  console.log('PASS 图片识字（tesseract blob worker + wasm）在 CSP 下正常');
  assert.deepEqual(violations, [], violations.join('\n'));
  console.log('PASS 全程 0 条 CSP 拦截');
} catch (error) { console.error('violations:', violations); throw error; } finally { await browser.close(); await server.close(); }
