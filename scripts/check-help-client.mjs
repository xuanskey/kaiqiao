import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
const client=await readFile('site/www.yanghat.cn/help.js','utf8');
for(const endpoint of ['', 'https://evil.example', '//evil.example', '/api/help?x=1', '/api/help/', null, 1]){
 vm.runInNewContext(client.replace("import endpoint from './help-config.js';",''),{endpoint,document:{querySelector(){assert.fail('非法端点渲染了按钮');}},fetch(){assert.fail('非法端点发送了请求');}});
}
console.log('PASS 非法端点不渲染、不请求');
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const root=path.resolve('site/www.yanghat.cn');
async function build(enabled){await new Promise((resolve,reject)=>{const child=spawn('npm',['run','release'],{stdio:'ignore',env:enabled===undefined?{...process.env}:{...process.env,VITE_HELP_ENDPOINT:enabled?'/api/help':''}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('release failed: '+code)));});}
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));assert.ok(!path.relative(root,file).startsWith('..'));if((await stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
let browser;
try {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 for(const enabled of [false,true]){
  await build(enabled);
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  let calls=0;
  await context.route('**/*',async route=>{const r=route.request(),url=new URL(r.url());if(url.origin!==base){await route.abort();throw Error('External request blocked');}if(url.pathname==='/api/help'){calls++;assert.equal(r.method(),'POST');assert.deepEqual(r.postDataJSON(),{v:1,q:'怎么开始练习？'});const h=await r.allHeaders();assert.equal(h.cookie,undefined);assert.equal(h.referer,undefined);await new Promise(resolve=>setTimeout(resolve,80));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({v:1,source:'fallback',reason:'busy',answer:'<b>请点开始练习</b>'})});}return route.continue();});
  try{
   const page=await context.newPage();await context.addCookies([{name:'help-test',value:'omit-me',url:base}]);
   const verify=async target=>{
    const button=target.getByRole('button',{name:'帮助',exact:true});
    if(!enabled){assert.equal(await button.count(),0);return;}
    await button.click();const dialog=target.getByRole('dialog');await dialog.getByLabel('你的问题').fill('怎么开始练习？');
    const sent=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/help');await dialog.getByRole('button',{name:'发送',exact:true}).click();assert.ok(await dialog.getByRole('button',{name:'发送',exact:true}).isDisabled());await sent;
    await dialog.getByRole('status').filter({hasText:'<b>请点开始练习</b>'}).waitFor();assert.equal(await dialog.locator('b').count(),0);
    await dialog.getByRole('button',{name:'关闭',exact:true}).click();await button.click();assert.equal(await dialog.getByLabel('你的问题').inputValue(),'');assert.equal(await dialog.getByRole('status').innerText(),'');await page.keyboard.press('Escape');
   };
   await page.goto(base+'/',{waitUntil:'networkidle'});await verify(page);
   await page.goto(base+'/?practice=1',{waitUntil:'networkidle'});assert.equal(await page.getByRole('button',{name:'帮助',exact:true}).count(),0);const app=page.frameLocator('iframe');await app.getByRole('main').waitFor();await verify(app);
   assert.equal(calls,enabled?2:0);console.log(`PASS ${enabled?'enabled homepage/application, exact private request, plain text, close clears':'default homepage/application: zero buttons and requests'}`);
  }finally{await context.close();}
 }
}finally{
 await browser?.close();await new Promise(resolve=>server.close(resolve));await build();
 console.log('PASS restored default release artifacts');
}
