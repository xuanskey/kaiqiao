import { shiftStamp, todayStamp } from "./math/progress.ts";

/**
 * 每天做了多少题：只在本浏览器保存“日期 → 题数、答对数”，最多保留 60 天，
 * 不保存题目内容。与学情存档分开保存（键名 kaiqiao-activity），互不影响。
 */
export const ACTIVITY_KEY = "kaiqiao-activity";
export const KEEP_DAYS = 60;

export type DayStat = { n: number; ok: number };
export type Activity = Record<string, DayStat>;
type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void };

const STAMP = /^\d{4}-\d{2}-\d{2}$/;

export function loadActivity(store: KV | undefined): Activity {
  try {
    const data = JSON.parse(store?.getItem(ACTIVITY_KEY) ?? "{}") as Record<string, unknown>;
    const out: Activity = {};
    if (data && typeof data === "object") for (const [k, v] of Object.entries(data)) {
      const r = v as { n?: unknown; ok?: unknown };
      if (STAMP.test(k) && Number.isInteger(r?.n) && Number.isInteger(r?.ok) && (r.n as number) >= (r.ok as number) && (r.ok as number) >= 0) out[k] = { n: r.n as number, ok: r.ok as number };
    }
    return out;
  } catch { return {}; }
}

export function prune(a: Activity, today: string): Activity {
  const oldest = shiftStamp(today, -(KEEP_DAYS - 1));
  return Object.fromEntries(Object.entries(a).filter(([k]) => k >= oldest));
}

export function recordActivity(store: KV | undefined, ok: boolean, now = new Date()): Activity {
  const today = todayStamp(now);
  const a = loadActivity(store);
  const d = a[today] ?? { n: 0, ok: 0 };
  a[today] = { n: d.n + 1, ok: d.ok + (ok ? 1 : 0) };
  const next = prune(a, today);
  try { store?.setItem(ACTIVITY_KEY, JSON.stringify(next)); } catch { /* 存储已满或隐私模式时忽略，不影响练习 */ }
  return next;
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** 最近 7 天（含今天），从早到晚。 */
export function lastSevenDays(a: Activity, now = new Date()): { stamp: string; label: string; n: number; ok: number; today: boolean }[] {
  const today = todayStamp(now);
  return Array.from({ length: 7 }, (_, i) => {
    const stamp = shiftStamp(today, i - 6);
    const [y, m, d] = stamp.split("-").map(Number);
    const day = new Date(y, m - 1, d).getDay();
    const s = a[stamp] ?? { n: 0, ok: 0 };
    return { stamp, label: i === 6 ? "今天" : `周${WEEK[day]}`, n: s.n, ok: s.ok, today: i === 6 };
  });
}

export function weekSummary(a: Activity, now = new Date()) {
  const days = lastSevenDays(a, now);
  const n = days.reduce((x, d) => x + d.n, 0), ok = days.reduce((x, d) => x + d.ok, 0);
  return { days, n, ok, activeDays: days.filter((d) => d.n > 0).length, rate: n ? Math.round((ok / n) * 100) : null };
}
