import { useEffect, useRef, useState } from "react";
import { Bot, Send, Settings } from "lucide-react";
import { DEFAULT_AI, askAi, loadAiConfig, saveAiConfig, validBaseUrl, type AiConfig, type AiContext, type AiRequests } from "@/lib/lesson/ai";

import { askPlatform, platformAccount, platformBalance } from "@/lib/lesson/platform-ai";

const store = () => (typeof window === "undefined" ? undefined : window.localStorage);
/** 简短提问先取整后至少 1 分成本，再乘 4，发送门槛与此最低账单一致。 */
const MIN_PLATFORM_FEN = 4;

/** 可选 AI 老师：家长自备密钥。未开启时课堂使用离线规则老师。 */
export function useAiConfig(): [AiConfig, (c: AiConfig) => void] {
  const [cfg, setCfg] = useState<AiConfig>(() => (typeof window === "undefined" ? { ...DEFAULT_AI } : loadAiConfig(store())));
  return [cfg, (c) => { setCfg(c); saveAiConfig(store(), c); }];
}

export function AiPanel({ cfg, setCfg, context, onReply, requests }: { requests: AiRequests; cfg: AiConfig; setCfg: (c: AiConfig) => void; context: () => Omit<AiContext, "studentAsk">; onReply: (text: string) => void }) {
  const [mode, setMode] = useState<'own' | 'platform'>('own');
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState('');
  useEffect(() => {
    if (mode !== 'platform') return;
    const ctrl = new AbortController();
    try {
      const id = platformAccount();
      setAccount(id);
      setBalance(null);
      setBalanceError('');
      void platformBalance(id, ctrl.signal).then(setBalance).catch(() => { if (!ctrl.signal.aborted) setBalanceError('余额暂时无法读取'); });
    } catch { setBalanceError('请允许浏览器保存本机账户'); }
    return () => ctrl.abort();
  }, [mode]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AiConfig>(cfg);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current = null; requests.cancel(); }, [requests]);
  // 父级配置变化同样使旧请求失效；不依赖配置对象/回调的引用稳定性。
  useEffect(() => {
    requests.cancel();
    active.current = null;
    setBusy(false);
  }, [requests, cfg.enabled, cfg.apiKey, cfg.baseUrl, cfg.model, mode]);
  const changeConfig = (value: AiConfig) => { requests.cancel(); setCfg(value); };
  const send = async () => {
    if (!ask.trim() || (active.current && !active.current.signal.aborted) || (mode === 'own' ? !cfg.enabled || !cfg.apiKey : !account || balance === null || balance < MIN_PLATFORM_FEN)) return;
    const request = requests.begin();
    active.current = request;
    setBusy(true);
    try {
      const ctx = { ...context(), studentAsk: ask.trim() };
      const r = mode === 'platform'
        ? await askPlatform(account, ctx, request.signal)
        : await askAi(cfg, ctx, fetch, 20000, request.signal);
      if (active.current !== request || !requests.isCurrent(request)) return;
      if ('balanceFen' in r && typeof r.balanceFen === 'number') setBalance(r.balanceFen);
      onReply(r.ok ? r.text : `${r.error}。先用离线老师的讲解吧。`);
      if (r.ok) setAsk("");
    } finally {
      // 卸载或新请求开始后，旧请求的 finally 不能修改新请求的 loading。
      if (active.current === request) { active.current = null; setBusy(false); }
    }
  };
  return <div className="ai-panel">
    <label>AI 服务<select aria-label="AI 服务" value={mode} onChange={(e) => { requests.cancel(); setMode(e.target.value as 'own' | 'platform'); }}>
      <option value="own">家长自备密钥</option><option value="platform">平台 AI（预付费）</option>
    </select></label>
    {mode === 'platform' ? <div>
      <p>演示模式，未真实调用 AI，不扣真钱。点数购买尚未开放。</p>
      <p>平台 AI（预付费）：{balanceError || (balance === null ? '读取余额中…' : `余额 ${balance} 点（1 点 = 0.01 元）`)}</p>
      <p>扣点按 DeepSeek 官方价先向上取整到分（最低 1 分），再乘 4。一次简短提问通常扣 4 点。</p>
      <p>正式购买开放后，金额只限正整数元，最低 1 元，不设固定档位；1 元 = 100 点。1:4 只用于扣点，不用于充值。</p>
      <p>未用完的点数可申请退款，已使用的不退；退款额是未用点数对应的实付金额，不按余额除以 4。演示点数不涉及退款。</p>
      <p>管理员入账仅用于演示，按原点数增加，不乘 4，不是购买。</p>
      {balance !== null && balance < MIN_PLATFORM_FEN ? <p className="ai-warn">点数不足 4 点，暂时不能提问。</p> : null}
      {account ? <small>本机编号：{account}。这不是登录账户，只保存在这台浏览器里；清除数据后编号和演示余额都会消失。</small> : null}
      <button type="button" onClick={() => { if (account) void platformBalance(account).then((n) => { setBalance(n); setBalanceError(''); }).catch(() => setBalanceError('余额暂时无法读取')); }}>刷新余额</button>
    </div> : null}
    {mode === 'own' ? <div className="ai-head"><Bot size={16} /><span>{cfg.enabled && cfg.apiKey ? "AI 老师已开启" : "AI 老师（可选，需自备密钥）"}</span><button type="button" onClick={() => { setDraft(cfg); setOpen((o) => !o); }} aria-expanded={open}><Settings size={14} />设置</button></div> : null}
    {open && mode === 'own' ? <form className="ai-form" onSubmit={(e) => { e.preventDefault(); if (draft.enabled && !validBaseUrl(draft.baseUrl)) return; changeConfig(draft); setOpen(false); }}>
      <label><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />开启 AI 老师</label>
      <label>服务地址<input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://api.deepseek.com" /></label>
      {draft.enabled && !validBaseUrl(draft.baseUrl) ? <small className="ai-warn">地址必须以 https:// 开头</small> : null}
      <label>模型<input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="deepseek-chat" /></label>
      <label>API 密钥<input type="password" autoComplete="off" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="sk-..." /></label>
      <small>密钥只保存在这台设备的浏览器里，只发送到上面的地址。AI 的回答只显示为文字；课堂里的数字以程序计算为准。自备密钥不经平台账本，费用由家长自己的 DeepSeek 账户承担。请由家长设置。</small>
      <div className="ai-actions"><button type="submit">保存</button><button type="button" onClick={() => { const c = { ...DEFAULT_AI }; setDraft(c); changeConfig(c); }}>清除密钥</button></div>
    </form> : null}
    {(mode === 'platform' || (cfg.enabled && cfg.apiKey)) ? <form className="ai-ask" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <input value={ask} disabled={busy} onChange={(e) => setAsk(e.target.value)} placeholder="问老师一个问题" aria-label="问老师" maxLength={200} />
      <button type="submit" disabled={busy || !ask.trim() || (mode === 'platform' && (!account || balance === null || balance < MIN_PLATFORM_FEN))} aria-label="发送"><Send size={15} />{busy ? "思考中" : "问"}</button>
      {busy ? <button type="button" onClick={() => requests.cancel()}>取消请求</button> : null}
    </form> : null}
  </div>;
}
