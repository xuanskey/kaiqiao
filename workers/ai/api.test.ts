import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from './api.ts';
test('三接口：拒绝无余额、管理员充值、扣点、账本及并发保护', async () => {
  const api = createApi({ adminToken: 'test-only', mock: '1' });
  const call = (path: string, body?: object, auth = '') => api.handle(new Request(`http://localhost/api/ai/${path}`, body ? { method: 'POST', headers: { authorization: auth }, body: JSON.stringify(body) } : undefined));
  const ask = { accountId: 'test-user', ask: '怎么想？' };
  assert.equal((await call('ask', ask)).status, 402);
  assert.equal((await call('topup', { ...ask, amountFen: 2 })).status, 403);
  assert.equal((await call('topup', { ...ask, amountFen: -1 }, 'Bearer test-only')).status, 400);
  assert.equal((await call('topup', { ...ask, amountFen: 2 }, 'Bearer test-only')).status, 200);
  const result = await (await call('ask', ask)).json();
  assert.equal(result.costFen, 1); assert.equal(result.balanceFen, 1); assert.ok(result.usage);
  const concurrent = await Promise.all([call('ask', ask), call('ask', ask)]);
  assert.equal(concurrent.filter(r => r.status === 200).length, 1);
  assert.equal((await (await call('balance?accountId=test-user')).json()).balanceFen, 0);
  assert.equal((await call('ask', ask)).status, 402);
  assert.deepEqual(api.entries.map(e => e.deltaFen), [2, -1, -1]);
});
test('关闭 mock 无扣点；每分钟至多 10 次', async () => {
  for (const mock of ['0', '1']) {
    const api = createApi({ adminToken: 'x', mock });
    const call = (path: string, data: object) => api.handle(new Request(`http://localhost/api/ai/${path}`, { method: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify(data) }));
    await call('topup', { accountId: 'test-user', amountFen: 20 });
    for (let i = 0; i < 10; i++) assert.equal((await call('ask', { accountId: 'test-user', ask: '题目' })).status, mock === '1' ? 200 : 503);
    assert.equal((await call('ask', { accountId: 'test-user', ask: '题目' })).status, 429);
    assert.equal(api.entries.length, mock === '1' ? 11 : 1);
  }
});

const post = (api: ReturnType<typeof createApi>, path: string, data: object) => api.handle(new Request(`http://localhost/api/ai/${path}`, {
  method: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ accountId: 'test-user', ...data }),
}));

test('并发充值串行记账；提问期间同账户充值返回 409', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const api = createApi({ adminToken: 'x', mock: '1', upstream: async () => {
    started(); await gate;
    return { model: 'deepseek-flash', maxTokens: 400, thinking: 'disabled', text: '好', usage: { prompt: 120, completion: 60 } };
  } });
  const responses = await Promise.all([post(api, 'topup', { amountFen: 2 }), post(api, 'topup', { amountFen: 3 })]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]);
  assert.deepEqual(api.entries.map(e => e.deltaFen), [2, 3]);
  const ask = post(api, 'ask', { ask: '题目' });
  await entered;
  assert.equal((await post(api, 'topup', { amountFen: 10 })).status, 409);
  release();
  const result = await (await ask).json();
  assert.equal(result.balanceFen, 4);
  assert.deepEqual(api.entries.map(e => e.deltaFen), [2, 3, -1]);
  assert.equal((await post(api, 'topup', { amountFen: 1 })).status, 200);
});

test('API 假日空闲价、普通工作日高峰价，响应净化并保留模型约束', async () => {
  for (const [date, cost] of [['2026-10-01T01:00:00Z', 100], ['2026-10-27T01:00:00Z', 200]] as const) {
    const api = createApi({ adminToken: 'x', mock: '1', now: () => new Date(date), upstream: async () => ({
      model: 'deepseek-flash', maxTokens: 400, thinking: 'disabled',
      text: '<script>alert(1)</script><b>你好</b>\n  **加油** ```js\nalert(2)\n``` https://evil.example',
      usage: { prompt: 1000000, completion: 0 },
    }) });
    await post(api, 'topup', { amountFen: 300 });
    const response = await post(api, 'ask', { ask: '题目' });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.costFen, cost);
    assert.equal(result.balanceFen, 300 - cost);
    assert.equal(result.text, '你好 加油');
    assert.equal(result.model, 'deepseek-flash');
    assert.equal(result.maxTokens, 400);
    assert.equal(result.thinking, 'disabled');
  }
});

test('上游实际费用超过余额时复验拒扣，账本不增且释放锁', async () => {
  const api = createApi({ adminToken: 'x', now: () => new Date('2026-10-01T01:00:00Z'), upstream: async () => ({
    model: 'deepseek-flash', maxTokens: 400, thinking: 'disabled', text: '好', usage: { prompt: 1000000, completion: 0 },
  }) });
  await post(api, 'topup', { amountFen: 1 });
  const response = await post(api, 'ask', { ask: '题目' });
  assert.equal(response.status, 402);
  assert.equal((await response.json()).balanceFen, 1);
  assert.deepEqual(api.entries.map(e => e.deltaFen), [1]);
  assert.equal((await post(api, 'topup', { amountFen: 1 })).status, 200);
});
