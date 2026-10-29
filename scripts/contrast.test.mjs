// 练习界面常用文字色的对比度底线（WCAG AA 普通文字 ≥ 4.5:1）。背景取该文字实际出现过的最浅/最深底色。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const lum = (hex) => { const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const colorOf = (selector) => {
  const at = css.indexOf(selector + '{') >= 0 ? css.indexOf(selector + '{') : css.indexOf(selector + ' {');
  assert.ok(at >= 0, `找不到 ${selector}`);
  const rule = css.slice(at, css.indexOf('}', at));
  const m = rule.match(/(?:^|[;{\s])color:\s*#([0-9a-f]{6})/i);
  assert.ok(m, `${selector} 没有文字色`);
  return m[1];
};
const cases = [
  ['.nav-item', ['ffffff', 'f7f8f7']],
  ['.unit-number', ['fffef9']],
  ['.unit-card p', ['fffef9', 'eaf1de']],
  ['.unit-card>div', ['fffef9', 'eaf1de']],
  ['.section-kicker', ['ffffff', 'eaf1de']],
  ['.tone-peach', ['fcf0e7']],
  ['.tone-gold', ['fcf5db']],
];
test('练习界面文字色对比度 ≥ 4.5:1', () => {
  for (const [selector, bgs] of cases) for (const bg of bgs) {
    const ratio = contrast(colorOf(selector), bg);
    assert.ok(ratio >= 4.5, `${selector} 在 #${bg} 上只有 ${ratio.toFixed(2)}:1`);
  }
  const muted = css.match(/--color-muted-foreground:\s*#([0-9a-f]{6})/i)[1];
  for (const bg of ['ffffff', 'eaf1de']) assert.ok(contrast(muted, bg) >= 4.5, `muted-foreground 在 #${bg}`);
});
test('文件选择有可见焦点样式；安装提示关闭按钮不小于 44×44', () => {
  assert.match(css, /\.import-file:focus-within\{outline:3px solid/);
  const site = readFileSync(new URL('../site/www.yanghat.cn/styles.css', import.meta.url), 'utf8');
  assert.match(site, /\.install-hint button\{[^}]*min-height:44px;min-width:44px/);
});
