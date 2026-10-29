// 充值页版面稳定性：开/关两种发布状态下，脚本晚到 600ms 也不应把页脚往下推（CLS < 0.02）。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';
import { bakeTopupHtml } from './topup-pay-qr.mjs';

const root = process.env.SITE_ROOT || 'site/www.yanghat.cn';
const bake = process.env.CLS_NO_BAKE ? (html) => html : bakeTopupHtml;
const source = await readFile(`${root}/topup/index.html`, 'utf8');
const server = await homePreview(root === 'site/www.yanghat.cn' ? undefined : (await import('node:path')).resolve(root));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const results = {};
try {
  for (const open of [false, true]) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      const page = await browser.newPage({ viewport });
      await page.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== server.base) return route.abort();
        if (url.pathname === '/topup/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: bake(source, open) });
        if (url.pathname === '/topup-open.js') return route.fulfill({ contentType: 'application/javascript', body: `export default ${open};\n` });
        if (url.pathname === '/topup.js') await new Promise((r) => setTimeout(r, 600));
        return route.continue();
      });
      await page.goto(server.base + '/topup/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const cls = await page.evaluate(() => window.__cls);
      results[`${open ? 'open' : 'closed'}-${viewport.width}`] = Number(cls.toFixed(4));
      assert.equal(await page.locator('#topup-closed').isVisible(), !open);
      await page.close();
    }
  }
} finally { await browser.close(); await server.close(); }
console.log('topup CLS', JSON.stringify(results));
if (!process.env.CLS_REPORT_ONLY) {
  for (const [key, value] of Object.entries(results)) assert.ok(value < 0.02, `${key} CLS ${value}`);
  console.log('PASS 充值页开/关两种状态 CLS < 0.02');
}
