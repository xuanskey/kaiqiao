import type {HelpMessage} from './help-history';
export const helpEndpoint = import.meta.env?.VITE_HELP_ENDPOINT ?? '';
// Worker 对上游设 15 秒上限并返回兜底答复；客户端多留 5 秒，只兜住网络挂起，不抢在 Worker 兜底之前。
export const HELP_TIMEOUT_MS = 20000;
export const HELP_TIMEOUT_TEXT = '小助手太久没有回应，请检查网络后再试，或发邮件到 hello@yanghat.cn。';
export const HELP_ERROR_TEXT = '暂时没能回答，请稍后再试，或发邮件到 hello@yanghat.cn。';
export class HelpTimeoutError extends Error { constructor() { super('Help timed out'); this.name = 'HelpTimeoutError'; } }
type HelpResult = {answer: string; source: 'ai' | 'fallback'};
export async function requestHelp(endpoint: string, messages: HelpMessage[], signal: AbortSignal, options: {timeoutMs?: number; fetch?: typeof fetch} = {}): Promise<HelpResult> {
  if (endpoint !== '/api/help') throw new Error('Help disabled');
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), options.timeoutMs ?? HELP_TIMEOUT_MS);
  const combined = new AbortController();
  const stop = () => combined.abort();
  signal.addEventListener('abort', stop, {once: true}); timeout.signal.addEventListener('abort', stop, {once: true});
  if (signal.aborted) combined.abort();
  try {
    const response = await (options.fetch ?? fetch)(endpoint, {method:'POST',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({v:2,messages}),signal:combined.signal});
    const data = await response.json();
    if (!response.ok || data.v !== 1 || typeof data.answer !== 'string' || !['ai','fallback'].includes(data.source)) throw new Error('Help unavailable');
    return {answer:data.answer,source:data.source};
  } catch (error) {
    if (timeout.signal.aborted && !signal.aborted) throw new HelpTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', stop); timeout.signal.removeEventListener('abort', stop);
  }
}
export function askHelp(messages: HelpMessage[], signal: AbortSignal): Promise<HelpResult> {
  return requestHelp(helpEndpoint, messages, signal);
}
