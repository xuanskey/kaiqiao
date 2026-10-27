import { sanitizeReply, type AiContext, type AiResult } from './ai.ts';
const ACCOUNT_KEY = 'kaiqiao-ai-account';
export function platformAccount(): string {
  const saved = localStorage.getItem(ACCOUNT_KEY);
  if (saved) return saved;
  const id = crypto.randomUUID();
  localStorage.setItem(ACCOUNT_KEY, id);
  return id;
}
export async function platformBalance(accountId: string, signal?: AbortSignal): Promise<number> {
  const res = await fetch(`/api/ai/balance?accountId=${encodeURIComponent(accountId)}`, { signal });
  const data = await res.json();
  if (!res.ok || !Number.isSafeInteger(data.balanceFen) || data.balanceFen < 0) throw new Error('balance_unavailable');
  return data.balanceFen;
}
export async function askPlatform(accountId: string, ctx: AiContext, signal: AbortSignal): Promise<AiResult & { balanceFen?: number }> {
  try {
    const res = await fetch('/api/ai/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, scene: 'lesson', ...ctx, ask: ctx.studentAsk }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    });
    const data = await res.json();
    if (res.status === 402) return { ok: false, error: '余额不足，请联系管理员充值', balanceFen: data.balanceFen };
    if (!res.ok) return { ok: false, error: res.status === 429 ? '提问太快，请稍后再试' : '平台 AI 暂时不可用' };
    const text = sanitizeReply(data.text);
    return text ? { ok: true, text, balanceFen: data.balanceFen } : { ok: false, error: '没有收到有效回答' };
  } catch { return signal.aborted ? { ok: false, error: '请求已取消', cancelled: true } : { ok: false, error: '平台 AI 连接失败或超时' }; }
}
