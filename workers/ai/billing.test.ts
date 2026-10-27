import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costFen, debit, isPeak } from './billing.ts';
test('缓存命中/未命中、空闲/高峰费率', () => {
  assert.equal(costFen({ prompt: 1000000, completion: 0 }, false), 100);
  assert.equal(costFen({ prompt: 1000000, cached: 1000000, completion: 0 }, false), 2);
  assert.equal(costFen({ prompt: 1000000, completion: 1000000 }, true), 1000);
  assert.equal(costFen({ prompt: 1000000, cached: 1000000, completion: 0 }, true), 4);
  assert.equal(costFen({ prompt: 100, completion: 20 }, false), 1);
  assert.equal(costFen({ prompt: 0, completion: 2501 }, false), 2);
  assert.throws(() => costFen({ prompt: 1, cached: 2, completion: 0 }, false));
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
  assert.equal(costFen({ prompt: 10_000_000_001, completion: 0 }, false), 1_000_001);
  assert.equal(costFen({ prompt: 10_000_000_001, completion: 0 }, true), 2_000_001);
  assert.throws(() => costFen({ prompt: Number.MAX_SAFE_INTEGER, completion: 0 }, true), /invalid_usage/);
  assert.throws(() => costFen({ prompt: 90_071_992_547_409, completion: 0 }, false), /invalid_usage/);
});
