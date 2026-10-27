import { costFen, debit, isPeak } from './billing.ts';
import { MOCK_USAGE, upstream } from './upstream.ts';

type Entry = { accountId: string; deltaFen: number; kind: 'topup' | 'ask'; at: string };
export function createApi(options: { adminToken?: string; mock?: string; now?: () => Date } = {}) {
  const balances = new Map<string, number>();
  const entries: Entry[] = [];
  const rates = new Map<string, number[]>();
  const pending = new Set<string>();
  const now = options.now ?? (() => new Date());
  const json = (status: number, value: object) => Response.json(value, { status });
  return { entries, async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!['/api/ai/balance', '/api/ai/topup', '/api/ai/ask'].includes(url.pathname)) return json(404, { ok: false, error: 'not_found' });
    const expected = url.pathname.endsWith('/balance') ? 'GET' : 'POST';
    if (request.method !== expected) return json(405, { ok: false, error: 'method_not_allowed' });
    let body: Record<string, unknown> = {};
    if (expected === 'POST') {
      const raw = await request.text();
      if (raw.length > 16000) return json(413, { ok: false, error: 'body_too_large' });
      try { body = JSON.parse(raw); if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error(); }
      catch { return json(400, { ok: false, error: 'invalid_json' }); }
    }
    const accountId = expected === 'GET' ? url.searchParams.get('accountId') : body.accountId;
    if (typeof accountId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(accountId)) return json(400, { ok: false, error: 'invalid_account' });
    const balance = () => balances.get(accountId) ?? 0;
    if (expected === 'GET') return json(200, { ok: true, balanceFen: balance() });
    if (url.pathname.endsWith('/topup')) {
      if (!options.adminToken || request.headers.get('authorization') !== `Bearer ${options.adminToken}`) return json(403, { ok: false, error: 'admin_required' });
      const amount = body.amountFen;
      if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1000000 || !Number.isSafeInteger(balance() + amount)) return json(400, { ok: false, error: 'invalid_amount' });
      balances.set(accountId, balance() + amount);
      entries.push({ accountId, deltaFen: amount, kind: 'topup', at: now().toISOString() });
      return json(200, { ok: true, balanceFen: balance() });
    }
    if (typeof body.ask !== 'string' || !body.ask.trim() || body.ask.length > 200) return json(400, { ok: false, error: 'invalid_ask' });
    if (pending.has(accountId)) return json(409, { ok: false, error: 'request_pending' });
    const date = now();
    const recent = (rates.get(accountId) ?? []).filter(t => t > date.getTime() - 60000);
    if (recent.length >= 10) return json(429, { ok: false, error: 'rate_limited' });
    // mock usage 固定，可在调用前精确验余额；真实上游需另做最大费用预留。
    const cost = costFen(MOCK_USAGE, isPeak(date));
    if (balance() < cost) return json(402, { ok: false, error: 'insufficient_balance', balanceFen: balance() });
    rates.set(accountId, [...recent, date.getTime()]);
    pending.add(accountId);
    try {
      const result = await upstream(options.mock);
      const charged = costFen(result.usage, isPeak(date));
      balances.set(accountId, debit(balance(), charged));
      entries.push({ accountId, deltaFen: -charged, kind: 'ask', at: date.toISOString() });
      return json(200, { ok: true, ...result, costFen: charged, balanceFen: balance() });
    } catch { return json(503, { ok: false, error: 'upstream_disabled' }); }
    finally { pending.delete(accountId); }
  } };
}
