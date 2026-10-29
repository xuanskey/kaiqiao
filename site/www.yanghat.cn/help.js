import endpoint from './help-config.js';
function initHelp() {
  if (!endpoint) return;
  if (new URLSearchParams(location.search).get('practice') === '1') return;
  const footer=document.querySelector('.trust-footer');
  if(!footer)return;
  const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
  const button=node('button','帮助');button.type='button';button.className='help-button';
  const dialog=node('dialog');dialog.className='help-dialog';dialog.setAttribute('aria-labelledby','help-title');
  const title=node('h2','AI 帮助');title.id='help-title';
  const badge=node('strong','AI 回答，仅供参考');
  const warning=node('p','请不要输入姓名、电话、学校、住址等个人信息');warning.id='help-warning';
  const form=node('form');const label=node('label','你的问题');label.htmlFor='help-question';
  const input=node('textarea');input.id='help-question';input.maxLength=300;input.required=true;input.setAttribute('aria-describedby','help-warning');
  const send=node('button','发送');send.type='submit';
  const answer=node('p');answer.setAttribute('role','status');answer.className='help-answer';
  const mail=node('a','找不到答案？发邮件到 hello@yanghat.cn');mail.href='mailto:hello@yanghat.cn';
  const close=node('button','关闭');close.type='button';
  form.append(label,input,send);dialog.append(title,badge,warning,form,answer,mail,close);footer.append(button);document.body.append(dialog);
  let active;
  button.addEventListener('click',()=>dialog.showModal());close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{active?.abort();active=undefined;input.value='';answer.textContent='';send.disabled=false;});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const q=input.value.trim();if(!q||send.disabled)return;
    const controller=new AbortController();active=controller;send.disabled=true;answer.textContent='小助手正在想…';
    try {
      const response=await fetch(endpoint,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({v:1,q}),signal:controller.signal});
      const data=await response.json();if(!response.ok||data.v!==1||typeof data.answer!=='string')throw Error();
      if(active===controller)answer.textContent=data.answer;
    }catch{if(active===controller)answer.textContent='暂时没能回答，请稍后再试，或发邮件到 hello@yanghat.cn。';}
    finally{if(active===controller){active=undefined;send.disabled=false;}}
  });
}
initHelp();
