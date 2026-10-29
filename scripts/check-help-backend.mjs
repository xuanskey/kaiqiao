import assert from 'node:assert/strict';
import {access,readFile,mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {onRequest} from '../site/functions/api/help.js';
const forbidden=/console\.|cf-connecting-ip|x-forwarded-for|user-agent|cookie|referer|\.cf/i;
assert.deepEqual(JSON.parse(await readFile('site/www.yanghat.cn/_routes.json','utf8')),{version:1,include:['/e','/api/help'],exclude:[]});
for(const path of ['functions','wrangler.toml','wrangler.json','wrangler.jsonc','site/wrangler.toml','site/wrangler.json','site/wrangler.jsonc'])await assert.rejects(access(path),{code:'ENOENT'});
const helpExports=[...(await readFile('site/www.yanghat.cn/help-config.js','utf8')).matchAll(/^export default .*;$/gm)].map(match=>match[0]);
assert.equal(helpExports.length,1);
assert.ok(helpExports[0]==='export default "";'||helpExports[0]==='export default "/api/help";',helpExports[0]);
assert.match(await readFile('site/www.yanghat.cn/index.html','utf8'),/<script type="module" src="\/help.js"><\/script>/);
assert.match(await readFile('site/www.yanghat.cn/help.js','utf8'),/if \(!endpoint\) return;/);
for(const file of await readdir('workers/help'))assert.doesNotMatch(await readFile('workers/help/'+file,'utf8'),forbidden);
assert.doesNotMatch(await readFile('site/functions/api/help.js','utf8'),forbidden);
console.log('PASS help deployment boundaries, help-config switch and privacy');
const dir=await mkdtemp(join(tmpdir(),'help-build-'));
try {
 const r=spawnSync('wrangler',['pages','functions','build','site/functions','--outdir',dir,'--output-routes-path',join(dir,'routes.json')],{encoding:'utf8',env:{PATH:process.env.PATH,HOME:process.env.HOME,WRANGLER_SEND_METRICS:'false'}});
 if(r.error?.code==='ENOENT')console.log('SKIP functions build: global wrangler unavailable');
 else {assert.equal(r.status,0,r.stderr);const routes=JSON.parse(await readFile(join(dir,'routes.json'),'utf8'));assert.deepEqual(routes.include.sort(),['/api/help','/e']);assert.deepEqual(routes.exclude,[]);let count=0;async function scan(path){for(const f of await readdir(path,{withFileTypes:true})){const next=join(path,f.name);if(f.isDirectory())await scan(next);else if(/\.m?js$/.test(f.name)){count++;assert.doesNotMatch(await readFile(next,'utf8'),forbidden);}}}await scan(dir);assert.ok(count);console.log('PASS help bundled routes and privacy');}
}finally{await rm(dir,{recursive:true,force:true});}
function request(body){return new Request('https://www.yanghat.cn/api/help',{method:'POST',headers:{Origin:'https://www.yanghat.cn','Content-Type':'application/json'},body:JSON.stringify(body)});}
assert.equal((await (await onRequest({request:request({v:1,q:'怎么开始？'}),env:{}})).json()).reason,'unconfigured');
const bad=await onRequest({request:request({v:1}),env:{}});assert.equal(bad.status,400);assert.equal(await bad.text(),'');
console.log('PASS help direct Pages entry accept/reject');
