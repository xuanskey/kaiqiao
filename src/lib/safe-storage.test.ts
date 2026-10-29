import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLocalStorage } from './safe-storage.ts';

test('读取 localStorage 抛 SecurityError 时返回 undefined', () => {
  const blocked = Object.defineProperty({}, 'localStorage', { get() { throw new Error('SecurityError'); } }) as { localStorage: Storage };
  assert.equal(safeLocalStorage(blocked), undefined);
});
test('正常时返回同一个 Storage；无 window 时返回 undefined', () => {
  const store = { getItem: () => null } as unknown as Storage;
  assert.equal(safeLocalStorage({ localStorage: store }), store);
  assert.equal(safeLocalStorage(undefined), undefined);
});
