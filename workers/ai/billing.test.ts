import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billFen, costFen, debit, isPeak } from './billing.ts';
test('缓存命中/未命中、空闲/高峰费率', () => {
  assert.equal(costFen({ prompt: 1000000, completion: 0 }, false), 100);
  assert.equal(billFen({ prompt: 1000000, completion: 0 }, false), 400);
  assert.equal(costFen({ prompt: 1000000, cached: 1000000, completion: 0 }, false), 2);
  assert.equal(billFen({ prompt: 1000000, cached: 1000000, completion: 0 }, false), 8);
  assert.equal(costFen({ prompt: 1000000, completion: 1000000 }, true), 1000);
  assert.equal(billFen({ prompt: 1000000, completion: 1000000 }, true), 4000);
  assert.equal(costFen({ prompt: 1000000, cached: 1000000, completion: 0 }, true), 4);
  assert.equal(billFen({ prompt: 1000000, cached: 1000000, completion: 0 }, true), 16);
  assert.equal(costFen({ prompt: 100, completion: 20 }, false), 1);
  assert.equal(billFen({ prompt: 100, completion: 20 }, false), 4);
  assert.equal(costFen({ prompt: 0, completion: 2501 }, false), 2);
  assert.equal(billFen({ prompt: 0, completion: 2501 }, false), 8);
  assert.throws(() => costFen({ prompt: 1, cached: 2, completion: 0 }, false));
  assert.throws(() => billFen({ prompt: 1, cached: 2, completion: 0 }, false));
});
test('先取整再乘 4：小额 4 点，百万输出空闲 1600、高峰 3200', () => {
  assert.equal(costFen({ prompt: 1000, completion: 500 }, false), 1);
  assert.equal(billFen({ prompt: 1000, completion: 500 }, false), 4);
  assert.equal(costFen({ prompt: 0, completion: 1_000_000 }, false), 400);
  assert.equal(billFen({ prompt: 0, completion: 1_000_000 }, false), 1600);
  assert.equal(costFen({ prompt: 0, completion: 1_000_000 }, true), 800);
  assert.equal(billFen({ prompt: 0, completion: 1_000_000 }, true), 3200);
});
test('余额不足拒扣与边界', () => {
  assert.equal(debit(1, 1), 0);
  assert.throws(() => debit(0, 1), /insufficient/);
});
test('北京时间工作日高峰边界及节假日', () => {
  assert.equal(isPeak(new Date('2026-10-27T01:00:00Z')), true);
  assert.equal(isPeak(new Date('2026-10-27T04:00:00Z')), false);
  assert.equal(isPeak(new Date('2026-10-27T06:00:00Z')), true);
  assert.equal(isPeak(new Date('2026-10-27T10:00:00Z')), false);
  assert.equal(isPeak(new Date('2026-10-25T01:00:00Z')), false);
  assert.equal(isPeak(new Date('2026-10-27T01:00:00Z'), true), false);
});

test('整数进位大数及安全整数保护', () => {
  assert.equal(costFen({ prompt: 10_000_000_000, completion: 0 }, false), 1_000_000);
  assert.equal(billFen({ prompt: 10_000_000_000, completion: 0 }, false), 4_000_000);
  assert.equal(costFen({ prompt: 10_000_000_001, completion: 0 }, false), 1_000_001);
  assert.equal(billFen({ prompt: 10_000_000_001, completion: 0 }, false), 4_000_004);
  assert.equal(costFen({ prompt: 10_000_000_001, completion: 0 }, true), 2_000_001);
  assert.equal(billFen({ prompt: 10_000_000_001, completion: 0 }, true), 8_000_004);
  assert.throws(() => costFen({ prompt: Number.MAX_SAFE_INTEGER, completion: 0 }, true), /invalid_usage/);
  assert.throws(() => costFen({ prompt: 90_071_992_547_409, completion: 0 }, false), /invalid_usage/);
});

test('混合缓存费用、整分两侧及大数结果与独立 BigInt 算法一致', () => {
  for (const peak of [false, true]) {
    for (const usage of [
      { prompt: 0, cached: 0, completion: 0 },
      ...[2499, 2500, 2501].map(completion => ({ prompt: 0, cached: 0, completion })),
      ...[499999, 500000, 500001].map(prompt => ({ prompt, cached: prompt, completion: 0 })),
      { prompt: 10001, cached: 9999, completion: 2500 },
      { prompt: 10_000_000_001, cached: 2_000_000_000, completion: 1234567 },
    ]) {
      const numerator = (BigInt(usage.prompt - usage.cached) * 100n + BigInt(usage.cached) * 2n + BigInt(usage.completion) * 400n) * (peak ? 2n : 1n);
      const expected = numerator / 1_000_000n + (numerator % 1_000_000n === 0n ? 0n : 1n);
      const cost = Math.max(1, Number(expected));
      assert.equal(costFen(usage, peak), cost);
      assert.equal(billFen(usage, peak), cost * 4);
    }
  }
  for (const invalid of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    for (const key of ['prompt', 'completion', 'cached']) {
      assert.throws(() => costFen({ prompt: 1, completion: 0, [key]: invalid }, false), /invalid_usage/);
      assert.throws(() => billFen({ prompt: 1, completion: 0, [key]: invalid }, false), /invalid_usage/);
    }
  }
});
