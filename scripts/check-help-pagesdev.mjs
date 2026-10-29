import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {access,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
const real=process.env.HELP_REAL_ONCE==='1';
const binary=process.env.WRANGLER || '/tmp/wrangler4/node_modules/.bin/wrangler';
const env={PATH:process.env.PATH,HOME:process.env.HOME};
let secret='';
if(real){secret=process.env.DEEPSEEK_API_KEY || '';if(!secret)throw Error('HELP_REAL_ONCE requires DEEPSEEK_API_KEY');env.CLOUDFLARE_INCLUDE_PROCESS_ENV='true';env.DEEPSEEK_API_KEY=secret;}
const safe=value=>secret?String(value).split(secret).join('[REDACTED]'):String(value);
const dir=await mkdtemp(join(tmpdir(),'help-pagesdev-'));
const cwd=fileURLToPath(new URL('../site/',import.meta.url));
const cacheDir=join(cwd,'.wrangler');
const hadCache=await access(cacheDir).then(()=>true,()=>false);
const base='http://127.0.0.1:8789';
const child=spawn(binary,['pages','dev','www.yanghat.cn','--port','8789','--d1','HELP_DB','--compatibility-date=2026-10-15','--persist-to',dir],{cwd,detached:true,stdio:['ignore','pipe','pipe'],env});
let exited=false,startError;
child.on('error',e=>{startError=e;});child.on('exit',()=>{exited=true;});
// Discard runtime output; only explicitly selected public results are printed.
child.stdout.resume();child.stderr.resume();
const request=(body={v:1,q:'怎么开始练习？'},extra={})=>({method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body),...extra});
async function check(response,status){assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('access-control-allow-origin'),null);if(status!==200)assert.equal(await response.text(),'');return response;}
try {
 let ready=false;
 for(let i=0;i<160;i++){if(exited||startError)break;try{const r=await fetch(base+'/api/help',{signal:AbortSignal.timeout(500)});if(r.status===405){ready=true;break;}}catch{}await delay(250);}
 if(!ready)throw Error('Local Pages dev failed to start'+(startError?.code?': '+startError.code:''));
 console.log('PASS help Pages dev ready with local D1');
 if(real){
  const started=Date.now();const r=await fetch(base+'/api/help',request({v:1,q:process.env.HELP_REAL_Q||'怎么备份练习记录？'}));const result=await r.json();
  console.log(safe(JSON.stringify({status:r.status,source:result.source,reason:result.reason,answer:String(result.answer??''),elapsedMs:Date.now()-started})));
  // `wrangler d1 execute --local` needs a config file naming the DB, so read the local D1 SQLite file directly.
  const {DatabaseSync}=await import('node:sqlite');const {readdir}=await import('node:fs/promises');
  const d1Dir=join(dir,'v3','d1','miniflare-D1DatabaseObject');
  const file=(await readdir(d1Dir)).find(name=>name.endsWith('.sqlite')&&name!=='metadata.sqlite');
  assert.ok(file,'Local D1 file missing');
  const db=new DatabaseSync(join(d1Dir,file),{readOnly:true});
  console.log(safe(JSON.stringify(db.prepare('SELECT day, micro FROM help_spend').all())));console.log(safe(JSON.stringify(db.prepare('SELECT minute, calls FROM help_minute').all())));db.close();
 }else{
  const r=await check(await fetch(base+'/api/help',request()),200);const body=await r.json();assert.equal(body.v,1);assert.equal(body.source,'fallback');assert.equal(body.reason,'unconfigured');assert.match(body.answer,/hello@yanghat.cn/);console.log('PASS valid help POST → unconfigured with D1 but no key');
  assert.equal((await check(await fetch(base+'/api/help'),405)).headers.get('allow'),'POST');
  await check(await fetch(base+'/api/help',request(undefined,{headers:{Origin:'https://other.example','Content-Type':'application/json'}})),403);
  await check(await fetch(base+'/api/help',request(undefined,{headers:{Origin:base,'Content-Type':'text/plain'}})),415);
  await check(await fetch(base+'/api/help',request(undefined,{body:'x'.repeat(2049)})),413);
  await check(await fetch(base+'/api/help',request({v:1})),400);console.log('PASS help 405/403/415/413/400, empty bodies and security headers');
  await check(await fetch(base+'/e',request({v:1,event:'visit',grade:null,count:1})),503);console.log('PASS /e remains 503 without binding');
  for(const path of ['/','/styles.css','/help.js','/help-config.js']){
   const response=await fetch(base+path);assert.equal(response.status,200,path);assert.equal(response.headers.get('x-content-type-options'),'nosniff',path);assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin',path);
   // _headers has no cache override for the two new JS files: Pages uses its native static policy.
   if(path==='/'||path==='/styles.css')assert.equal(response.headers.get('cache-control'),'no-cache',path);
   else assert.equal(response.headers.get('cache-control'),'public, max-age=0, must-revalidate',path);
   console.log(`PASS ${path} static headers match _headers and Pages defaults`);
  }
  const redirect=await fetch(base+'/练习',{redirect:'manual'});assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),'/?practice=1');console.log('PASS /练习 remains 301');
 }
}finally{
 if(child.pid){try{process.kill(-child.pid,'SIGTERM');}catch{}for(let i=0;i<20&&!exited;i++)await delay(100);try{process.kill(-child.pid,'SIGKILL');}catch{}}
 await rm(dir,{recursive:true,force:true});
 if(!hadCache)await rm(cacheDir,{recursive:true,force:true});
}
