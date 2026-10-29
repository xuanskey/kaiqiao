import endpoint from './help-config.js';
function trimHelpHistory(history, question) {
  const messages = [...history, {role:'user',content:question.trim()}];
  while (messages.length > 12 || messages.reduce((sum,item)=>sum+Array.from(item.content).length,0) > 2000 || new TextEncoder().encode(JSON.stringify({v:2,messages})).byteLength > 8000) {
    if (messages.length === 1) break;
    messages.splice(0,2);
  }
  return messages;
}
function initHelp() {
  if (endpoint !== '/api/help') return;
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
  const log=node('ol');log.className='help-log';log.setAttribute('aria-label','对话记录');
  const reset=node('button','清空对话');reset.type='button';
  const mail=node('a','找不到答案？发邮件到 hello@yanghat.cn');mail.href='mailto:hello@yanghat.cn';
  const close=node('button','关闭');close.type='button';
  form.append(label,input,send);dialog.append(title,badge,warning,form,log,reset,answer,mail,close);footer.append(button);document.body.append(dialog);
  let active, history=[];
  button.addEventListener('click',()=>dialog.showModal());close.addEventListener('click',()=>dialog.close());
  const clear=()=>{active?.abort();active=undefined;input.value='';answer.textContent='';send.disabled=false;history=[];log.replaceChildren();};
  dialog.addEventListener('close',clear);reset.addEventListener('click',clear);
  form.addEventListener('submit',async event=>{
    event.preventDefault();const q=input.value.trim();if(!q||send.disabled)return;
    const messages=trimHelpHistory(history,q);
    const controller=new AbortController();active=controller;send.disabled=true;answer.textContent='小助手正在想…';
    try {
      const response=await fetch('/api/help',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({v:2,messages}),signal:controller.signal});
      const data=await response.json();if(!response.ok||data.v!==1||typeof data.answer!=='string'||!['ai','fallback'].includes(data.source))throw Error();
      if(active===controller){
        answer.textContent=data.answer;input.value='';
        if(data.source==='ai'){
          history=[...messages,{role:'assistant',content:data.answer}];
          log.replaceChildren(...history.map(item=>node('li',(item.role==='user'?'我：':'小助手：')+item.content)));
        }
      }
    }catch{if(active===controller)answer.textContent='暂时没能回答，请稍后再试，或发邮件到 hello@yanghat.cn。';}
    finally{if(active===controller){active=undefined;send.disabled=false;}}
  });
}
initHelp();
