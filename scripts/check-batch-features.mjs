import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir } from 'node:fs/promises';
import { syncPayQr, PAY_QR_HASH, PAY_QR_SOURCE } from './topup-pay-qr.mjs';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';
import { testSigner } from './batch-fixtures.mjs';
import { STORAGE_KEY } from '../site/www.yanghat.cn/topup-core.js';
const root='site/www.yanghat.cn';
const read=path=>readFile(`${root}/${path}`,'utf8');
const manifest=JSON.parse(await read('manifest.webmanifest'));
assert.deepEqual(Object.fromEntries(['name','short_name','start_url','scope','display','theme_color','background_color','lang'].map(k=>[k,manifest[k]])),{name:'养习开窍',short_name:'开窍',start_url:'/?practice=1',scope:'/',display:'standalone',theme_color:'#f7f6ef',background_color:'#f7f6ef',lang:'zh-CN'});
assert.equal(manifest.icons.length,3);
for(const [file,size] of [['pwa-192.png',192],['pwa-512.png',512],['pwa-maskable-512.png',512],['apple-touch-icon.png',180]]){
  const png=await readFile(`${root}/assets/${file}`);
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
  if(size!==180){const icon=manifest.icons.find(i=>i.src===`/assets/${file}`);assert.equal(icon.sizes,`${size}x${size}`);assert.equal(icon.type,'image/png');assert.equal(icon.purpose,file.includes('maskable')?'maskable':'any');}
}
for(const name of ['index.html','404.html','topup/index.html']){
  const html=await read(name);
  assert.match(html,/<link rel="manifest" href="\/manifest.webmanifest">/);
  assert.match(html,/<link rel="apple-touch-icon" href="\/assets\/apple-touch-icon.png">/);
  assert.match(html,/apple-mobile-web-app-capable/);
  assert.match(html,/<footer[\s\S]*家长扫码联系客服/);
  assert.match(html,/alt="家长扫码联系客服（微信二维码）"/);
}
const serviceQr=await readFile(`${root}/assets/wechat-service-qr.png`);
assert.ok(serviceQr.length>=8000&&serviceQr.length<=200000);
assert.equal(createHash('sha256').update(serviceQr).digest('hex'),'7091ae644b68983bbb4977a442f2df0ff2f01265da06c3c81680cd556d22bc0c');
const paySource=await readFile(PAY_QR_SOURCE);
assert.ok(paySource.length>=8000&&paySource.length<=200000);
assert.equal(createHash('sha256').update(paySource).digest('hex'),PAY_QR_HASH);
const publishedOpen=(await read('topup-open.js')).includes('export default true;');
if(publishedOpen) assert.equal(createHash('sha256').update(await readFile(`${root}/assets/wechat-pay-qr.png`)).digest('hex'),PAY_QR_HASH);
else await assert.rejects(access(`${root}/assets/wechat-pay-qr.png`));
try {
  await syncPayQr(true);
  assert.equal(createHash('sha256').update(await readFile(`${root}/assets/wechat-pay-qr.png`)).digest('hex'),PAY_QR_HASH);
  await syncPayQr(false);await assert.rejects(access(`${root}/assets/wechat-pay-qr.png`));
} finally { await syncPayQr(publishedOpen); }
const topup=await read('topup/index.html');assert.match(topup,/<meta name="robots" content="noindex">/);
assert.doesNotMatch(topup,/wechat-pay-qr|class="pay-qr"/);
for(const text of ['请家长操作','小朋友不要自己付款','付款备注填订单号','点数目前还没有可消费的功能','不在备份文件里','懂技术的人能改本机数字','以实际付款与对账为准','充值暂未开放，免费练习不需要付费；已付款的家长可联系客服全额退款。','1–50','点数暂时还不能使用，功能上线前请按需充值；兑换前可联系客服全额退款'])assert.ok(topup.includes(text),text);
assert.equal(await read('topup-open.js'),`// Baked from TOPUP_OPEN at release. Unset closes payment. Only the exact string true opens it.\nexport default ${publishedOpen};\n`);
assert.match(await read('_headers'),/\/assets\/wechat-pay-qr\.png\n  Cache-Control: no-cache/);
assert.doesNotMatch(topup,/1–200/);
assert.doesNotMatch(await read('sitemap.xml'),/topup/);
assert.match(await read('index.html'),/href="\/topup">家长充值/);
assert.match(await read('pelican.css'),/prefers-reduced-motion:reduce/);
const artwork=await read('assets/pelican.svg');for(const name of ['index.html','404.html'])assert.ok((await read(name)).includes(artwork));
const publicConfig=await read('topup-config.js');const jwk=JSON.parse(publicConfig.slice(publicConfig.indexOf('export default ')+15).replace(/;\s*$/,''));assert.deepEqual(Object.keys(jwk.publicKeyJwk).sort(),['crv','kty','x','y']);assert.equal(jwk.publicKeyJwk.crv,'P-256');
// Inspect source and generated artifacts, including ignored files, but never environment files,
// dependencies, Git internals, or local Wrangler state. Only assert, never print matching contents.
let inspected=0;
async function inspect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  if(['.git','node_modules','.wrangler'].includes(entry.name)||entry.name.startsWith('.env'))continue;
  const file=`${dir}/${entry.name}`;
  assert.ok(!/\.jwk$|^private-key/.test(entry.name),`Issuer file must be outside repository: ${file}`);
  if(entry.isDirectory())await inspect(file);
  else if(/\.(?:m?js|tsx?|json|webmanifest|html|css|svg|md)$/.test(entry.name)){
    const source=await readFile(file,'utf8');assert.ok(!/"d"\s*:/.test(source),`Private JWK field forbidden: ${file}`);inspected++;
  }
}}
await inspect('.');
const headers=await read('_headers');
for(const path of ['/manifest.webmanifest','/topup','/topup/','/topup/index.html','/topup.js','/topup-core.js','/topup-config.js','/topup-open.js'])assert.ok(headers.includes(`${path}\n  Cache-Control: no-cache`));
const newPublic=['install.js','topup.js','topup-core.js','topup-config.js','topup-open.js','topup/index.html','pelican.css','assets/pelican.svg','manifest.webmanifest'];
for(const file of newPublic){const source=await read(file);assert.doesNotMatch(source,/(?:src|poster)\s*=\s*["']https?:\/\/|(?:src|href)["']?\s*:\s*["']https?:\/\/|url\(\s*["']?https?:\/\/|@import\s*["']https?:\/\//i,file);}
for(const file of ['src/components/math/pelican.tsx','scripts/make-pwa-icons.mjs','scripts/topup-keygen.mjs','scripts/shoot-batch.mjs','scripts/topup-core.test.mjs','scripts/batch-fixtures.mjs','scripts/check-batch-sw.mjs','scripts/check-batch-features.mjs','site/topup-code.md'])assert.doesNotMatch(await readFile(file,'utf8'),/(?:src|poster)\s*=\s*["']https?:\/\/|url\(\s*["']?https?:\/\/|@import\s*["']https?:\/\//i,file);
console.log(`PASS batch static manifest/icons/three heads/QR/noindex/protocol/reduced motion; ${inspected} repository files without private JWK fields`);
await import('./check-batch-sw.mjs');
const server=await homePreview();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),external=[],errors=[];
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(['data:','blob:'].includes(url.protocol))return route.continue();
    if(url.origin!==server.base){external.push(url.href);return route.abort();}
    if(url.pathname==='/topup-open.js')return route.fulfill({contentType:'application/javascript',body:'export default true;'});
    if(url.pathname==='/assets/wechat-pay-qr.png')return route.fulfill({contentType:'image/png',body:paySource});
    if(url.pathname==='/e')return route.fulfill({status:204,body:''});
    return route.continue();
  });
  const sign=await testSigner(context),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.base);assert.ok(await page.locator('.pelican').isVisible());
  assert.ok(await page.locator('#install-hint').isVisible());
  await page.evaluate(()=>{window.installCalls=0;const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.installCalls++;};window.dispatchEvent(event);});
  assert.equal(await page.evaluate(()=>window.installCalls),0);await page.locator('[data-install]').click();assert.equal(await page.evaluate(()=>window.installCalls),1);
  await page.locator('[data-dismiss]').click();await page.reload();assert.ok(await page.locator('#install-hint').isHidden());
  assert.equal(await page.evaluate(()=>localStorage.getItem('kaiqiao.install-dismissed')),'true');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const part of ['.pelican-body','.pelican-eye','.pelican-stars'])assert.equal(await page.locator(part).evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.goto(server.base+'/?practice=1');assert.ok(await page.locator('#install-hint').isHidden());
  const shots=process.env.ARTIFACT_DIR||path.join(os.tmpdir(),'kaiqiao-topup-shots');await mkdir(shots,{recursive:true});
  const closed=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await closed.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==server.base)return route.abort();if(url.pathname==='/topup-open.js')return route.fulfill({contentType:'application/javascript',body:'// Baked from TOPUP_OPEN at release. Unset closes payment. Only the exact string true opens it.\nexport default false;\n'});return route.continue();});
  const closedPage=await closed.newPage();
  await closedPage.goto(server.base+'/topup/');
  assert.equal(await closedPage.locator('#topup-closed').innerText(),'充值暂未开放，免费练习不需要付费；已付款的家长可联系客服全额退款。');
  assert.equal(await closedPage.locator('.pay-qr').count(),0);
  assert.doesNotMatch(await closedPage.locator('body').innerText(),/请按需充值|决定是否付款/);
  assert.doesNotMatch(await closedPage.content(),/wechat-pay-qr/);
  await closed.close();
  await page.goto(server.base+'/topup/');
  await page.locator('#order-form').waitFor();
  assert.ok(await page.locator('#topup-closed').isHidden());
  assert.equal(await page.locator('.pay-qr').getAttribute('src'),'/assets/wechat-pay-qr.png');
  assert.ok(await page.locator('.pay-qr').isVisible());
  assert.ok(await page.locator('#redeem-form').isVisible());
  await page.screenshot({path:`${shots}/open.png`,fullPage:true});
  assert.match(await page.locator('.parent-notice').innerText(),/点数暂时还不能使用，功能上线前请按需充值；兑换前可联系客服全额退款/);
  for(const invalid of ['0','-1','1.5','51','99']){await page.locator('#yuan').fill(invalid);await page.locator('#order-form button').click();await page.locator('#topup-message',{hasText:'整数元'}).waitFor();assert.equal(await page.locator('.topup-order').count(),0,invalid);}
  await page.locator('#yuan').fill('10');await page.locator('#order-form button').click();
  await page.locator('.topup-order').first().waitFor();
  const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY),order=state.orders[0];
  assert.match(order.id,/^KQ[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);assert.equal(order.points,1000);assert.ok(order.payableFen>=1001&&order.payableFen<=1009);
  await page.locator('#order-form button').click();await page.locator('.topup-order').nth(1).waitFor();assert.equal(await page.locator('.topup-order').count(),2);
  const latest=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);assert.notEqual(latest.orders[1].id,order.id);
  await page.locator('.topup-order').first().locator('summary').click();await page.getByRole('button',{name:'确认删除未付款订单'}).first().click();await page.locator('#topup-message',{hasText:'已删除订单。'}).waitFor();assert.equal(await page.locator('.topup-order').count(),1);
  const code=await sign(order);
  await page.locator('#code').fill(code);await page.locator('#redeem-form button').click();
  await page.getByText('兑换成功，点数已存入本机余额。',{exact:true}).waitFor();assert.equal(await page.locator('#balance').innerText(),'1000');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).orders[0].redeemed,STORAGE_KEY),true);
  await page.reload();assert.equal(await page.locator('#balance').innerText(),'1000');
  await page.locator('#code').fill(code);await page.locator('#redeem-form button').click();await page.getByText('这个订单已经兑换过了，不能重复兑换。',{exact:true}).waitFor();
  assert.equal(await page.locator('#balance').innerText(),'1000');
  await page.locator('#yuan').fill('10');await page.locator('#order-form button').click();
  await page.locator('.topup-order',{hasText:'待处理'}).first().waitFor();
  await page.locator('.topup-order',{hasText:'待处理'}).first().locator('summary').click();
  await page.evaluate(key=>{const state=JSON.parse(localStorage.getItem(key));const pending=state.orders.find(item=>!item.redeemed);pending.redeemed=true;state.balance+=pending.points;localStorage.setItem(key,JSON.stringify(state));},STORAGE_KEY);
  await page.getByRole('button',{name:'确认删除未付款订单'}).click();
  await page.getByText('该订单已兑换，未删除',{exact:true}).waitFor();
  assert.equal(await page.locator('#balance').innerText(),'2000');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.service-qr summary').click();assert.ok(await page.locator('.service-qr-large').isVisible());
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await context.close();
  for(const mode of ['standalone','ios']){
    const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',...(mode==='ios'?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'}:{})});
    await ctx.route('**/*',r=>new URL(r.request().url()).origin===server.base?r.continue():r.abort());
    if(mode==='standalone')await ctx.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true}:original(q);});
    const p=await ctx.newPage();await p.goto(server.base);
    if(mode==='standalone')assert.ok(await p.locator('#install-hint').isHidden());else assert.match(await p.locator('[data-install-text]').innerText(),/点分享 → 添加到主屏幕/);
    await ctx.close();
  }
  for(const method of ['getItem','setItem']){
    const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    await ctx.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==server.base)return route.abort();if(url.pathname==='/topup-open.js')return route.fulfill({contentType:'application/javascript',body:'export default true;\n'});return route.continue();});
    await ctx.addInitScript(({method,key})=>{const original=Storage.prototype[method];Storage.prototype[method]=function(name,...args){if(name===key)throw new DOMException('test internal storage error','SecurityError');return original.call(this,name,...args);};},{method,key:STORAGE_KEY});
    const p=await ctx.newPage();await p.goto(server.base+'/topup/');
    if(method==='setItem'){await p.locator('#order-form').waitFor();await p.locator('#order-form button').click();}
    await p.locator('#topup-message',{hasText:'浏览器'}).waitFor();
    const text=await p.locator('#topup-message').innerText();assert.match(text,/浏览器/);assert.doesNotMatch(text,/test internal|SecurityError/);assert.equal(await p.locator('.topup-order').count(),0);
    await ctx.close();
  }
  console.log('PASS batch mobile home/pelican/reduced motion/install lifecycle/iOS/standalone; topup validation/multiple orders/delete/test-key redeem/reload/replay/storage; QR/storage denial; zero external requests/errors');
}finally{await browser.close();await server.close();}
