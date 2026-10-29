// Model Pages path matching and header merging; never assume later rules override earlier ones.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const root = 'site/www.yanghat.cn';
const rules = [];
for (const line of (await readFile(`${root}/_headers`, 'utf8')).split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (line.startsWith('/') || line.startsWith('https://')) {
    rules.push({ path: line.trim(), headers: [] });
  } else {
    const match = line.trim().match(/^([^:]+):\s*(.*)$/);
    assert.ok(match, `Invalid header: ${line}`);
    rules.at(-1).headers.push([match[1].toLowerCase(), match[2]]);
  }
}
const matchPath = (pattern, path) => new RegExp(`^${pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(path);
const cacheValues = path => rules.filter(rule => matchPath(rule.path, path.split('?')[0])).flatMap(rule => rule.headers.filter(([key]) => key === 'cache-control').map(([, value]) => value));
const expectCache = (path, value) => assert.deepEqual(cacheValues(path), [value], `${path}: missing or merged Cache-Control`);
for (const path of ['/', '/index.html', '/app/', '/app/index.html', '/app/sw.js', '/sw-practice.js', '/styles.css?v=20261021', '/app.js?v=20261021']) expectCache(path, 'no-cache');
for (const name of await readdir(`${root}/assets`)) {
  const value = name === 'og-cover-20261029.jpg' ? 'public, max-age=31536000, immutable' : name === 'wechat-pay-qr.png' ? 'no-cache' : 'public, max-age=3600';
  expectCache(`/assets/${name}`, value);
}
const bundles = await readdir(`${root}/app/assets`);
assert.ok(bundles.length > 0);
for (const name of bundles) {
  assert.match(name, /-[\w-]{8,}\.[\w.]+$/, `Immutable bundle must have a hash: ${name}`);
  expectCache(`/app/assets/${name}`, 'public, max-age=31536000, immutable');
}
const apex = rules.find(r => r.path === 'https://yanghat.cn/*');
assert.deepEqual(apex?.headers, [['link', '<https://www.yanghat.cn/:splat>; rel="canonical"']]);
expectCache('/domain-transition.js', 'no-cache');
console.log('Cache verified: HTML/SW revalidate, versioned assets immutable, no merged Cache-Control');
