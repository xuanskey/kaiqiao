import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { homePreview } from './home-preview.mjs';
const source = await readFile('site/www.yanghat.cn/sw-practice.js','utf8');
assert.match(source,/request.method !== "GET" \|\| request.mode !== "navigate"/);
assert.match(source,/url.pathname !== "\/" \|\| url.searchParams.get\("practice"\) !== "1"/);
assert.doesNotMatch(source,/caches\.|fetch\(/);
const preview = await homePreview();
const seen=[];
const server=http.createServer(async(req,res)=>{
  if(['/api/help','/e','/topup'].includes(req.url)){
    seen.push(`${req.method} ${req.url}`);req.resume();
    res.setHeader('Content-Type','text/plain');res.end('network '+req.url);return;
  }
  const upstream=await fetch(preview.base+req.url);res.writeHead(upstream.status,Object.fromEntries(upstream.headers));res.end(Buffer.from(await upstream.arrayBuffer()));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try{
  const page=await browser.newPage();await page.goto(base+'/404.html');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw-practice.js');await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  for(const target of ['/api/help','/e','/topup']){
    const result=await page.evaluate(async p=>{const r=await fetch(p,{method:'POST',body:'{}'});return r.text();},target);
    assert.equal(result,'network '+target);
  }
  await page.goto(base+'/topup');assert.equal(await page.locator('body').innerText(),'network /topup');
  assert.deepEqual(seen,['POST /api/help','POST /e','POST /topup','GET /topup']);
  assert.deepEqual(await page.evaluate(async()=>{const paths=[];for(const key of await caches.keys())for(const req of await (await caches.open(key)).keys())paths.push(new URL(req.url).pathname);return paths.filter(p=>['/api/help','/e','/topup'].includes(p));}),[]);
  console.log('PASS root SW static boundaries and real network POST help/e/topup, GET topup, no sensitive cache');
}finally{await browser.close();await new Promise(r=>server.close(r));await preview.close();}
