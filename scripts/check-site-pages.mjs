import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {homePreview} from './home-preview.mjs';
import {assertSameOriginMetrics,recordMetrics} from './metrics-request-assert.mjs';
import {PEP_MATH,JK_SCIENCE,resolveUnits} from '../src/lib/lesson/curriculum.ts';
const server=await homePreview();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
const luminance=rgb=>rgb.map(n=>n/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 const external=[],errors=[],dialogs=[],events=[];
 await context.route('**/*',async r=>{const u=new URL(r.request().url());if(['data:','blob:'].includes(u.protocol))return r.continue();if(u.origin!==server.base){external.push(u.href);return r.abort();}if(u.pathname==='/e')return recordMetrics(r,events);return r.continue();});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});
 const refs=new Set();const titles=new Set();
 const sitemap=await context.request.get(server.base+'/sitemap.xml');assert.equal(sitemap.status(),200);assert.match(sitemap.headers()['content-type'],/xml/);
 const xml=await sitemap.text();const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.deepEqual(urls,['https://www.yanghat.cn/',...Array.from({length:6},(_,i)=>`https://www.yanghat.cn/grade/${i+1}/`)]);
 const robots=await context.request.get(server.base+'/robots.txt');assert.equal(robots.status(),200);assert.match(robots.headers()['content-type'],/text\/plain/);assert.match(await robots.text(),/Sitemap: https:\/\/www.yanghat.cn\/sitemap.xml/);assert.doesNotMatch(await robots.text(),/Disallow: \/app/);
 assert.equal((await context.request.get(server.base+'/app/')).headers()['x-robots-tag'],'noindex');
 // Existing paths: redirects remain explicit; query entries and real app files remain 200.
 for(const path of ['/','/?practice=1','/?practice=1&grade=5','/app/','/app/index.html','/app/offline.html','/app/sw.js'])assert.equal((await context.request.get(server.base+path)).status(),200,path);
 for(const path of ['/练习','/练习/']){const r=await context.request.get(server.base+path,{maxRedirects:0});assert.equal(r.status(),301);assert.equal(r.headers().location,'/?practice=1');}
 const appRedirect=await context.request.get(server.base+'/app',{maxRedirects:0});assert.equal(appRedirect.status(),301);assert.equal(appRedirect.headers().location,'/app/');
 for(const [width,height]of [[375,812],[768,1024],[1280,800]]){
  await page.setViewportSize({width,height});
  for(const target of ['/','/不存在的页','/abc/def',...Array.from({length:6},(_,i)=>`/grade/${i+1}/`)]){
   const missing=['/不存在的页','/abc/def'].includes(target);
   const response=await page.goto(server.base+target,{waitUntil:'networkidle'});assert.equal(response.status(),missing?404:200);
   assert.equal(await page.locator('.skip-link').getAttribute('href'),'#main');
   await page.keyboard.press('Tab');assert.ok(await page.locator('.skip-link').evaluate(el=>el===document.activeElement));await page.keyboard.press('Enter');
   if(missing){assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex');await page.getByRole('link',{name:'返回首页',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/');await page.goto(server.base+'/404.html');}
   const grade=Number(target.split('/')[2]);
   if(target.startsWith('/grade/')){
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),`https://www.yanghat.cn/grade/${grade}/`);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'),`https://www.yanghat.cn/grade/${grade}/`);
    const title=await page.title();assert.match(title,new RegExp(['','一','二','三','四','五','六'][grade]+'年级'));if(width===375){assert.ok(!titles.has(title));titles.add(title);}
    assert.ok(await page.locator('meta[name="description"]').getAttribute('content'));
    const text=await page.locator('main').innerText();assert.match(text,/参考人教版、教科版目录编排/);assert.doesNotMatch(text,/官方|教材同步/);
    for(const edition of [PEP_MATH,JK_SCIENCE])for(const term of ['上','下'])for(const unit of resolveUnits(edition,grade,term).units)assert.ok(text.includes(unit.title),unit.title);
    for(const href of await page.locator('main a[href*="practice=1"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))))assert.equal(href,`/?practice=1&grade=${grade}`);
    await page.getByRole('link',{name:`进入${['','一','二','三','四','五','六'][grade]}年级练习`,exact:true}).click();
    await page.frameLocator('#practice-frame').locator('#grade').waitFor();assert.equal(await page.frameLocator('#practice-frame').locator('#grade').inputValue(),String(grade));
    await page.goto(server.base+target);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${target} overflow ${width}`);
   await page.locator('footer').scrollIntoViewIfNeeded();assert.ok(await page.locator('footer').isVisible());
   assert.equal(await page.getByText('不收集个人信息，练习记录只保存在本机；客服提问发送前会自动隐去疑似姓名电话等，请勿填写。',{exact:true}).count(),1);
   const colors=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{
    const s=getComputedStyle(el);return !['SCRIPT','STYLE','VIDEO'].includes(el.tagName)&&!el.closest('video')&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&el.getClientRects().length&&s.visibility!=='hidden';
   }).map(el=>{
    const style=getComputedStyle(el);let node=el,bg='';while(node){const color=getComputedStyle(node).backgroundColor;if(!['rgba(0, 0, 0, 0)','transparent'].includes(color)){bg=color;break;}node=node.parentElement;}
    const fg=el instanceof SVGElement?style.fill:style.color;
    return {text:el.textContent.trim().slice(0,35),fg,bg:bg||'rgb(255, 255, 255)'};
   }));
   for(const c of colors){const fg=c.fg.match(/[\d.]+/g)?.map(Number),bg=c.bg.match(/[\d.]+/g)?.map(Number);if(!fg||!bg)continue;const a=luminance(fg.slice(0,3)),b=luminance(bg.slice(0,3));const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,`${target} ${c.text}: ${c.fg}/${c.bg} contrast ${ratio}`);}
   for(const ref of await page.locator('[href],[src],[poster]').evaluateAll(nodes=>nodes.flatMap(n=>['href','src','poster'].map(k=>n.getAttribute(k)).filter(Boolean)))){
    if(ref.startsWith('#')){assert.ok(await page.locator(`[id="${ref.slice(1)}"]`).count(),ref);continue;}
    const u=new URL(ref,page.url());if(['www.yanghat.cn','yanghat.cn'].includes(u.hostname)){u.host=new URL(server.base).host;u.protocol='http:';}if(u.origin===server.base){u.hash='';refs.add(u.href);}
   }
   if(width<1000){const sizes=await page.locator('main p, footer p').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>Number.parseFloat(getComputedStyle(n).fontSize)));assert.ok(sizes.every(s=>s>=16),`${target} mobile paragraph under 16px: ${sizes}`);}
  }
  console.log(`PASS ${width}: Pages 404、原入口、6目录真实年级、页脚、键盘、正文16px、文本对比度AA、无溢出`);
 }
 for(const url of new Set([...refs,...urls.map(u=>server.base+new URL(u).pathname)])){
  const res=await context.request.get(url);assert.equal(res.status(),200,`${url}: ${res.status()}`);await res.dispose();
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(server.base);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
 await page.locator('#demo-next').focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');assert.equal(await page.locator('#demo-answer').innerText(),'13');
 assert.equal(await page.locator('#demo-next').evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
 assertSameOriginMetrics(events,server.base);
 assert.match(await readFile('site/www.yanghat.cn/metrics-config.js','utf8'),/export default "\/e"/);
 console.log(`PASS: 全站 ${refs.size} 个站内链接/资源 + 7 sitemap URL 无404，/e 仅同源且载荷只有 v/event/grade/count、无 cookie/referer/非同源请求，无运行时错误/原生dialog，键盘演示与减弱动效`);
}finally{await browser.close();await server.close();}
