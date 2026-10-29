// Deterministic local rasterization of the existing brand, no network or new dependency.
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const brand = await readFile('site/www.yanghat.cn/assets/brand.svg', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/ungoogled-chromium/chrome', args: ['--no-sandbox'] });
try {
  for (const [name, size, inset] of [['pwa-192',192,0],['pwa-512',512,0],['pwa-maskable-512',512,96],['apple-touch-icon',180,0]]) {
    const page = await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    await page.setContent(`<style>body{margin:0;background:#f7f6ef;display:grid;place-items:center;width:100vw;height:100vh}svg{width:${size-inset*2}px;height:${size-inset*2}px}</style>${brand}`);
    await page.screenshot({path:`site/www.yanghat.cn/assets/${name}.png`});
    await page.close();
  }
} finally { await browser.close(); }
console.log('PASS generated four local brand icons');
