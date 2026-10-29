import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Plain JS is also served directly by the static site.
import { domainDecision } from '../../../site/www.yanghat.cn/domain-transition.js';
for (const hostname of ['www.yanghat.cn', 'localhost', 'preview.pages.dev']) test(hostname, () => assert.deepEqual(domainDecision({ hostname, hasRecords: false }), { kind: 'none' }));
test('裸域无记录保留 URL', () => assert.deepEqual(domainDecision({ hostname: 'yanghat.cn', pathname: '/foo', search: '?practice=1', hash: '#x', hasRecords: false }), { kind: 'redirect', url: 'https://www.yanghat.cn/foo?practice=1#x' }));
test('裸域有记录提示', () => assert.deepEqual(domainDecision({ hostname: 'yanghat.cn', hasRecords: true }), { kind: 'banner' }));
test('iframe 不跳', () => assert.deepEqual(domainDecision({ hostname: 'yanghat.cn', topLevel: false, hasRecords: false }), { kind: 'none' }));
