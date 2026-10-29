import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeBackup, readPracticeBackup, BACKUP_LIMIT, backupFilename } from './practice-backup.ts';
import { emptyPersist, SAVE_KEY, exportBackup } from './save.ts';
import { REVIEW_CONTENT_KEY, REVIEW_SCHEDULE_KEY } from './review.ts';
import { CLASS_LOG_KEY } from '../lesson/class-log.ts';
import { ACTIVITY_KEY } from '../activity.ts';
const data = () => ({ [SAVE_KEY]: emptyPersist(), [CLASS_LOG_KEY]: {}, [ACTIVITY_KEY]: {}, [REVIEW_CONTENT_KEY]: {}, [REVIEW_SCHEDULE_KEY]: {} });
const backup = () => createPracticeBackup(data(), 'https://yanghat.cn', '2026-10-29T00:00:00.000Z');
test('导出信封与五键白名单', () => { const b = createPracticeBackup({ ...data(), 'kaiqiao-ai': 'secret' }, 'https://yanghat.cn'); assert.equal(b.app, 'kaiqiao'); assert.equal(b.kind, 'practice-backup'); assert.equal(b.version, 1); assert.equal(Object.keys(b.data).length, 5); assert.ok(!('kaiqiao-ai' in b.data)); });
test('往返', () => { const b = backup(), r = readPracticeBackup(JSON.stringify(b)); assert.deepEqual(r.data, b.data[SAVE_KEY]); assert.deepEqual(r.extras, { classLog: {}, activity: {}, review: { content: {}, schedule: {} } }); });
test('坏 JSON', () => assert.throws(() => readPracticeBackup('{'), /JSON/));
for (const [field, value, pattern] of [['app', 'other', /不是开窍/], ['kind', 'other', /不是开窍/], ['version', 99, /版本/], ['version', undefined, /版本/], ['data', undefined, /缺少/], ['data', [], /缺少/]] as const) test(`错误字段 ${field}:${value}`, () => assert.throws(() => readPracticeBackup(JSON.stringify({ ...backup(), [field]: value })), pattern));
for (const key of Object.keys(data())) test(`拒绝错误值 ${key}`, () => assert.throws(() => readPracticeBackup(JSON.stringify({ ...backup(), data: { ...data(), [key]: 'bad' } }))));
test('拒绝损坏条目而非静默删去', () => assert.throws(() => readPracticeBackup(JSON.stringify({ ...backup(), data: { ...data(), [CLASS_LOG_KEY]: { circle: { attempts: 'x' } } } })), /课堂/));
test('超大文件', () => assert.throws(() => readPracticeBackup(' '.repeat(BACKUP_LIMIT + 1)), /2 MB/));
test('未知键忽略并报告数量', () => { const b = backup(); const r = readPracticeBackup(JSON.stringify({ ...b, data: { ...b.data, unknown: {} } })); assert.equal(r.ignored, 1); assert.equal('unknown' in r.extras!, false); });
test('文件名', () => assert.equal(backupFilename(new Date(2026, 9, 29, 8, 3)), '开窍练习备份-20261029-0803.json'));

test('旧 format:1 带 extras 和复习数据往返新备份', () => {
 const original = { ...emptyPersist(), selectedGrade: 5 as const, stats: { answered: 3, correct: 2 } };
 const extras = { classLog: {}, activity: {}, review: { content: {}, schedule: {} } };
 const restored = readPracticeBackup(exportBackup(original, extras));
 assert.deepEqual(restored.data, original); assert.deepEqual(restored.extras, extras);
 const next = createPracticeBackup({ [SAVE_KEY]: restored.data, [CLASS_LOG_KEY]: restored.extras!.classLog, [ACTIVITY_KEY]: restored.extras!.activity, [REVIEW_CONTENT_KEY]: {}, [REVIEW_SCHEDULE_KEY]: {} }, 'https://www.yanghat.cn');
 assert.deepEqual(readPracticeBackup(JSON.stringify(next)).data, original);
});
test('旧 format:1 无 extras 保持 null，不覆盖本机课堂/每日题数', () => {
 const result = readPracticeBackup(JSON.stringify({ app: 'kaiqiao', format: 1, data: emptyPersist() }));
 assert.equal(result.extras, null); assert.equal(result.exportedAt, null);
});
for (const patch of [{ data: { ...emptyPersist(), stats: { answered: -1, correct: 0 } } }, { extras: {} }, { extras: { classLog: { circle: { attempts: 'bad' } }, activity: {} } }, { extras: { classLog: {}, activity: { invalid: {} } } }, { extras: { classLog: {}, activity: {}, review: 'bad' } }, { exportedAt: 'bad' }]) {
 test('旧 format:1 损坏数据拒绝 '+JSON.stringify(patch), () => assert.throws(() => readPracticeBackup(JSON.stringify({ app:'kaiqiao',format:1,data:emptyPersist(),...patch }))));
}
test('旧格式也限制 2 MB，未知版本拒绝', () => {
 assert.throws(() => readPracticeBackup(JSON.stringify({ app:'kaiqiao',format:1,data:emptyPersist(),padding:'x'.repeat(BACKUP_LIMIT) })), /2 MB/);
 assert.throws(() => readPracticeBackup(JSON.stringify({ app:'kaiqiao',format:2,data:emptyPersist() })));
});
