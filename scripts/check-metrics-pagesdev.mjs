import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const base='http://127.0.0.1:8788';
// cwd is site/: functions discovery follows the deployment directory.
const child=spawn('wrangler',['pages','dev','www.yanghat.cn','--port','8788','--ip','127.0.0.1','--compatibility-date=2026-10-15'],{cwd:fileURLToPath(new URL('../site/',import.meta.url)),detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
let exited=false,startError;
child.on('error',e=>{startError=e;});child.on('exit',()=>{exited=true;});
// Do not print runtime output, which may contain account configuration.
child.stdout.resume();child.stderr.resume();
try {
  let ready=false;
  for(let i=0;i<120;i++) {
    if(exited||startError)break;
    try{const r=await fetch(base+'/e',{signal:AbortSignal.timeout(500)});if(r.status===405){ready=true;break;}}catch{}
    await delay(250);
  }
  if(!ready)throw Error(`Pages dev could not start locally${startError?.code?': '+startError.code:''}; use check-metrics-backend.mjs as the build-only fallback`);
  console.log('PASS Pages dev ready');
  const post=await fetch(base+'/e',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({v:1,event:'visit',grade:null,count:1})});
  assert.equal(post.status,503);assert.equal(post.headers.get('cache-control'),'no-store');assert.equal(await post.text(),'');
  console.log('PASS POST /e → 503 without binding');
  const get=await fetch(base+'/e');assert.equal(get.status,405);assert.equal(get.headers.get('allow'),'POST');
  console.log('PASS GET /e → 405');
  for(const path of ['/','/styles.css','/robots.txt','/app/']) {
    const r=await fetch(base+path);
    assert.equal(r.status,200,path);
    assert.equal(r.headers.get('cache-control'),'no-cache',path);
    assert.equal(r.headers.get('x-content-type-options'),'nosniff',path);
    assert.equal(r.headers.get('referrer-policy'),'strict-origin-when-cross-origin',path);
    assert.equal(r.headers.get('x-robots-tag'),path==='/app/'?'noindex':null,path);
    console.log(`PASS ${path} static status and four headers`);
  }
  const redirect=await fetch(base+'/练习',{redirect:'manual'});
  assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),'/?practice=1');
  console.log('PASS /练习 → 301 /?practice=1');
  const missing=await fetch(base+'/no-such-page-metrics-check');
  assert.equal(missing.status,404);assert.match(await missing.text(),/<html/i);
  console.log('PASS unknown path still served by static 404.html');
  // Real browser: default page sends nothing; the shipped client's exact request passes validation (503 = no local AE binding).
  const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
  try {
    const page=await browser.newPage();
    const seen=[];
    page.on('request',r=>{if(new URL(r.url()).pathname==='/e')seen.push(r);});
    await page.goto(base+'/',{waitUntil:'networkidle'});
    assert.equal(seen.length,0,'default-off homepage must not call /e');
    console.log('PASS default homepage sends 0 /e requests');
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/e');
    await page.evaluate(async()=>{const {createTracker}=await import('/metrics.js');createTracker('/e')('grade_select',3);});
    const r=await response;
    assert.equal(r.status(),503,'browser request must pass every validation step');
    const sent=r.request();
    assert.equal(sent.postData(),JSON.stringify({v:1,event:'grade_select',grade:3,count:1}));
    const h=await sent.allHeaders();
    assert.equal(h.cookie,undefined);assert.equal(h.referer,undefined);
    console.log('PASS browser client request passes validation (503 without binding), no cookie/referer');
  } finally {await browser.close();}
} finally {
  if(child.pid){
    try{process.kill(-child.pid,'SIGTERM');}catch{}
    for(let i=0;i<20&&!exited;i++)await delay(100);
    // Descendants can survive their parent; always clean the process group.
    try{process.kill(-child.pid,'SIGKILL');}catch{}
  }
}
