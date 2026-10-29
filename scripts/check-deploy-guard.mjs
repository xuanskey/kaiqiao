import assert from 'node:assert/strict';
import {mkdtemp, mkdir,writeFile,readFile,rm,chmod,copyFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {checkSite} from './deploy-site.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'deploy-guard-'));
const put=async(name,text)=>{const file=path.join(root,'site',name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,text);};
try{
 for(const name of ['functions/e.js','functions/api/help.js','www.yanghat.cn/_headers','www.yanghat.cn/_redirects','www.yanghat.cn/index.html','www.yanghat.cn/404.html'])await put(name,'');
 for(const name of ['help-config.js','metrics-config.js','_routes.json'])await put('www.yanghat.cn/'+name,await readFile('site/www.yanghat.cn/'+name,'utf8'));
 assert.equal(checkSite(root),true);
 for(const [name,content] of [['functions/e.js',null],['functions/api/help.js',null],['www.yanghat.cn/_routes.json','{"version":1,"include":["/e"],"exclude":[]}'],['www.yanghat.cn/_routes.json','{"version":1,"include":["/e","/api/help","/extra"],"exclude":[]}'],['www.yanghat.cn/help-config.js','export default "https://evil.example";'],['www.yanghat.cn/help-config.js','export default "/api/help";'],['www.yanghat.cn/metrics-config.js','export default "/bad";'],['www.yanghat.cn/_headers',null]]){
  const file=path.join(root,'site',name),original=await readFile(file);if(content===null)await rm(file);else await writeFile(file,content);
  assert.throws(()=>checkSite(root));await writeFile(file,original);
 }
 execFileSync('git',['init','-q'],{cwd:root});execFileSync('git',['add','.'],{cwd:root});execFileSync('git',['-c','user.name=Codex','-c','user.email=codex@openai.com','commit','-qm','fixture'],{cwd:root});
 await mkdir(path.join(root,'scripts'));await copyFile('scripts/deploy-site.mjs',path.join(root,'scripts/deploy-site.mjs'));
 const fake=path.join(root,'wrangler'),record=path.join(root,'record.json');
 await writeFile(fake,`#!${process.execPath}\nconst fs=require('node:fs');if('DEEPSEEK_API_KEY' in process.env)process.exit(9);fs.writeFileSync(${JSON.stringify(record)},JSON.stringify({argv:process.argv.slice(2),cwd:process.cwd()}));\n`);await chmod(fake,0o755);
 const run=(args=[])=>spawnSync(process.execPath,[path.join(root,'scripts/deploy-site.mjs'),...args],{env:{...process.env,WRANGLER:fake,DEEPSEEK_API_KEY:'fake-for-test',DEPLOY_ALLOW_DIRTY:'0'},encoding:'utf8'});
 assert.equal(run(['--check']).status,0);await assert.rejects(readFile(record));
 assert.equal(run().status,0);assert.deepEqual(JSON.parse(await readFile(record,'utf8')),{argv:['pages','deploy','www.yanghat.cn','--project-name','yanghat-cn','--branch','main'],cwd:path.join(root,'site')});
 await put('www.yanghat.cn/index.html','dirty');assert.notEqual(run().status,0);
 console.log('PASS 部署护栏：正常、八类拒绝、只检查、固定调用、密钥剔除、脏目录拒绝');
}finally{await rm(root,{recursive:true,force:true});}
