import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {homePreview} from './home-preview.mjs';
import {assertSameOriginMetrics,recordMetrics} from './metrics-request-assert.mjs';
const server=await homePreview();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 for(const [width,height] of [[375,812],[768,1024],[1280,800]]) {
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  const errors=[],external=[],dialogs=[],videos=[],events=[];
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(['data:','blob:'].includes(url.protocol)) return route.continue();
   if(url.origin!==server.base){external.push(url.href);return route.abort();}
   if(/\.mp4$/.test(url.pathname)) videos.push(url.href);
   if(url.pathname==='/e') return recordMetrics(route,events);
   return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});
  await page.goto(server.base,{waitUntil:'networkidle'});
  assert.equal(await page.locator('main > section').count(),5);
  assert.equal(await page.locator('[data-primary-cta]').count(),2);
  assert.equal(await page.locator('a.button[href*="practice=1"]:not([data-primary-cta])').count(),0);
  assert.equal(await page.locator('.hero [data-primary-cta]').getAttribute('href'),'/?practice=1');
  assert.equal(await page.locator('[data-grade]').count(),6);
  assert.equal(await page.locator('dialog').count(),0);
  assert.equal(await page.locator('video').getAttribute('preload'),'none');
  assert.ok(await page.locator('video').getAttribute('poster'));
  assert.equal(await page.locator('a[download][href$=".mp4"]').count(),1);
  assert.deepEqual(videos,[], '首页加载时不得请求视频');
  // Count visible body text with all FAQ expanded; excludes head/meta/JSON-LD,
  // includes every FAQ answer, so collapsed content cannot hide duplicate copy.
  await page.locator('.faq-list details').evaluateAll(nodes=>nodes.forEach(n=>{n.removeAttribute('name');n.open=true;}));
  assert.equal((await page.locator('body').innerText()).match(/无需注册/g)?.length,1);
  const faq=await page.evaluate(()=>[...document.querySelectorAll('.faq-list details')].map(d=>{
   const s=d.querySelector('summary').cloneNode(true);s.querySelectorAll('.faq-number,svg').forEach(n=>n.remove());
   const escape=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
   const html=n=>{if(n.nodeType===Node.TEXT_NODE)return escape(n.textContent);const children=[...n.childNodes].map(html).join('');return n.nodeName==='A'?`<a href="${escape(new URL(n.getAttribute('href'),document.querySelector('[rel="canonical"]').href).href)}">${children}</a>`:children;};
   return {'@type':'Question',name:s.textContent.replace(/\s+/g,' ').trim(),acceptedAnswer:{'@type':'Answer',text:html(d.querySelector('.faq-answer')).replace(/\s+/g,' ').trim()}};
  }));
  assert.equal(faq.length,3);
  assert.deepEqual(faq,await page.locator('#faq-schema').evaluate(n=>JSON.parse(n.textContent).mainEntity));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'横向溢出');
  // Each retained section rendered in Chromium, including demo state and backup guidance.
  for(const section of await page.locator('main > section').all()) {
   await section.scrollIntoViewIfNeeded();assert.ok(await section.isVisible());
  }
  await page.locator('#demo-next').click();await page.locator('#demo-next').click();
  assert.equal(await page.locator('#demo-answer').innerText(),'13');
  await page.locator('#demo-next').click();assert.equal(await page.locator('#demo-answer').innerText(),'?');
  assert.ok(await page.getByText('请提前到「学情」页 →「导出备份」，妥善保存备份文件。').isVisible());
  // All href/src attributes, including local fragments, SEO absolute URLs mapped to preview.
  const refs=await page.locator('[href],[src],[poster]').evaluateAll(nodes=>nodes.flatMap(n=>['href','src','poster'].map(a=>n.getAttribute(a)).filter(Boolean)));
  for(const ref of new Set(refs)) {
   if(ref.startsWith('#')) {assert.ok(await page.locator(`[id="${ref.slice(1)}"]`).count(),`Missing fragment ${ref}`);continue;}
   const u=new URL(ref,server.base+'/');
   if(['www.yanghat.cn','yanghat.cn'].includes(u.hostname))u.host=new URL(server.base).host,u.protocol='http:';
   if(u.origin!==server.base)continue;
   const res=await context.request.get(u.href);assert.ok(res.ok(),`${ref}: ${res.status()}`);await res.dispose();
  }
  assert.deepEqual(videos,[], '滚动查看全部板块后仍不预载视频');
  // H.264 playback is not asserted in ungoogled Chromium; keep zero-preload checks.
  // Real clicks at both viewports; clear persisted grade so each link must set it.
  for(let grade=1;grade<=6;grade++) {
   await page.goto(server.base);await page.evaluate(()=>localStorage.clear());
   const link=page.locator(`[data-grade="${grade}"]`);
   assert.equal(await link.getAttribute('href'),`/?practice=1&grade=${grade}`);
   const box=await link.boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height,`Grade ${grade} outside first viewport`);
   await link.click();
   const app=page.frameLocator('#practice-frame');
   await app.locator('#grade').waitFor();assert.equal(await app.locator('#grade').inputValue(),String(grade));
   assert.equal(new URL(page.url()).pathname,'/');assert.equal(new URL(page.url()).searchParams.get('grade'),String(grade));
   if(grade===1){await app.getByRole('button',{name:'学情',exact:true}).click();await app.getByRole('button',{name:'导出备份',exact:true}).waitFor();}
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(dialogs,[]);
  assertSameOriginMetrics(events,server.base);
  console.log(`PASS ${width}×${height}: 5板块、2主按钮、6年级首屏与iframe实点、唯一无需注册（展开FAQ）、视频零预载、FAQ一致、站内资源、无外发/错误/dialog/溢出；备份入口真实可达`);
  await context.close();
 }
}finally{await browser.close();await server.close();}
