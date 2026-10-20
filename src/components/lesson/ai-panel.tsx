import { useState } from "react";
import { Bot, Send, Settings } from "lucide-react";
import { DEFAULT_AI, askAi, loadAiConfig, saveAiConfig, validBaseUrl, type AiConfig, type AiContext } from "@/lib/lesson/ai";

const store = () => (typeof window === "undefined" ? undefined : window.localStorage);

/** 可选 AI 老师：家长自备密钥。未开启时课堂使用离线规则老师。 */
export function useAiConfig(): [AiConfig, (c: AiConfig) => void] {
  const [cfg, setCfg] = useState<AiConfig>(() => (typeof window === "undefined" ? { ...DEFAULT_AI } : loadAiConfig(store())));
  return [cfg, (c) => { setCfg(c); saveAiConfig(store(), c); }];
}

export function AiPanel({ cfg, setCfg, context, onReply }: { cfg: AiConfig; setCfg: (c: AiConfig) => void; context: () => Omit<AiContext, "studentAsk">; onReply: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AiConfig>(cfg);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!ask.trim() || busy) return;
    setBusy(true);
    const r = await askAi(cfg, { ...context(), studentAsk: ask.trim() });
    setBusy(false);
    onReply(r.ok ? r.text : `${r.error}。先用离线老师的讲解吧。`);
    if (r.ok) setAsk("");
  };
  return <div className="ai-panel">
    <div className="ai-head"><Bot size={16} /><span>{cfg.enabled && cfg.apiKey ? "AI 老师已开启" : "AI 老师（可选，需自备密钥）"}</span><button type="button" onClick={() => { setDraft(cfg); setOpen((o) => !o); }} aria-expanded={open}><Settings size={14} />设置</button></div>
    {open ? <form className="ai-form" onSubmit={(e) => { e.preventDefault(); if (draft.enabled && !validBaseUrl(draft.baseUrl)) return; setCfg(draft); setOpen(false); }}>
      <label><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />开启 AI 老师</label>
      <label>服务地址<input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://api.deepseek.com" /></label>
      {draft.enabled && !validBaseUrl(draft.baseUrl) ? <small className="ai-warn">地址必须以 https:// 开头</small> : null}
      <label>模型<input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="deepseek-chat" /></label>
      <label>API 密钥<input type="password" autoComplete="off" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="sk-..." /></label>
      <small>密钥只保存在这台设备的浏览器里，只发送到上面的地址。AI 的回答只显示为文字；课堂里的数字以程序计算为准。请由家长设置。</small>
      <div className="ai-actions"><button type="submit">保存</button><button type="button" onClick={() => { const c = { ...DEFAULT_AI }; setDraft(c); setCfg(c); }}>清除密钥</button></div>
    </form> : null}
    {cfg.enabled && cfg.apiKey ? <form className="ai-ask" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="问老师一个问题" aria-label="问老师" maxLength={200} />
      <button type="submit" disabled={busy || !ask.trim()} aria-label="发送"><Send size={15} />{busy ? "思考中" : "问"}</button>
    </form> : null}
  </div>;
}
