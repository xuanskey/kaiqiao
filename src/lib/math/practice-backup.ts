import { SAVE_KEY, parseSave, type PersistShape, type BackupExtras } from './save.ts';
import { REVIEW_CONTENT_KEY, REVIEW_SCHEDULE_KEY, parseReview } from './review.ts';
import { CLASS_LOG_KEY, classLogForBackup, classLogEntry } from '../lesson/class-log.ts';
import { ACTIVITY_KEY, activityForBackup, parseActivityRecord } from '../activity.ts';
export const BACKUP_LIMIT = 2 * 1024 * 1024;
export const PRACTICE_KEYS = [SAVE_KEY, CLASS_LOG_KEY, ACTIVITY_KEY, REVIEW_CONTENT_KEY, REVIEW_SCHEDULE_KEY] as const;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function checked(data: unknown) {
  if (!obj(data) || !PRACTICE_KEYS.every(k => Object.hasOwn(data, k))) throw new Error('备份缺少练习记录，请选择完整备份。');
  const save = parseSave(data[SAVE_KEY]);
  const log = classLogForBackup(data[CLASS_LOG_KEY]);
  if (!obj(data[CLASS_LOG_KEY]) || Object.entries(data[CLASS_LOG_KEY]).some(([k, v]) => !/^[a-z0-9-]{1,40}$/.test(k) || !classLogEntry(v))) throw new Error('课堂记录格式不正确，原有记录未改变。');
  const activityRaw = data[ACTIVITY_KEY];
  const activity = parseActivityRecord(activityRaw);
  if (!obj(activityRaw) || Object.keys(activity).length !== Object.keys(activityRaw).length) throw new Error('每日题数格式不正确，原有记录未改变。');
  const review = parseReview({ content: data[REVIEW_CONTENT_KEY], schedule: data[REVIEW_SCHEDULE_KEY] });
  return { save, log, activity: activityForBackup(activity), review };
}
export function createPracticeBackup(data: Record<string, unknown>, origin: string, exportedAt = new Date().toISOString()) {
  const { save, log, activity, review } = checked(data);
  return { app: 'kaiqiao', kind: 'practice-backup', version: 1, exportedAt, origin,
    data: { [SAVE_KEY]: save, [CLASS_LOG_KEY]: log, [ACTIVITY_KEY]: activity, [REVIEW_CONTENT_KEY]: review.content, [REVIEW_SCHEDULE_KEY]: review.schedule } };
}
export type PracticeImport = { data: PersistShape; extras: BackupExtras | null; exportedAt: string | null; ignored: number };
export function readPracticeBackup(raw: string): PracticeImport {
  if (new TextEncoder().encode(raw).length > BACKUP_LIMIT) throw new Error('文件超过 2 MB，请选择开窍导出的 JSON 备份。');
  let b: unknown;
  try { b = JSON.parse(raw); } catch { throw new Error('文件不是有效的 JSON，请选择开窍导出的备份。'); }
  // Historical main@17a2502 envelope: same strict validators, same UI confirmation/restore transaction.
  if (obj(b) && b.app === 'kaiqiao' && b.format === 1 && !Object.hasOwn(b, 'kind')) {
    const save = parseSave(b.data);
    const exportedAt = b.exportedAt === undefined ? null : b.exportedAt;
    if (exportedAt !== null && (typeof exportedAt !== 'string' || !Number.isFinite(Date.parse(exportedAt)))) throw new Error('备份时间格式不正确。');
    if (b.extras === undefined || b.extras === null) return { data: save, extras: null, exportedAt, ignored: 0 };
    if (!obj(b.extras) || !Object.hasOwn(b.extras, 'classLog') || !Object.hasOwn(b.extras, 'activity')) throw new Error('备份的课堂记录或每日题数不完整。');
    const review = b.extras.review === undefined ? undefined : parseReview(b.extras.review);
    const normalized = checked({ [SAVE_KEY]: save, [CLASS_LOG_KEY]: b.extras.classLog, [ACTIVITY_KEY]: b.extras.activity,
      [REVIEW_CONTENT_KEY]: review?.content ?? {}, [REVIEW_SCHEDULE_KEY]: review?.schedule ?? {} });
    return { data: normalized.save, extras: { classLog: normalized.log, activity: normalized.activity, ...(review ? { review } : {}) }, exportedAt,
      ignored: Object.keys(b.extras).filter(k => !['classLog', 'activity', 'review'].includes(k)).length };
  }
  if (!obj(b) || b.app !== 'kaiqiao' || b.kind !== 'practice-backup') throw new Error('这不是开窍练习备份，请检查文件。');
  if (b.version !== 1) throw new Error('备份版本缺失或暂不支持，请使用匹配版本的开窍。');
  if (typeof b.exportedAt !== 'string' || !Number.isFinite(Date.parse(b.exportedAt)) || typeof b.origin !== 'string') throw new Error('备份时间或来源格式不正确。');
  const { save, log, activity, review } = checked(b.data);
  return { data: save, extras: { classLog: log, activity, review }, exportedAt: b.exportedAt,
    ignored: Object.keys(b.data as object).filter(k => !(PRACTICE_KEYS as readonly string[]).includes(k)).length };
}
export function backupFilename(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `开窍练习备份-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.json`;
}
