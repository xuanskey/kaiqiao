import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);

test('平台 AI 预付费演示已下线：前端源码不含入口、本机编号与余额接口', () => {
  assert.equal(existsSync('src/lib/lesson/platform-ai.ts'), false);
  for (const file of walk('src').filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('no-platform-ai.test.ts'))) {
    const s = readFileSync(file, 'utf8');
    for (const banned of ['平台 AI', '/api/ai/', 'kaiqiao-ai-account', 'platformBalance', 'askPlatform']) assert.ok(!s.includes(banned), `${file} 仍含 ${banned}`);
  }
});
