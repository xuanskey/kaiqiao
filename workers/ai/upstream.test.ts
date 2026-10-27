import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upstream } from './upstream.ts';
test('mock 默认返回纯文本和 usage，任何模式均不联网', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('禁止联网'); };
  try {
    const result = await upstream();
    assert.equal(typeof result.text, 'string');
    assert.deepEqual(result.usage, { prompt: 120, completion: 60, cached: 20 });
    await assert.rejects(upstream('0'), /real_upstream_disabled/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});
