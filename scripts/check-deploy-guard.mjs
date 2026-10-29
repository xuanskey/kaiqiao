import assert from 'node:assert/strict';
import {mkdtemp, mkdir,writeFile,readFile,rm,chmod,copyFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {checkSite} from './deploy-site.mjs';
import {writeManifest} from './build-manifest.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'deploy-guard-'));
const put=async(name,text)=>{const file=path.join(root,'site',name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,text);};
try{
 for(const name of ['functions/e.js','functions/api/help.js','www.yanghat.cn/_headers','www.yanghat.cn/_redirects','www.yanghat.cn/index.html','www.yanghat.cn/404.html'])await put(name,'');
 for(const name of ['help-config.js','metrics-config.js','_routes.json'])await put('www.yanghat.cn/'+name,await readFile('site/www.yanghat.cn/'+name,'utf8'));
 assert.equal(checkSite(root),true);
 await put('www.yanghat.cn/topup-open.js','// Baked from TOPUP_OPEN at release. Unset closes payment. Only the exact string true opens it.\nexport default false;\n');
 await put('www.yanghat.cn/topup/index.html','<p id="topup-closed">充值暂未开放</p><div id="pay-qr-slot"></div>');
 assert.equal(checkSite(root),true);
 await put('www.yanghat.cn/assets/wechat-pay-qr.png','x');
 assert.throws(()=>checkSite(root),/不得包含收款码/);
 await rm(path.join(root,'site/www.yanghat.cn/assets/wechat-pay-qr.png'));
 await put('www.yanghat.cn/topup/index.html','<img class="pay-qr" src="/assets/wechat-pay-qr.png">');
 assert.throws(()=>checkSite(root),/不得引用收款码/);
 await put('www.yanghat.cn/topup-open.js','// Baked from TOPUP_OPEN at release. Unset closes payment. Only the exact string true opens it.\nexport default true;\n');
 assert.throws(()=>checkSite(root),/缺少收款码/);
 await put('www.yanghat.cn/assets/wechat-pay-qr.png','x');
 assert.equal(checkSite(root),true);
 await rm(path.join(root,'site/www.yanghat.cn/assets/wechat-pay-qr.png'));
 await rm(path.join(root,'site/www.yanghat.cn/topup-open.js'));
 await rm(path.join(root,'site/www.yanghat.cn/topup/index.html'));
 for(const [name,content] of [['functions/e.js',null],['functions/api/help.js',null],['www.yanghat.cn/_routes.json','{"version":1,"include":["/e"],"exclude":[]}'],['www.yanghat.cn/_routes.json','{"version":1,"include":["/e","/api/help","/extra"],"exclude":[]}'],['www.yanghat.cn/_routes.json','{"version":1,"include":["/e","/api/help"],"exclude":["/e"]}'],['www.yanghat.cn/_routes.json','{"version":1,"include":["/api/help","/api/help"],"exclude":[]}'],['www.yanghat.cn/help-config.js','export default "https://evil.example";'],['www.yanghat.cn/help-config.js','export default "/api/help";'],['www.yanghat.cn/metrics-config.js','export default "/bad";'],['www.yanghat.cn/_headers',null]]){
  const file=path.join(root,'site',name),original=await readFile(file);if(content===null)await rm(file);else await writeFile(file,content);
  assert.throws(()=>checkSite(root));await writeFile(file,original);
 }
 const routesFile=path.join(root,'site/www.yanghat.cn/_routes.json'),savedRoutes=await readFile(routesFile);
 for(const ok of ['{"version":1,"include":["/api/help","/e"],"exclude":[]}','{"version":1,"include":["/e","/api/help"]}','{"version":1,"include":["/api/help","/e"]}','{"version":1,"include":["/e","/api/help","/e"]}']){
  await writeFile(routesFile,ok);assert.equal(checkSite(root),true,ok);
 }
 await writeFile(routesFile,savedRoutes);
 await mkdir(path.join(root,'scripts'));for(const f of ['deploy-site.mjs','build-manifest.mjs'])await copyFile('scripts/'+f,path.join(root,'scripts',f));
 await mkdir(path.join(root,'src'));await writeFile(path.join(root,'src/a.ts'),'export const a=1;\n');
 const commit=(msg)=>{execFileSync('git',['add','-A'],{cwd:root});execFileSync('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm',msg],{cwd:root});};
 execFileSync('git',['init','-q'],{cwd:root});writeManifest(root);commit('fixture');
 const fake=path.join(root,'wrangler'),record=path.join(root,'record.json');
 await writeFile(fake,`#!${process.execPath}\nconst fs=require('node:fs');if('DEEPSEEK_API_KEY' in process.env)process.exit(9);fs.writeFileSync(${JSON.stringify(record)},JSON.stringify({argv:process.argv.slice(2),cwd:process.cwd()}));\n`);await chmod(fake,0o755);
 const run=(args=[])=>spawnSync(process.execPath,[path.join(root,'scripts/deploy-site.mjs'),...args],{env:{...process.env,WRANGLER:fake,DEEPSEEK_API_KEY:'fake-for-test',DEPLOY_ALLOW_DIRTY:'0'},encoding:'utf8'});
 assert.equal(run(['--check']).status,0);await assert.rejects(readFile(record));
 assert.equal(run().status,0);assert.deepEqual(JSON.parse(await readFile(record,'utf8')),{argv:['pages','deploy','www.yanghat.cn','--project-name','yanghat-cn','--branch','main'],cwd:path.join(root,'site')});
 const refused=async(why,re)=>{await rm(record,{force:true});const r=run(['--check']);assert.notEqual(r.status,0,why);assert.match(r.stderr,re,why);assert.notEqual(run().status,0,why);await assert.rejects(readFile(record),why);};
 await put('www.yanghat.cn/index.html','dirty');await refused('产物未提交',/未提交/);
 commit('edit output after release');await refused('release 后改产物并提交',/产物摘要不符/);
 writeManifest(root);commit('re-release');assert.equal(run(['--check']).status,0);
 await writeFile(path.join(root,'src/a.ts'),'export const a=2;\n');await refused('源码未提交',/未提交/);
 commit('source change without release');await refused('源码改了没重新 release',/源码摘要不符/);
 writeManifest(root);commit('re-release 2');assert.equal(run(['--check']).status,0);
 const manifestFile=path.join(root,'site/build-manifest.json'),m=JSON.parse(await readFile(manifestFile,'utf8'));
 await writeFile(manifestFile,JSON.stringify({...m,switches:{...m.switches,topupOpen:true}}));commit('tamper switch');await refused('公开开关不一致',/开关/);
 await rm(manifestFile);commit('drop manifest');await refused('缺少清单',/build-manifest/);
 writeManifest(root);commit('re-release 3');
 const r=spawnSync(process.execPath,[path.join(root,'scripts/deploy-site.mjs'),'--check'],{env:{...process.env,DEPLOY_ALLOW_DIRTY:'1'},encoding:'utf8'});assert.equal(r.status,0);
 await writeFile(path.join(root,'src/a.ts'),'export const a=3;\n');
 assert.match(spawnSync(process.execPath,[path.join(root,'scripts/deploy-site.mjs'),'--check'],{env:{...process.env,DEPLOY_ALLOW_DIRTY:'1'},encoding:'utf8'}).stderr,/源码摘要不符/,'跳过已提交检查时仍核对清单');
 assert.doesNotMatch(await readFile(manifestFile,'utf8'),/fake-for-test|DEEPSEEK|TOKEN|SECRET/i,'清单不含密钥或环境变量');
 console.log('PASS 部署护栏：正常、坏路由与配置拒绝、include 集合与空 exclude、只检查、固定调用、密钥剔除、脏目录拒绝；构建清单：产物或源码在 release 后改动、开关不一致、缺清单均拒绝，跳过已提交检查时仍核对');
}finally{await rm(root,{recursive:true,force:true});}
