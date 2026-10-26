import type { DemoId } from "./demos.ts";
import { isDemoId } from "./demos.ts";

/**
 * 课堂练习记录：只保存在本浏览器（键名 kaiqiao-class-log），
 * 每个演示只记“做了几题、对了几题、最近一次时间”，不保存题目内容和孩子的其他信息。
 * 与原有学情存档分开保存，互不覆盖。
 */
export const CLASS_LOG_KEY = "kaiqiao-class-log";

export type ClassLogEntry = { attempts: number; correct: number; lastAt: number };
export type ClassLog = Partial<Record<DemoId, ClassLogEntry>>;

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

export function classLogEntry(v: unknown): ClassLogEntry | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as { attempts?: unknown; correct?: unknown; lastAt?: unknown };
  const attempts = r.attempts;
  const correct = r.correct;
  if (typeof attempts !== "number" || typeof correct !== "number" || !Number.isSafeInteger(attempts) || !Number.isSafeInteger(correct)) return null;
  if (attempts < correct || correct < 0 || attempts > 1_000_000) return null;
  const lastAt = typeof r.lastAt === "number" && Number.isFinite(r.lastAt) && r.lastAt >= 0 ? r.lastAt : 0;
  return { attempts, correct, lastAt };
}

/** 备份用：保留不认识但格式合法的课，避免把更新版本的记录删掉。条目过多则拒绝整份。 */
export function classLogForBackup(data: unknown): Record<string, ClassLogEntry> {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("课堂记录格式不正确。");
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length > 200) throw new Error("课堂记录条目过多。");
  const out: Record<string, ClassLogEntry> = {};
  for (const [k, v] of entries) {
    if (!/^[a-z0-9-]{1,40}$/.test(k)) continue;
    const entry = classLogEntry(v);
    if (entry) out[k] = entry;
  }
  return out;
}

export function loadClassLog(store: KV | undefined): ClassLog {
  try {
    const raw = store?.getItem(CLASS_LOG_KEY);
    if (!raw) return {};
    const out: ClassLog = {};
    for (const [k, v] of Object.entries(classLogForBackup(JSON.parse(raw)))) if (isDemoId(k)) out[k] = v;
    return out;
  } catch { return {}; }
}

/** 导出备份时读取。原始内容读不懂时 ok 为 false，避免用空记录覆盖。 */
export function readStoredClassLog(store: KV | undefined): { ok: true; log: Record<string, ClassLogEntry> } | { ok: false } {
  const raw = store?.getItem(CLASS_LOG_KEY);
  if (!raw) return { ok: true, log: {} };
  try { return { ok: true, log: classLogForBackup(JSON.parse(raw)) }; } catch { return { ok: false }; }
}

/**
 * 写入前读出原始内容：能识别的对象原样保留其他键（包括本版本不认识的课），只更新这一课；
 * 原始内容不是合法 JSON 对象时，先另存到 `${CLASS_LOG_KEY}.unreadable` 再重新记录，不直接覆盖丢弃。
 */
export function recordAnswer(store: KV | undefined, demo: DemoId, ok: boolean, now = Date.now()): ClassLog {
  const log = loadClassLog(store);
  const cur = log[demo] ?? { attempts: 0, correct: 0, lastAt: 0 };
  log[demo] = { attempts: cur.attempts + 1, correct: cur.correct + (ok ? 1 : 0), lastAt: now };
  try {
    const raw = store?.getItem(CLASS_LOG_KEY) ?? null;
    let base: Record<string, unknown> = {};
    if (raw) {
      let parsed: unknown = null;
      try { parsed = JSON.parse(raw); } catch { /* 下面另存 */ }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) base = parsed as Record<string, unknown>;
      else if (!keepCopy(store, `${CLASS_LOG_KEY}.unreadable`, raw)) return log; // 另存失败就不写，保护原数据
    }
    store?.setItem(CLASS_LOG_KEY, JSON.stringify({ ...base, [demo]: log[demo] }));
  } catch { /* 存储满或被禁用时不影响上课 */ }
  return log;
}

/** 把原始文本另存一份（已有相同内容视为成功），写后读回确认。 */
export function keepCopy(store: Pick<KV, "getItem" | "setItem"> | undefined, key: string, raw: string): boolean {
  try {
    if (store?.getItem(key) === raw) return true;
    const target = store?.getItem(key) == null ? key : `${key}-${Date.now()}`;
    store?.setItem(target, raw);
    return store?.getItem(target) === raw;
  } catch { return false; }
}

export function clearClassLog(store: KV | undefined) {
  try { store?.removeItem(CLASS_LOG_KEY); } catch { /* 忽略 */ }
}

/** 掌握程度：至少做 3 题才给出判断，避免一两题就下结论。 */
export function masteryOf(entry: { attempts: number; correct: number } | undefined): { label: string; rate: number | null } {
  if (!entry || entry.attempts === 0) return { label: "还没练习", rate: null };
  const rate = entry.correct / entry.attempts;
  if (entry.attempts < 3) return { label: "再多做几题", rate };
  return { label: rate >= 0.85 ? "掌握得不错" : rate >= 0.6 ? "基本掌握" : "需要再练练", rate };
}
