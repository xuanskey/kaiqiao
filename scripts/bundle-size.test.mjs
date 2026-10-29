import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAssets } from './bundle-size.mjs';
const budget = JSON.parse(readFileSync('scripts/bundle-budget.json', 'utf8'));
test('练习应用首屏 JS/CSS 不超过体积上限（原始与 gzip）', () => {
  const now = initialAssets('docs');
  for (const kind of ['js', 'css']) for (const unit of ['raw', 'gzip']) {
    assert.ok(now[kind][unit] <= budget.limit[kind][unit], `${kind} ${unit} ${now[kind][unit]} > 上限 ${budget.limit[kind][unit]}`);
  }
});
test('上限只比最近基线多留约 3%，不是摆设', () => {
  const latest = Object.values(budget.baseline).at(-1);
  for (const kind of ['js', 'css']) for (const unit of ['raw', 'gzip']) {
    const ratio = budget.limit[kind][unit] / latest[kind][unit];
    assert.ok(ratio > 1 && ratio <= 1.04, `${kind} ${unit} 余量 ${ratio}`);
  }
});
test('统计包含入口和预加载块，site/app 与 docs 一致', () => {
  const docs = initialAssets('docs'); const site = initialAssets('site/www.yanghat.cn/app');
  assert.deepEqual(site.js, docs.js); assert.deepEqual(site.css, docs.css);
  assert.ok(docs.files.js.every((f) => f.startsWith('assets/')));
});
