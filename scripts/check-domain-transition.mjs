// 旧裸域 yanghat.cn 的迁移顺序（浏览器端那一半）：有本机练习记录时留在旧域、提示并能进到「导出备份」；
// 没有记录才跳到 www 且保留路径和参数。线上 301 在 Cloudflare 规则里、发生在脚本之前，见 site/README.md「旧域迁移」。
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';

// 仓库自身不得对裸域做无条件跳转（否则绕过存档保护）。
const redirects = await readFile('site/www.yanghat.cn/_redirects', 'utf8');
assert.doesNotMatch(redirects, /^\s*(?:https?:\/\/)?yanghat\.cn/m, '_redirects 不按裸域整体跳转');
assert.doesNotMatch(redirects, /^\/\*\s/m, '_redirects 没有全站兜底跳转');
for (const file of await readdir('site/functions', { recursive: true })) if (file.endsWith('.js')) assert.doesNotMatch(await readFile(`site/functions/${file}`, 'utf8'), /Response\.redirect|status:\s*30[1278]/, file);
assert.match(await readFile('site/www.yanghat.cn/index.html', 'utf8'), /<head>\s*<meta charset="utf-8">\s*<script type="module" src="\/domain-transition\.js"><\/script>/, '迁移判断是首页第一个脚本');
console.log('PASS 仓库内没有裸域无条件跳转；首页首个脚本是迁移判断');

const server = await homePreview();
const port = new URL(server.base).port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: [`--host-resolver-rules=MAP yanghat.cn 127.0.0.1:${port}`] });
try {
  const open = async (records) => {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    const www = [];
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === 'www.yanghat.cn') { www.push(url.href); return route.fulfill({ contentType: 'text/html', body: '<title>www</title>' }); }
      if (url.hostname !== 'yanghat.cn') return route.abort();
      if (url.pathname === '/e' || url.pathname === '/api/help') return route.fulfill({ status: 204 });
      return route.continue();
    });
    if (records) await context.addInitScript(() => { if (!localStorage.getItem('kaiqiao-activity')) localStorage.setItem('kaiqiao-activity', '{"2026-10-29":{"n":5,"ok":4}}'); });
    const page = await context.newPage();
    await page.goto(`http://yanghat.cn:${port}/?practice=1&grade=3#top`, { waitUntil: 'load' });
    return { context, page, www };
  };
  {
    const { context, page, www } = await open(false);
    await page.waitForURL(/www\.yanghat\.cn/);
    assert.equal(www[0], 'https://www.yanghat.cn/?practice=1&grade=3', '锚点不发给服务器，跳转后由浏览器保留');
    assert.equal(page.url(), 'https://www.yanghat.cn/?practice=1&grade=3#top');
    await context.close();
    console.log('PASS 无记录：跳到 www，保留路径、参数和锚点');
  }
  {
    const { context, page, www } = await open(true);
    const banner = page.locator('.domain-notice');
    await banner.waitFor();
    assert.match(await banner.innerText(), /导出备份/);
    assert.equal(await banner.getByRole('link').getAttribute('href'), 'https://www.yanghat.cn/?practice=1&grade=3#top');
    assert.equal(new URL(page.url()).hostname, 'yanghat.cn');
    const frame = page.frameLocator('#practice-frame');
    await frame.getByRole('button', { name: '学情' }).first().click();
    await frame.getByRole('button', { name: /导出备份/ }).first().waitFor();
    assert.deepEqual(www, [], '有记录时不自动跳转');
    await context.close();
    console.log('PASS 有记录：留在旧域、显示迁移提示，学情页「导出备份」可达');
  }
} finally { await browser.close(); await server.close(); }
