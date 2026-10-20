import type { DemoId } from "./demos.ts";
import { isDemoId } from "./demos.ts";

/**
 * 课堂练习记录：只保存在本浏览器（键名 kaiqiao-class-log），
 * 每个演示只记“做了几题、对了几题、最近一次时间”，不保存题目内容和孩子的其他信息。
 * 与原有学情存档分开保存，互不覆盖。
 */
export const CLASS_LOG_KEY = "kaiqiao-class-log";

export type ClassLog = Partial<Record<DemoId, { attempts: number; correct: number; lastAt: number }>>;

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

export function loadClassLog(store: KV | undefined): ClassLog {
  try {
    const raw = store?.getItem(CLASS_LOG_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const out: ClassLog = {};
    if (data && typeof data === "object") for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      const r = v as { attempts?: unknown; correct?: unknown; lastAt?: unknown };
      if (isDemoId(k) && Number.isInteger(r?.attempts) && Number.isInteger(r?.correct) && (r.attempts as number) >= (r.correct as number) && (r.correct as number) >= 0)
        out[k] = { attempts: r.attempts as number, correct: r.correct as number, lastAt: Number(r.lastAt) || 0 };
    }
    return out;
  } catch { return {}; }
}

export function recordAnswer(store: KV | undefined, demo: DemoId, ok: boolean, now = Date.now()): ClassLog {
  const log = loadClassLog(store);
  const cur = log[demo] ?? { attempts: 0, correct: 0, lastAt: 0 };
  log[demo] = { attempts: cur.attempts + 1, correct: cur.correct + (ok ? 1 : 0), lastAt: now };
  try { store?.setItem(CLASS_LOG_KEY, JSON.stringify(log)); } catch { /* 存储满或被禁用时不影响上课 */ }
  return log;
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
