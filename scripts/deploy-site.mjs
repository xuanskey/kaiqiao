import {readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {SOURCE_PATHS,verifyManifest} from './build-manifest.mjs';

// 只读取给定根目录；不访问环境、不启动进程、不修改文件。
export function checkSite(root) {
  const file=name=>path.join(root,'site',name);
  const requireFile=name=>{try{if(statSync(file(name)).isFile())return;}catch{}throw Error(`缺少普通文件：site/${name}`);};
  for(const name of ['functions/e.js','functions/api/help.js','www.yanghat.cn/_headers','www.yanghat.cn/_redirects','www.yanghat.cn/index.html','www.yanghat.cn/404.html'])requireFile(name);
  let routes;try{routes=JSON.parse(readFileSync(file('www.yanghat.cn/_routes.json'),'utf8'));}catch{throw Error('_routes.json 无法解析');}
  const include=routes?.include;
  const includeSet=new Set(Array.isArray(include)?include:[]);
  const includeExact=Array.isArray(include)&&includeSet.size===2&&includeSet.has('/e')&&includeSet.has('/api/help')&&include.every(item=>item==='/e'||item==='/api/help');
  const exclude=routes?.exclude;
  const excludeOk=exclude===undefined||(Array.isArray(exclude)&&exclude.length===0);
  if(routes?.version!==1||!includeExact||!excludeOk)throw Error('_routes.json 路由不符合部署要求');
  for(const [name,variable,endpoint] of [['help','VITE_HELP_ENDPOINT','/api/help'],['metrics','VITE_EVENT_ENDPOINT','/e']]){
    const expected=value=>`// Baked from ${variable} at release (.env.production, shell overrides). Empty disables.\nexport default ${JSON.stringify(value)};\n`;
    let content;try{content=readFileSync(file(`www.yanghat.cn/${name}-config.js`),'utf8');}catch{throw Error(`${name}-config.js 缺失`);}
    if(content!==expected('')&&content!==expected(endpoint))throw Error(`${name}-config.js 格式或端点非法，请重新 release`);
  }
  let topupOpenText='';
  try{topupOpenText=readFileSync(file('www.yanghat.cn/topup-open.js'),'utf8');}catch{topupOpenText='';}
  if(topupOpenText){
    const topupOpen=topupOpenText.includes('export default true');
    let payQr=false;try{payQr=statSync(file('www.yanghat.cn/assets/wechat-pay-qr.png')).isFile();}catch{payQr=false;}
    if(topupOpen!==payQr)throw Error(topupOpen?'收款已打开但发布目录缺少收款码':'收款关闭时发布目录不得包含收款码');
    if(!topupOpen){
      let html='';try{html=readFileSync(file('www.yanghat.cn/topup/index.html'),'utf8');}catch{html='';}
      if(html.includes('wechat-pay-qr')||html.includes('class="pay-qr"'))throw Error('收款关闭时页面不得引用收款码');
    }
  }
  return true;
}
export function deploy(root,args=[]) {
  try {
    if(args.some(arg=>arg!=='--check'))throw Error('仅支持 --check 参数，部署目标不可覆盖');
    checkSite(root);
    if(process.env.DEPLOY_ALLOW_DIRTY==='1')console.warn('警告：已跳过 site/ 与源码的已提交检查（构建清单仍核对）');
    else if(execFileSync('git',['status','--porcelain','--','site/',...SOURCE_PATHS],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim())throw Error('site/ 或源码有未提交改动');
    // 产物必须由当前源码构建且之后未被改动、公开开关与构建时一致（site/build-manifest.json）。
    const manifest=verifyManifest(root);
    console.log(`构建清单一致：开关 ${JSON.stringify(manifest.switches)}`);
    const argv=['pages','deploy','www.yanghat.cn','--project-name','yanghat-cn','--branch','main'];
    if(args.includes('--check')){console.log('检查通过');console.log('将在 site/ 执行：wrangler '+argv.join(' '));return 0;}
    const env={...process.env};delete env.DEEPSEEK_API_KEY;
    env.CLOUDFLARE_ACCOUNT_ID ||= 'c2ed124638eb30a36bdefa44b7a6faef';
    const result=spawnSync(process.env.WRANGLER||'/tmp/wrangler4/node_modules/.bin/wrangler',argv,{cwd:path.join(root,'site'),env,stdio:'inherit'});
    if(result.error)throw Error('无法启动 wrangler');
    return result.status??1;
  }catch(error){console.error('部署检查失败：'+error.message);return 1;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=deploy(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),process.argv.slice(2));
