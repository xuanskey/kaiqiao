import test from 'node:test';
import assert from 'node:assert/strict';
import {requestHelp, HelpTimeoutError, HELP_TIMEOUT_MS} from './help.ts';
const hang: typeof fetch = (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))); });
const msgs = [{role: 'user' as const, content: '怎么开始？'}];
test('客户端等待上限长于 Worker 的 15 秒上游上限', () => { assert.ok(HELP_TIMEOUT_MS > 15000 && HELP_TIMEOUT_MS <= 30000); });
test('请求挂起时到期报超时，不无限等待', async () => {
  const started = Date.now();
  await assert.rejects(requestHelp('/api/help', msgs, new AbortController().signal, {timeoutMs: 50, fetch: hang}), HelpTimeoutError);
  assert.ok(Date.now() - started < 2000);
});
test('响应体读取挂起同样受上限约束', async () => {
  const slowBody: typeof fetch = async (_url, init) => ({ok: true, json: () => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))}) as unknown as Response;
  await assert.rejects(requestHelp('/api/help', msgs, new AbortController().signal, {timeoutMs: 50, fetch: slowBody}), HelpTimeoutError);
});
test('用户关闭/清空时是普通取消，不显示超时', async () => {
  const user = new AbortController();
  const pending = requestHelp('/api/help', msgs, user.signal, {timeoutMs: 5000, fetch: hang});
  user.abort();
  await assert.rejects(pending, (error: Error) => !(error instanceof HelpTimeoutError));
});
test('正常答复不受影响，计时器被清理', async () => {
  const ok: typeof fetch = async () => ({ok: true, json: async () => ({v: 1, answer: '点开始练习', source: 'ai'})}) as unknown as Response;
  assert.deepEqual(await requestHelp('/api/help', msgs, new AbortController().signal, {timeoutMs: 50, fetch: ok}), {answer: '点开始练习', source: 'ai'});
  await new Promise((r) => setTimeout(r, 80));
});
test('非法端点直接拒绝，不发请求', async () => {
  await assert.rejects(requestHelp('https://evil.example', msgs, new AbortController().signal, {fetch: () => assert.fail('不应请求')}), /disabled/);
});
test('发送前在本机隐去用户消息里的个人信息，助手消息与正常问题不变', async () => {
  let sent = '';
  const capture: typeof fetch = async (_url, init) => { sent = String(init?.body); return {ok: true, json: async () => ({v: 1, answer: '好', source: 'ai'})} as unknown as Response; };
  const history = [{role: 'user' as const, content: '我儿子叫王小明，电话13812345678'}, {role: 'assistant' as const, content: '请不要发个人信息'}, {role: 'user' as const, content: '3 + 5 等于几？'}];
  await requestHelp('/api/help', history, new AbortController().signal, {fetch: capture});
  assert.ok(!/王小明|13812345678/.test(sent), sent);
  const body = JSON.parse(sent);
  assert.equal(body.messages[0].content, '我儿子叫[名字]，电话[电话]');
  assert.equal(body.messages[1].content, '请不要发个人信息');
  assert.equal(body.messages[2].content, '3 + 5 等于几？');
});
