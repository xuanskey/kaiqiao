import { activityForBackup, type Activity } from "../activity.ts";
import { classLogForBackup, type ClassLogEntry } from "../lesson/class-log.ts";
import { unitById } from "./units.ts";
import { CHAPTERS } from "./chapters.ts";
import { isSkillId } from "./skills.ts";
import type { Grade, SkillStat, WrongItem } from "./types.ts";

export const SAVE_KEY = "kaiqiao.save.v1";
/** 本机存档无法完整读取时，原始文本另存到这个键（已存在不同内容时加时间戳），绝不直接丢弃。 */
export const UNREADABLE_KEY = "kaiqiao.save.v1.unreadable";
export const SAVE_VERSION = 4;
export const MAX_BACKUP_BYTES = 1_000_000;
export type UnitResult = { completed: number; correct: number; total: number; at: number; mode: "practice" | "check" };
export type PersistShape = {
  unitStats: Record<string, UnitResult>;
  version: number;
  selectedGrade: Grade;
  dailyByGrade: Record<string, string>;
  stars: Record<string, number>;
  xp: number;
  streak: number;
  lastPlayDate: string;
  lastDaily: string;
  wrong: WrongItem[];
  stats: { answered: number; correct: number };
  muted: boolean;
  skillStats: Record<string, SkillStat>;
  sprintBest: number;
};

export const emptyPersist = (): PersistShape => ({
  unitStats: {}, version: SAVE_VERSION, selectedGrade: 3, dailyByGrade: {}, stars: {}, xp: 0,
  streak: 0, lastPlayDate: "", lastDaily: "", wrong: [],
  stats: { answered: 0, correct: 0 }, muted: false, skillStats: {}, sprintBest: 0,
});

