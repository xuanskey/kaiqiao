import {useEffect, useRef, useState} from 'react';
import {askHelp, helpEndpoint} from '@/lib/help';
export function HelpDialog() {
  const dialog=useRef<HTMLDialogElement>(null);
  const active=useRef<AbortController | null>(null);
  const [q,setQ]=useState(''),[answer,setAnswer]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>()=>{active.current?.abort();},[]);
  if(!helpEndpoint)return null;
  const clear=()=>{active.current?.abort();active.current=null;setQ('');setAnswer('');setBusy(false);};
  return <>
    <button type="button" className="help-button" onClick={()=>dialog.current?.showModal()}>帮助</button>
    <dialog ref={dialog} className="help-dialog" aria-labelledby="app-help-title" onClose={clear}>
      <h2 id="app-help-title">AI 帮助</h2>
      <strong>AI 回答，仅供参考</strong>
      <p id="app-help-warning">请不要输入姓名、电话、学校、住址等个人信息</p>
      <form onSubmit={async e=>{
        e.preventDefault();if(!q.trim()||busy)return;
        const controller=new AbortController();active.current=controller;setBusy(true);setAnswer('小助手正在想…');
        try {const text=await askHelp(q,controller.signal);if(active.current===controller)setAnswer(text);}
        catch {if(active.current===controller)setAnswer('暂时没能回答，请稍后再试，或发邮件到 hello@yanghat.cn。');}
        finally {if(active.current===controller){active.current=null;setBusy(false);}}
      }}>
        <label htmlFor="app-help-question">你的问题</label>
        <textarea id="app-help-question" aria-describedby="app-help-warning" maxLength={300} required value={q} onChange={e=>setQ(e.target.value)} />
        <button type="submit" disabled={busy}>发送</button>
      </form>
      <p role="status" className="help-answer">{answer}</p>
      <a href="mailto:hello@yanghat.cn">找不到答案？发邮件到 hello@yanghat.cn</a>
      <button type="button" onClick={()=>dialog.current?.close()}>关闭</button>
    </dialog>
  </>;
}
