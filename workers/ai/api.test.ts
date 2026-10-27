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
