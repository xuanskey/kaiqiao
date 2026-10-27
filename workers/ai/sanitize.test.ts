import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText } from './sanitize.ts';
// 仅测试比较两端契约；Worker 运行时代码不依赖前端。
import { sanitizeReply } from '../../src/lib/lesson/ai.ts';

test('纯文本净化：HTML、脚本、代码块、链接、空白及长度', () => {
  assert.equal(sanitizeText('<SCRIPT>alert(1)</SCRIPT><style>x{}</style><img src=x onerror=alert(2)>你好 ```js\nalert(3)\n``` https://evil.example **加油**\n\t 继续<>'), '你好 加油 继续');
  assert.equal(sanitizeText(42), '');
  assert.equal(sanitizeText('好'.repeat(401)).length, 400);
});

test('前后端净化契约一致，重复净化不改变正常文本', () => {
  const cases: [unknown, string][] = [
    [null, ''], [42, ''], ['', ''],
    ['<ScRiPt type="text/javascript">alert(1)</sCrIpT ><STYLE>x{}</STYLE>你好', '你好'],
    ['```js\nalert(1)\n```<b>继续</b><img src=x onerror=alert(2)>', '继续'],
    ['HTTP://example.test HTTPS://example.test https://example.test 好', '好'],
    ['  第一步\n\n\n第二步\t  **加油** # > ` <  ', '第一步 第二步 加油'],
    ['&lt;script&gt; 3 + 2 = 5，保留中文。', '&lt;script&gt; 3 + 2 = 5，保留中文。'],
    ['好'.repeat(401), '好'.repeat(400)],
  ];
  for (const [input, expected] of cases) {
    assert.equal(sanitizeText(input), expected);
    assert.equal(sanitizeReply(input), expected);
    assert.equal(sanitizeReply(sanitizeText(input)), expected);
  }
  assert.equal(sanitizeText('一二三四', 2), '一二');
  assert.equal(sanitizeReply('一二三四', 2), '一二');
  assert.equal(sanitizeText('你好', 0), '');
  assert.equal(sanitizeReply('你好', 0), '');
});
