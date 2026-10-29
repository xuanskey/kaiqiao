// Read-only measurement; Lighthouse is npm-exec cached under /tmp, never a repo dependency.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {homePreview} from './home-preview.mjs';
const phase=process.argv[2];if(!['before','after'].includes(phase))throw Error('Specify before/after');
const root=phase==='before'?'/tmp/kaiqiao-main-home-17a2502/site/www.yanghat.cn':undefined;
const server=await homePreview(root);
try{
 await mkdir('reports/lighthouse',{recursive:true});
 for(const mode of ['mobile','desktop']){
  const output=`/tmp/kaiqiao-lighthouse-${phase}-${mode}.json`;
  const args=['exec','--cache','/tmp/kaiqiao-lighthouse-cache','--yes','--package=lighthouse','--','lighthouse',server.base+'/',`--output-path=${output}`,'--output=json','--quiet','--only-categories=performance,accessibility,best-practices,seo','--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage --disable-background-networking'];
  if(mode==='desktop')args.push('--preset=desktop');
  console.log(`Measuring ${phase} ${mode}`);
  const code=await new Promise((resolve,reject)=>{const child=spawn('npm',args,{stdio:'inherit',env:{...process.env,CHROME_PATH:process.env.CHROMIUM_PATH||'/opt/ungoogled-chromium/chrome'}});child.on('error',reject);child.on('exit',resolve);});
  if(code!==0)throw Error(`Lighthouse ${phase}/${mode} exit ${code}`);
  const r=JSON.parse(await readFile(output,'utf8'));
  const summary={phase,mode,baseline:phase==='before'?'17a25022bf02997f99564820c0b9f92a25bf8bca':'working branch',lighthouseVersion:r.lighthouseVersion,fetchTime:r.fetchTime,userAgent:r.userAgent,configSettings:r.configSettings,scores:Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,Math.round(v.score*100)])),issues:Object.values(r.audits).filter(a=>a.score!==null&&a.score<1).map(a=>({id:a.id,title:a.title,score:a.score,displayValue:a.displayValue,description:a.description,details:a.details}))};
  await writeFile(`reports/lighthouse/${phase}-${mode}.json`,JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify(summary.scores));
 }
}finally{await server.close();}
