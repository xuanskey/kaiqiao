import { CHAPTERS } from './chapters.ts';
import type { Question, WrongItem } from './types.ts';

export const REVIEW_CONTENT_KEY = 'kaiqiao.review.content.v1';
export const REVIEW_SCHEDULE_KEY = 'kaiqiao.review.schedule.v1';
export type ReviewSchedule = { dueAt: number; stage: number; lastReviewedAt: number | null; lastExposedAt?: number; linkGroupId: string };
export type ReviewData = { content: Record<string, WrongItem>; schedule: Record<string, ReviewSchedule> };
export const emptyReview = (): ReviewData => ({ content: {}, schedule: {} });
export const reviewId = (q: Pick<WrongItem, 'chapterId' | 'prompt' | 'answer'>) => JSON.stringify([q.chapterId, q.prompt, q.answer]);
const DAY = 86400000;
/** 统一北京时间零点，不依赖设备时区。次日 / 3 天 / 7 天是待验证的产品假设，并非 FSRS。 */
export function reviewDay(now: number, days = 0): number { return Math.floor((now + 8 * 3600000) / DAY) * DAY - 8 * 3600000 + days * DAY; }
export function linkGroup(q: WrongItem | Question): string {
  // 同知识点中使用同组数字的反向题关联；不把整个知识点当作一个组。
  return JSON.stringify([q.chapterId, q.skill ?? '', (q.prompt.match(/\d+(?:\.\d+)?/g) ?? [q.prompt]).sort()]);
}
export function enqueueReview(data: ReviewData, q: WrongItem, now: number, group = linkGroup(q)): ReviewData {
  const id = reviewId(q);
  if (data.schedule[id]) return data; // 主动再练不能推进或重置已有调度。
  return { content: { ...data.content, [id]: q }, schedule: { ...data.schedule, [id]: { dueAt: reviewDay(now, 1), stage: 0, lastReviewedAt: null, linkGroupId: group } } };
}
export function dueReviews(data: ReviewData, grade: number, now = Date.now()): string[] {
  const chapters = new Set(CHAPTERS.filter(c => c.grade === grade).map(c => c.id));
  return Object.keys(data.schedule).filter(id => data.content[id] && chapters.has(data.content[id].chapterId) && data.schedule[id].dueAt <= now)
    .sort((a, b) => data.schedule[a].dueAt - data.schedule[b].dueAt || a.localeCompare(b));
}
export function exposeReview(data: ReviewData, id: string, now: number): ReviewData {
  if (!data.schedule[id]) return data;
  return { ...data, schedule: { ...data.schedule, [id]: { ...data.schedule[id], lastExposedAt: now } } };
}
export function finishReview(data: ReviewData, id: string, ok: boolean, now: number): ReviewData {
  const prev = data.schedule[id];
  if (!prev || prev.dueAt > now) return data; // 重复提交 / 当天再练不重复推进。
  const exposed = prev.lastExposedAt !== undefined && prev.lastExposedAt >= reviewDay(now);
  const stage = ok ? exposed ? prev.stage : Math.min(prev.stage + 1, 2) : 0;
  const schedule = { ...data.schedule, [id]: { ...prev, stage, dueAt: reviewDay(now, exposed ? 1 : [1, 3, 7][stage]), lastReviewedAt: now } };
  for (const [other, state] of Object.entries(schedule)) {
    if (other !== id && state.linkGroupId === prev.linkGroupId && state.dueAt <= now) schedule[other] = { ...state, dueAt: reviewDay(now, 1) };
  }
  return { content: data.content, schedule };
}
export function parseReview(value: unknown): ReviewData {
  const fail = (): never => { throw new Error('复习存档格式不正确，原数据已保留。'); };
  const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(value) || !obj(value.content) || !obj(value.schedule)) return fail();
  const data = emptyReview();
  for (const [id, q] of Object.entries(value.content)) {
    if (!obj(q) || !['prompt', 'answer', 'explain', 'given', 'chapterId'].every(k => typeof q[k] === 'string') || !q.prompt || !q.answer || !CHAPTERS.some(c => c.id === q.chapterId) || !Number.isSafeInteger(q.at) || q.at < 0 || !['keypad', 'choice', undefined].includes(q.mode) || !['int', 'dec', 'remainder', undefined].includes(q.keypad)) return fail();
    if ((q.skill !== undefined && typeof q.skill !== 'string') || (q.trap !== undefined && typeof q.trap !== 'string')) return fail();
    if (q.choices !== undefined && (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4 || !q.choices.every((c: unknown) => typeof c === 'string') || !q.choices.includes(q.answer))) return fail();
    if (q.mode === 'choice' && !q.choices) return fail();
    if (id !== reviewId(q as WrongItem)) return fail();
    data.content[id] = q as WrongItem;
  }
  for (const [id, s] of Object.entries(value.schedule)) {
    if (!data.content[id] || !obj(s) || !Number.isSafeInteger(s.dueAt) || s.dueAt < 0 || ![0, 1, 2].includes(s.stage) || !(s.lastReviewedAt === null || Number.isSafeInteger(s.lastReviewedAt) && s.lastReviewedAt >= 0) || typeof s.linkGroupId !== 'string') return fail();
    if (s.lastExposedAt !== undefined && (!Number.isSafeInteger(s.lastExposedAt) || s.lastExposedAt < 0)) return fail();
    data.schedule[id] = { ...(s.lastExposedAt !== undefined ? { lastExposedAt: s.lastExposedAt } : {}), dueAt: s.dueAt, stage: s.stage, lastReviewedAt: s.lastReviewedAt, linkGroupId: s.linkGroupId };
  }
  return data;
}