function record(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function count(x: unknown, max = Number.MAX_SAFE_INTEGER): x is number {
  return typeof x === "number" && Number.isSafeInteger(x) && x >= 0 && x <= max;
}
function text(x: unknown, limit = 2000): x is string {
  return typeof x === "string" && x.length <= limit;
}
function stamp(x: unknown): x is string {
  if (x === "") return true;
  if (typeof x !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const date = new Date(`${x}T12:00:00Z`);
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === x;
}
function invalid(): never { throw new Error("存档格式不正确，原有记录未被替换。"); }

type Raw = Record<string, unknown>;
const knownChapters = () => new Set(CHAPTERS.map((c) => c.id));

function validStar(key: string, n: unknown, known: Set<string>): n is number {
  const [chapter, level, extra] = key.split(":");
  return known.has(chapter) && /^[1-8]$/.test(level ?? "") && extra === undefined && count(n, 3);
}
function validWrong(w: unknown, known: Set<string>): WrongItem | null {
  if (!record(w) || !text(w.prompt) || !w.prompt.trim() || !text(w.answer, 100) || !w.answer.trim() || !text(w.explain) || !text(w.given, 100) || !text(w.chapterId, 30) || !known.has(w.chapterId) || !count(w.at)) return null;
  if (w.mode !== undefined && w.mode !== "keypad" && w.mode !== "choice") return null;
  if (w.keypad !== undefined && !["int", "dec", "remainder"].includes(String(w.keypad))) return null;
  if (w.trap !== undefined && !text(w.trap)) return null;
  if (w.skill !== undefined && (typeof w.skill !== "string" || !isSkillId(w.skill))) return null;
  if (w.choices !== undefined && (!Array.isArray(w.choices) || w.choices.length < 2 || w.choices.length > 4 || !w.choices.every((c) => text(c, 100)) || !w.choices.includes(w.answer))) return null;
  if (w.mode === "choice" && !w.choices) return null;
  return { prompt: w.prompt, answer: w.answer, explain: w.explain, given: w.given, chapterId: w.chapterId, at: w.at,
    mode: w.mode as WrongItem["mode"], keypad: w.keypad as WrongItem["keypad"], choices: w.choices as string[] | undefined,
    skill: w.skill as string | undefined, trap: w.trap as string | undefined };
}
function validSkill(id: string, s: unknown): SkillStat | null {
  if (!isSkillId(id) || !record(s) || !count(s.seen) || !count(s.correct, s.seen) || typeof s.sumMs !== "number" || !Number.isFinite(s.sumMs) || s.sumMs < 0) return null;
  const firstSeen = s.firstSeen ?? 0, firstCorrect = s.firstCorrect ?? 0;
  const retrySeen = s.retrySeen ?? 0, retryCorrect = s.retryCorrect ?? 0;
  if (!count(firstSeen, s.seen) || !count(firstCorrect, firstSeen) || !count(retrySeen, s.seen) || !count(retryCorrect, retrySeen)
    || firstSeen + retrySeen > s.seen || firstCorrect + retryCorrect > s.correct
    || firstSeen - firstCorrect + retrySeen - retryCorrect > s.seen - s.correct) return null;
  return { seen: s.seen, correct: s.correct, sumMs: s.sumMs, firstSeen, firstCorrect, retrySeen, retryCorrect };
}
function validUnit(id: string, result: unknown): UnitResult | null {
  if (!unitById(id) || !record(result) || !count(result.completed) || result.completed < 1 || !count(result.total, 100) || result.total < 1 || !count(result.correct, result.total) || !count(result.at) || !["practice", "check"].includes(String(result.mode))) return null;
  return { completed: result.completed, correct: result.correct, total: result.total, at: result.at, mode: result.mode as "practice" | "check" };
}
const validGrade = (g: unknown): g is Grade => count(g, 6) && g >= 1;

/** Validate before applying. v1/v2 saves retain all supported historical fields. */
export function parseSave(value: unknown): PersistShape {
  if (!record(value) || !count(value.version, SAVE_VERSION) || value.version < 1) return invalid();
  const out = emptyPersist();
  if (!record(value.stars) || !Array.isArray(value.wrong) || !record(value.stats)) return invalid();
  if (!count(value.xp) || !count(value.streak) || !stamp(value.lastPlayDate) || !stamp(value.lastDaily) || typeof value.muted !== "boolean") return invalid();
  out.xp = value.xp; out.streak = value.streak;
  out.lastPlayDate = value.lastPlayDate; out.lastDaily = value.lastDaily; out.muted = value.muted;
  const known = knownChapters();
  for (const [key, n] of Object.entries(value.stars)) {
    if (!validStar(key, n, known)) return invalid();
    out.stars[key] = n;
  }
  if (!count(value.stats.answered) || !count(value.stats.correct, value.stats.answered)) return invalid();
  out.stats = { answered: value.stats.answered, correct: value.stats.correct };
  if (value.wrong.length > 40) return invalid();
  for (const w of value.wrong) {
    const item = validWrong(w, known);
    if (!item) return invalid();
    out.wrong.push(item);
  }
  if (value.skillStats !== undefined) {
    if (!record(value.skillStats)) return invalid();
    for (const [id, s] of Object.entries(value.skillStats)) {
      const stat = validSkill(id, s);
      if (!stat) return invalid();
      out.skillStats[id] = stat;
    }
  }
  if (value.sprintBest !== undefined) {
    if (!count(value.sprintBest)) return invalid();
    out.sprintBest = value.sprintBest;
  }
  if (value.selectedGrade !== undefined) {
    if (!validGrade(value.selectedGrade)) return invalid();
    out.selectedGrade = value.selectedGrade;
  }
  if (value.dailyByGrade !== undefined) {
    if (!record(value.dailyByGrade)) return invalid();
    for (const [grade, date] of Object.entries(value.dailyByGrade)) {
      if (!/^[1-6]$/.test(grade) || !stamp(date)) return invalid();
      out.dailyByGrade[grade] = date;
    }
  }
  if (value.unitStats !== undefined) {
    if (!record(value.unitStats)) return invalid();
    for (const [id, result] of Object.entries(value.unitStats)) {
      const unit = validUnit(id, result);
      if (!unit) return invalid();
      out.unitStats[id] = unit;
    }
  }
  return out;
}

/**
 * 容错读取：本机存档里个别记录损坏（类型不对、缺字段、未知章节等）时，保留能识别的部分，跳过坏的条目。
 * 只用于读取本机存档；调用方必须先把原始文本另存一份，再写回。
 * 不是对象、或者是更新版本写的存档（version 大于当前）时返回 null，不做猜测。
 */
export function salvageSave(value: unknown): { data: PersistShape; dropped: number } | null {
  if (!record(value)) return null;
  const v = value as Raw;
  if (v.version !== undefined && (typeof v.version !== "number" || v.version > SAVE_VERSION)) return null;
  const out = emptyPersist();
  let dropped = 0;
  const take = (ok: boolean, apply: () => void) => { if (ok) apply(); else dropped++; };
  if (v.xp !== undefined) take(count(v.xp), () => { out.xp = v.xp as number; });
  if (v.streak !== undefined) take(count(v.streak), () => { out.streak = v.streak as number; });
  if (v.lastPlayDate !== undefined) take(stamp(v.lastPlayDate), () => { out.lastPlayDate = v.lastPlayDate as string; });
  if (v.lastDaily !== undefined) take(stamp(v.lastDaily), () => { out.lastDaily = v.lastDaily as string; });
  if (v.muted !== undefined) take(typeof v.muted === "boolean", () => { out.muted = v.muted as boolean; });
  if (v.sprintBest !== undefined) take(count(v.sprintBest), () => { out.sprintBest = v.sprintBest as number; });
  if (v.selectedGrade !== undefined) take(validGrade(v.selectedGrade), () => { out.selectedGrade = v.selectedGrade as Grade; });
  if (v.stats !== undefined) {
    const st = v.stats;
    take(record(st) && count(st.answered) && count(st.correct, st.answered), () => { const x = st as { answered: number; correct: number }; out.stats = { answered: x.answered, correct: x.correct }; });
  }
  const known = knownChapters();
  if (record(v.stars)) for (const [key, n] of Object.entries(v.stars)) take(validStar(key, n, known), () => { out.stars[key] = n as number; });
  else if (v.stars !== undefined) dropped++;
  if (Array.isArray(v.wrong)) for (const w of v.wrong) { const item = validWrong(w, known); if (item && out.wrong.length < 40) out.wrong.push(item); else dropped++; }
  else if (v.wrong !== undefined) dropped++;
  if (record(v.skillStats)) for (const [id, s] of Object.entries(v.skillStats)) { const stat = validSkill(id, s); take(!!stat, () => { out.skillStats[id] = stat!; }); }
  else if (v.skillStats !== undefined) dropped++;
  if (record(v.dailyByGrade)) for (const [g, d] of Object.entries(v.dailyByGrade)) take(/^[1-6]$/.test(g) && stamp(d), () => { out.dailyByGrade[g] = d as string; });
  else if (v.dailyByGrade !== undefined) dropped++;
  if (record(v.unitStats)) for (const [id, r] of Object.entries(v.unitStats)) { const unit = validUnit(id, r); take(!!unit, () => { out.unitStats[id] = unit!; }); }
  else if (v.unitStats !== undefined) dropped++;
  return { data: out, dropped };
}

/** 与主存档分开保存的课堂记录、最近 60 天每日题数。旧备份没有这一段时为 null。 */
export type BackupExtras = { classLog: Record<string, ClassLogEntry>; activity: Activity };

export function exportBackup(data: PersistShape, extras?: BackupExtras | null): string {
  const payload: Record<string, unknown> = { app: "kaiqiao", format: 1, exportedAt: new Date().toISOString(), data: parseSave(data) };
  if (extras) payload.extras = { classLog: classLogForBackup(extras.classLog), activity: activityForBackup(extras.activity) };
  return JSON.stringify(payload, null, 2);
}

export function readBackup(raw: string): { data: PersistShape; extras: BackupExtras | null } {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) throw new Error("备份超过 1 MB，请选择开窍导出的 JSON 文件。");
  let backup: unknown;
  try { backup = JSON.parse(raw); } catch { throw new Error("文件不是有效的 JSON 备份。"); }
  if (!record(backup) || backup.app !== "kaiqiao" || backup.format !== 1) throw new Error("请选择开窍导出的备份文件。");
  const data = parseSave(backup.data);
  if (backup.extras === undefined || backup.extras === null) return { data, extras: null };
  if (!record(backup.extras) || !("classLog" in backup.extras) || !("activity" in backup.extras)) throw new Error("这份备份的课堂记录或每日题数不完整，没有恢复任何内容。");
  return { data, extras: { classLog: classLogForBackup(backup.extras.classLog), activity: activityForBackup(backup.extras.activity) } };
}

export function importBackup(raw: string): PersistShape {
  return readBackup(raw).data;
}
