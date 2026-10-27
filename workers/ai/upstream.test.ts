import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upstream, MODEL, MAX_TOKENS, THINKING } from './upstream.ts';
test('mock 默认返回纯文本和 usage，任何模式均不联网', async () => {
  const original = globalThis.fetch;
  const originalMock = process.env.MOCK_DEEPSEEK;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('禁止联网'); };
  try {
    delete process.env.MOCK_DEEPSEEK;
    const result = await upstream();
    assert.equal(typeof result.text, 'string');
    assert.equal(result.model, MODEL);
    assert.equal(result.maxTokens, MAX_TOKENS);
    assert.equal(result.thinking, THINKING);
    assert.deepEqual([MODEL, MAX_TOKENS, THINKING], ['deepseek-flash', 400, 'disabled']);
    assert.deepEqual(result.usage, { prompt: 120, completion: 60, cached: 20 });
    for (const mode of ['0', '', 'true', '01', 'production']) {
      await assert.rejects(upstream(mode), /real_upstream_disabled/);
      process.env.MOCK_DEEPSEEK = mode;
      await assert.rejects(upstream(), /real_upstream_disabled/);
    }
    assert.equal((await upstream('1')).model, MODEL);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
    if (originalMock === undefined) delete process.env.MOCK_DEEPSEEK;
    else process.env.MOCK_DEEPSEEK = originalMock;
  }
});
