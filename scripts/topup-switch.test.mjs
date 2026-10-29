import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTopupOpen } from './topup-pay-qr.mjs';
test('收款仅精确 true 开放', () => {
  for (const value of [undefined, '', 'false']) assert.equal(resolveTopupOpen(value), false);
  assert.equal(resolveTopupOpen('true'), true);
  for (const value of ['TRUE', ' true', 'false ', '0', '1', 'yes']) assert.throws(() => resolveTopupOpen(value), /TOPUP_OPEN/);
});
import { readFileSync } from 'node:fs';
import { bakeTopupHtml } from './topup-pay-qr.mjs';
test('充值页首屏状态在构建时写入，避免脚本切换造成版面跳动', () => {
  const source = readFileSync('site/www.yanghat.cn/topup/index.html', 'utf8');
  const opened = bakeTopupHtml(source, true);
  assert.equal((opened.match(/data-topup-flow hidden/g) ?? []).length, 0);
  assert.match(opened, /<p id="topup-closed" hidden>/);
  const closed = bakeTopupHtml(opened, false);
  assert.equal((closed.match(/data-topup-flow hidden/g) ?? []).length, (closed.match(/data-topup-flow/g) ?? []).length);
  assert.match(closed, /<p id="topup-closed">/);
  assert.equal(bakeTopupHtml(closed, false), closed);
  assert.equal(bakeTopupHtml(opened, true), opened);
  for (const html of [opened, closed]) assert.doesNotMatch(html, /wechat-pay-qr/);
  assert.equal(bakeTopupHtml(source, false), source, '仓库里的充值页默认是关闭状态');
  assert.throws(() => bakeTopupHtml('<p>x</p>', true), /markers/);
});
test('协议文档与默认关闭、暂未开放口径一致', () => {
  const doc = readFileSync('site/topup-code.md', 'utf8');
  assert.match(doc, /`TOPUP_OPEN` 默认关闭/);
  assert.match(doc, /充值暂未开放/);
  assert.match(doc, /不包含 `wechat-pay-qr\.png`/);
  assert.doesNotMatch(doc, /默认开放|即将开放/);
});
