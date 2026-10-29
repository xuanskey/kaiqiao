import assert from 'node:assert/strict';
import {access, readFile, mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {onRequest} from '../site/functions/e.js';
const forbidden=/console\.|CF-Connecting-IP|x-forwarded-for|user-agent|cookie|referer|\.cf/i;
assert.deepEqual(JSON.parse(await readFile('site/www.yanghat.cn/_routes.json','utf8')),{version:1,include:['/e'],exclude:[]});
for(const path of ['functions','_worker.js','wrangler.toml','wrangler.json','wrangler.jsonc','site/wrangler.toml','site/wrangler.json','site/wrangler.jsonc','site/www.yanghat.cn/_worker.js']) {
  await assert.rejects(access(path),{code:'ENOENT'});
}
for(const path of ['workers/metrics/handler.js','site/functions/e.js']) assert.doesNotMatch(await readFile(path,'utf8'),forbidden);
console.log('PASS explicit /e route, deployment boundaries and source privacy');
const dir=await mkdtemp(join(tmpdir(),'metrics-build-'));
try {
  const result=spawnSync('wrangler',['pages','functions','build','site/functions','--outdir',dir,'--output-routes-path',join(dir,'routes.json')],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
  if(result.error?.code==='ENOENT') console.log('SKIP functions build: global wrangler unavailable');
  else {
    assert.equal(result.status,0,result.stderr);
    const routes=JSON.parse(await readFile(join(dir,'routes.json'),'utf8'));
    assert.deepEqual(routes.include,['/e']);assert.deepEqual(routes.exclude,[]);
    let bundles=0;
    async function inspect(path) {for(const file of await readdir(path,{withFileTypes:true})) {
      const next=join(path,file.name);
      if(file.isDirectory()) await inspect(next);
      else if(/\.m?js$/.test(file.name)){bundles++;assert.doesNotMatch(await readFile(next,'utf8'),forbidden);}
    }}
    await inspect(dir);assert.ok(bundles>0);
    console.log('PASS wrangler bundle and generated routes');
  }
} finally {await rm(dir,{recursive:true,force:true});}
const points=[];
const env={METRICS:{writeDataPoint(p){points.push(p);}}};
const request=new Request('https://www.yanghat.cn/e',{method:'POST',headers:{Origin:'https://www.yanghat.cn','Content-Type':'application/json'},body:JSON.stringify({v:1,event:'visit',grade:null,count:1})});
assert.equal((await onRequest({request,env})).status,204);
assert.deepEqual(points,[{indexes:['visit'],blobs:['visit','none','prod'],doubles:[1]}]);
assert.equal((await onRequest({request:new Request('https://www.yanghat.cn/e'),env})).status,405);
assert.equal(points.length,1);
console.log('PASS direct Pages entry accept/reject');
