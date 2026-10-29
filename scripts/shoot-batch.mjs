// Local screenshots only. Ephemeral test signing key never leaves memory.
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';
import { testSigner } from './batch-fixtures.mjs';
import { emptyPersist, SAVE_KEY } from '../src/lib/math/save.ts';
import { enqueueReview, emptyReview, REVIEW_CONTENT_KEY, REVIEW_SCHEDULE_KEY } from '../src/lib/math/review.ts';
const output='/workspace/tmp/batch';await mkdir(output,{recursive:true});
const server=await homePreview();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(['data:','blob:'].includes(url.protocol))return route.continue();
    if(url.origin!==server.base)return route.abort();
    if(url.pathname==='/e')return route.fulfill({status:204,body:''});
    return route.continue();
  });
  const sign=await testSigner(context),page=await context.newPage();
  await page.goto(server.base,{waitUntil:'networkidle'});await page.screenshot({path:`${output}/home.png`});
  await page.locator('.trust-footer').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/footer.png`});
  await page.goto(server.base+'/404.html',{waitUntil:'networkidle'});await page.screenshot({path:`${output}/404.png`});
  await page.goto(server.base+'/topup/',{waitUntil:'networkidle'});await page.screenshot({path:`${output}/topup-closed.png`,fullPage:true});
  await context.route('**/topup-open.js',route=>route.fulfill({contentType:'application/javascript',body:'export default true;\n'}));
  await page.goto(server.base+'/topup/',{waitUntil:'networkidle'});await page.locator('#order-form button').click();
  await page.screenshot({path:`${output}/topup.png`,fullPage:true});
  const order=await page.evaluate(()=>JSON.parse(localStorage.getItem('kaiqiao.topup.v1')).orders[0]);
  await page.locator('#code').fill(await sign(order));await page.locator('#redeem-form button').click();
  await page.getByText('兑换成功，点数已存入本机余额。',{exact:true}).waitFor();await page.locator('#code').fill('');
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});});
  await page.screenshot({path:`${output}/topup-redeemed.png`,fullPage:true});
  // A normal saved review question; submit through the actual keypad and grading handler.
  const review=enqueueReview(emptyReview(),{chapterId:'warmup',prompt:'12 + 3 = ?',answer:'15',given:'0',explain:'相加',at:Date.now(),mode:'keypad'},Date.now()-86400000);
  await page.evaluate(({saveKey,save,contentKey,scheduleKey,review})=>{
    localStorage.setItem(saveKey,JSON.stringify(save));localStorage.setItem(contentKey,JSON.stringify(review.content));localStorage.setItem(scheduleKey,JSON.stringify(review.schedule));
  },{saveKey:SAVE_KEY,save:{...emptyPersist(),muted:true},contentKey:REVIEW_CONTENT_KEY,scheduleKey:REVIEW_SCHEDULE_KEY,review});
  await page.goto(server.base+'/?practice=1');const app=page.frameLocator('#practice-frame');
  await app.getByRole('button',{name:'错题本',exact:true}).click();await app.getByRole('button',{name:'开始今日复习',exact:true}).click();
  const keys=app.getByRole('group',{name:'数字键盘'});
  await keys.getByRole('button',{name:'1',exact:true}).click();await keys.getByRole('button',{name:'5',exact:true}).click();await keys.getByRole('button',{name:'确定',exact:true}).click();
  await app.locator('.pelican-correct').waitFor();
  await app.locator('.pelican-correct').evaluate(el=>{for(const animation of el.getAnimations({subtree:true})){animation.pause();animation.currentTime=300;}});
  await app.locator('.feedback-box').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/correct.png`});
  console.log('PASS six screenshots: home / correct / 404 / topup / topup-redeemed / footer (390×844, DPR 2; topup full-page)');
}finally{await browser.close();await server.close();}
