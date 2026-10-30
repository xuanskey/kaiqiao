import {chromium} from 'playwright';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {homePreview} from './home-preview.mjs';
const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Specify before or after');
const server=await homePreview(process.env.HOME_PREVIEW_ROOT);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const exists=async p=>{try{await access(p);return true;}catch{return false;}};
const root='reports/home-simplify-shots';
try{
 await mkdir(root,{recursive:true});
 for(const [width,height]of [[375,812],[768,1024],[1280,800]]){
  const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});
  await page.goto(server.base);await page.evaluate(()=>document.fonts.ready);
  for(const [suffix,fullPage]of [['first',false],['full',true]]){
   const file=`${root}/${phase}-${width}-${suffix}.png`;
   if(phase==='after'||!await exists(file))await page.screenshot({path:file,fullPage,animations:'disabled'});
  }
  if(phase==='after'&&width===375){
   const inventory=await page.evaluate(()=>({sections:[...document.querySelectorAll('main > section')].map(s=>s.querySelector('h1,h2')?.innerText),entries:[...document.querySelectorAll('a[href*="practice=1"]')].map(a=>({text:a.textContent.replace(/\s+/g,' ').trim(),href:a.getAttribute('href'),primary:a.hasAttribute('data-primary-cta')})),registration:(document.body.innerText.match(/无需注册/g)||[]).length,registrationAllFAQ:(document.body.textContent.match(/无需注册/g)||[]).length,promoScenes:document.querySelectorAll('#promo-stage .scene').length,faq:document.querySelectorAll('.faq-list details').length,gradeDirectoryLinks:document.querySelectorAll('.hero a[href^="/grade/"]').length,footer:document.querySelector('.trust-footer').innerText}));
   await writeFile(`${root}/after-inventory.json`,JSON.stringify(inventory,null,2)+'\n');
  }
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${root}/${phase}-${width}-footer.png`,animations:'disabled'});
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Footer overflow '+width);
  if(phase==='after'){
   for(const pathname of ['/不存在的页','/grade/1/']){
    await page.goto(server.base+pathname);
    await page.screenshot({path:`${root}/${pathname.startsWith('/grade')?'grade1':'404'}-${width}.png`,fullPage:true,animations:'disabled'});
   }
  }
  await page.close();
 }
}finally{await browser.close();await server.close();}
