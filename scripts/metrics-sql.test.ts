import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
// @ts-ignore JS module
import {TEST_POINTS,buildEventCountsSql} from './metrics-sql.mjs';
test('按 UTC 天事件年级加权聚合，精确排除三个测试点',()=>{
 const sql=buildEventCountsSql({days:7});
 assert.equal(TEST_POINTS.length,3);
 for(const p of TEST_POINTS)assert.ok(sql.includes(`NOT (timestamp = toDateTime('${p.timestamp}') AND blob1='${p.event}' AND blob2='${p.grade}' AND blob3='${p.env}')`));
 assert.match(sql,/^SELECT /);assert.match(sql,/SUM\(_sample_interval\)/);assert.match(sql,/WHERE blob3='prod'/);assert.match(sql,/GROUP BY day, event, grade/);
 assert.doesNotMatch(sql,/\b(?:INSERT|DELETE|UPDATE|DROP|CREATE|ALTER|REPLACE)\b/i);
 assert.doesNotMatch(sql,/token|secret|password|authorization|bearer|https?:\/\/|[a-f0-9]{32}/i);
 assert.match(buildEventCountsSql({days:14}),/INTERVAL '14' DAY/);
});
test('拒绝非法天数及 SQL 注入',()=>{for(const days of [0,-1,1.5,NaN,Infinity,'7; DELETE',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>buildEventCountsSql({days}));});
test('CLI 只输出 SQL',()=>{
 const result=spawnSync(process.execPath,['scripts/metrics-sql.mjs','--days','7'],{encoding:'utf8'});
 assert.equal(result.status,0);assert.equal(result.stderr,'');assert.equal(result.stdout,buildEventCountsSql({days:7}));
 assert.notEqual(spawnSync(process.execPath,['scripts/metrics-sql.mjs','--days','bad']).status,0);
});
