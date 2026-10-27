import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText } from './sanitize.ts';

test('纯文本净化：HTML、脚本、代码块、链接、空白及长度', () => {
  assert.equal(sanitizeText('<SCRIPT>alert(1)</SCRIPT><style>x{}</style><img src=x onerror=alert(2)>你好 ```js\nalert(3)\n``` https://evil.example **加油**\n\t 继续<>'), '你好 加油 继续');
  assert.equal(sanitizeText(42), '');
  assert.equal(sanitizeText('好'.repeat(401)).length, 400);
});
