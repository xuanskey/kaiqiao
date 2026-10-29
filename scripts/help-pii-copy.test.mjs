import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// 网页客服在浏览器里用的脱敏规则必须与 Worker 同一份，避免两边规则悄悄分叉。
test('site/help-pii.js 与 workers/help/pii.js 完全一致，并已接入客服发送', async () => {
  assert.equal(await readFile('site/www.yanghat.cn/help-pii.js','utf8'), await readFile('workers/help/pii.js','utf8'));
  const client = await readFile('site/www.yanghat.cn/help.js','utf8');
  assert.match(client, /import \{ redactPII \} from '\.\/help-pii\.js';/);
  assert.match(client, /const q=redactPII\(raw\)/);
  assert.match(client, /请勿输入姓名电话等/);
});
