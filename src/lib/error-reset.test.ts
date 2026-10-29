import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldReset } from './error-reset.ts';

test('出错后切换页面（resetKey 变化）才重置', () => {
  assert.equal(shouldReset('home', 'report', true), true);
  assert.equal(shouldReset('home', 'home', true), false);
  assert.equal(shouldReset('home', 'report', false), false);
});
