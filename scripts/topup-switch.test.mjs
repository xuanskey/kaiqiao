import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTopupOpen } from './topup-pay-qr.mjs';
test('收款仅精确 true 开放', () => {
  for (const value of [undefined, '', 'false']) assert.equal(resolveTopupOpen(value), false);
  assert.equal(resolveTopupOpen('true'), true);
  for (const value of ['TRUE', ' true', 'false ', '0', '1', 'yes']) assert.throws(() => resolveTopupOpen(value), /TOPUP_OPEN/);
});
