// Build-time only: import existing catalogs; never modify curriculum or application routing.
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import {loadEnv} from 'vite';
import {syncPayQr, resolveTopupOpen, bakeTopupHtml} from './topup-pay-qr.mjs';
import {PEP_MATH,JK_SCIENCE,resolveUnits} from '../src/lib/lesson/curriculum.ts';
import {DEMOS} from '../src/lib/lesson/demos.ts';
const root='site/www.yanghat.cn';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=['一','二','三','四','五','六'];
for(let grade=1;grade<=6;grade++){
 const title=`小学${names[grade-1]}年级数学与科学目录｜养习开窍`;
 const description=`浏览小学${names[grade-1]}年级上下册单元及互动课，参考人教版、教科版目录编排；请选择学校实际进度，目录对应尚需逐课核对。`;
 const canonical=`https://www.yanghat.cn/grade/${grade}/`;
 let content='';
 for(const [edition,label]of [[PEP_MATH,'数学'],[JK_SCIENCE,'科学']])for(const term of ['上','下']){
  const resolved=resolveUnits(edition,grade,term);
  content+=`<section aria-labelledby="${edition.id}-${term}"><h2 id="${edition.id}-${term}">${label} · ${term}册</h2><p>${escape(resolved.from.name)} · 参考目录，未逐课核实</p>`;
  if(resolved.fallbackNote)content+=`<p class="catalog-note">${escape(resolved.fallbackNote)}</p>`;
  content+=resolved.units.length?'<ul class="catalog-list">'+resolved.units.map(u=>`<li><a href="/?practice=1&amp;grade=${grade}">${escape(u.title)}</a>${u.demos?.length?`<p>可用互动课：${u.demos.map(d=>escape(DEMOS[d].title)).join('、')}</p>`:'<p>目录参考项；不代表已有独立互动课，可进入后查看本年级练习。</p>'}</li>`).join('')+'</ul>':'<p>本册暂未收录互动实验，请在应用内查看当前年级可用内容。</p>';
  content+='</section>';
 }
 const html=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://www.yanghat.cn/assets/og-cover-20261029.jpg"><meta property="og:image:alt" content="养习开窍小学数学练习"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="https://www.yanghat.cn/assets/og-cover-20261029.jpg"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css?v=20261029"></head>
<body><a class="skip-link" href="#main">跳到主要内容</a><header class="site-header"><nav class="container navigation" aria-label="主导航"><a class="brand" href="/">养习 · 开窍</a><a class="text-link" href="/">返回首页</a></nav></header><main id="main" class="container document-page" tabindex="-1"><h1>${names[grade-1]}年级目录</h1><p>${description}屏幕实验不能代替真实动手实验。</p><nav class="grade-directory-links" aria-label="其他年级">${names.map((n,i)=>`<a href="/grade/${i+1}/"${i+1===grade?' aria-current="page"':''}>${n}年级目录</a>`).join('')}</nav><a class="text-link" href="/?practice=1&amp;grade=${grade}">进入${names[grade-1]}年级练习</a>${content}</main><footer class="site-footer"><div class="container trust-footer"><p>不收集个人信息，练习记录只保存在本机；客服提问发送前会自动隐去疑似姓名电话等，请勿填写。</p><a href="mailto:hello@yanghat.cn?subject=%E5%BC%80%E7%AA%8D%E5%8F%8D%E9%A6%88">意见反馈：hello@yanghat.cn</a></div></footer></body></html>\n`;
 await mkdir(`${root}/grade/${grade}`,{recursive:true});await writeFile(`${root}/grade/${grade}/index.html`,html);
}
await writeFile(`${root}/robots.txt`,'User-agent: *\nAllow: /\nSitemap: https://www.yanghat.cn/sitemap.xml\n');
await writeFile(`${root}/sitemap.xml`,'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+['/',...names.map((_,i)=>`/grade/${i+1}/`)].map(p=>`  <url><loc>https://www.yanghat.cn${p}</loc></url>`).join('\n')+'\n</urlset>\n');
await copyFile('public/metrics.js',`${root}/metrics.js`);
// Same resolution as `vite build`: .env.production, with an existing shell variable winning (including an empty override).
const endpoint=loadEnv('production',process.cwd(),'VITE_').VITE_EVENT_ENDPOINT??'';
if(endpoint&&endpoint!=='/e')throw Error('Only the same-origin /e endpoint can be enabled');
await writeFile(`${root}/metrics-config.js`,`// Baked from VITE_EVENT_ENDPOINT at release (.env.production, shell overrides). Empty disables.\nexport default ${JSON.stringify(endpoint)};\n`);
console.log(`Generated six grade pages, robots/sitemap and metrics config ${endpoint||'(off)'}`);

// AI help: same resolution as metrics; default off (not set in .env.production).
const helpEndpoint=loadEnv('production',process.cwd(),'VITE_').VITE_HELP_ENDPOINT??'';
if(helpEndpoint!==''&&helpEndpoint!=='/api/help')throw Error('Only the same-origin /api/help endpoint can be enabled');
await writeFile(`${root}/help-config.js`,`// Baked from VITE_HELP_ENDPOINT at release (.env.production, shell overrides). Empty disables.\nexport default ${JSON.stringify(helpEndpoint)};\n`);
// 客服网页发送前脱敏与服务端用同一份规则：发布时原样复制，测试校验两者一致。
await copyFile('workers/help/pii.js',`${root}/help-pii.js`);
console.log(`Help config ${helpEndpoint||'(off)'}`);

// Top-up payment UI. Unset closes payment. Only the exact string true opens it.
const topupOpen=resolveTopupOpen(process.env.TOPUP_OPEN);
await writeFile(`${root}/topup-open.js`,`// Baked from TOPUP_OPEN at release. Unset closes payment. Only the exact string true opens it.\nexport default ${topupOpen};\n`);
await syncPayQr(topupOpen, root);
await writeFile(`${root}/topup/index.html`,bakeTopupHtml(await readFile(`${root}/topup/index.html`,'utf8'),topupOpen));
console.log(`Top-up payment ${topupOpen?'open':'closed'}`);
