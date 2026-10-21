// v0.12 新课的浏览器交互检查（可选，不在 CI 中运行）：
// npm run release && (cd docs && python3 -m http.server 4173 &) && node scripts/e2e-v12.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const out = process.env.SHOT_DIR || 'e2e-shots';
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
await import('node:fs').then((fs) => fs.mkdirSync(out, { recursive: true }));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const ok = (name) => console.log('✓', name);
try {
  for (const [w, h, tag] of [[1280, 900, 'desktop'], [390, 844, 'mobile']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    // 小数除法：直达链接
    await page.goto(`${BASE}?lesson=decimal-div&grade=5`);
    await page.getByRole('heading', { name: /小数除法/ }).first().waitFor();
    assert.ok(!page.url().includes('lesson='), '直达后清掉地址栏参数');
    ok(`${tag}：直达链接打开《小数除法》`);
    await page.getByRole('button', { name: '完整过程' }).click();
    const board = await page.locator('.board').innerText();
    assert.ok(board.includes('72 ÷ 4') && board.includes('= 18'), board);
    await page.getByRole('button', { name: '让我自己试试' }).first().click();
    await page.getByRole('button', { name: '除数加 0.1', exact: true }).click(); // 7.2 ÷ 0.5 = 14.4
    await page.locator('.ddiv .dec-answer', { hasText: '14.4' }).waitFor();
    await page.getByRole('button', { name: '除数减 0.1', exact: true }).click(); await page.getByRole('button', { name: '除数减 0.1', exact: true }).click(); await page.getByRole('button', { name: '除数加 1', exact: true }).click(); // 7.2 ÷ 1.3
    await page.locator('.ddiv', { hasText: '循环小数' }).waitFor();
    ok(`${tag}：动手改除数，商和循环小数实时更新`);
    await page.screenshot({ path: `${out}/v12-decimal-div-${tag}.png`, fullPage: true });
    await page.getByRole('button', { name: '开始随堂练习' }).click();
    const q = page.locator('.quiz');
    await q.waitFor();
    const choice = q.locator('.quiz-choices button');
    if (await choice.count()) await choice.first().click(); else { await q.getByLabel('填写答案').fill('9999'); await q.getByRole('button', { name: '提交' }).click(); }
    await q.locator('.quiz-feedback').waitFor();
    ok(`${tag}：随堂练习可作答并显示解析`);
    // 分数乘法：从课堂目录进入
    await page.goto(`${BASE}?lesson=fraction-mul&grade=6`);
    await page.getByRole('heading', { name: /分数乘法/ }).first().waitFor();
    await page.getByRole('button', { name: '让我自己试试' }).first().click();
    await page.getByRole('button', { name: '第一个分数取 1/4' }).click(); // 1/4 × 2/3 = 1/6
    await page.locator('.stage', { hasText: '1/4 × 2/3 = 1/6' }).waitFor();
    ok(`${tag}：分数乘法点格子改分子，结果变成 1/6`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `横向溢出 ${overflow}px`);
    await page.screenshot({ path: `${out}/v12-fraction-mul-${tag}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('v0.12 E2E passed');
} finally {
  await browser.close();
}
