import type { Grade } from "../math/types.ts";
import { DEMOS, DEMO_LIST, isDemoId, type DemoDef, type DemoId } from "./demo-defs.ts";
import type { ClassLog } from "./class-log.ts";

/** 首页“今日”板块用到的纯函数：问候语、日期、按天轮换的推荐课，都可以单独测试。 */

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export function greeting(hour: number): string {
  if (hour < 5) return "夜深了";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export function dateLabel(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${WEEK[d.getDay()]}`;
}

/** 以本地日期计算的“第几天”，同一天内推荐保持不变，第二天自动换。 */
export function dayIndex(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

function pick<T>(list: T[], d: Date, salt: number): T | undefined {
  if (!list.length) return undefined;
  return list[(dayIndex(d) + salt) % list.length];
}

/** 当天推荐：一节本年级的数学互动课 + 一个科学实验（本年级没有就取最接近的年级）。 */
export function todayPicks(grade: Grade, d: Date): { math?: DemoDef; science?: DemoDef } {
  const math = DEMO_LIST.filter((x) => x.subject === "math" && x.grades.includes(grade));
  let science = DEMO_LIST.filter((x) => x.subject === "science" && x.grades.includes(grade));
  if (!science.length) {
    const dist = (x: DemoDef) => Math.min(...x.grades.map((g) => Math.abs(g - grade)));
    const all = DEMO_LIST.filter((x) => x.subject === "science");
    const best = Math.min(...all.map(dist));
    science = all.filter((x) => dist(x) === best);
  }
  return { math: pick(math, d, grade), science: pick(science, d, grade * 3 + 1) };
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 课堂练习记录汇总：今天有没有上过课、一共做了多少题。 */
export function classSummary(log: ClassLog, now: Date): { today: boolean; attempts: number; correct: number; lastDemo?: DemoId } {
  let attempts = 0, correct = 0, last = 0, lastDemo: DemoId | undefined;
  for (const [id, e] of Object.entries(log) as [DemoId, NonNullable<ClassLog[DemoId]>][]) {
    attempts += e.attempts; correct += e.correct;
    if (e.lastAt > last) { last = e.lastAt; lastDemo = id; }
  }
  return { today: last > 0 && sameDay(new Date(last), now), attempts, correct, lastDemo };
}

/** 从首页跳到课堂并直接打开某节课。只在内存中传递，不写入存档。 */
let pending: { demo: DemoId; grade: Grade; unit: string } | null = null;
export function requestLesson(demo: DemoId, grade: Grade, unit = "今日推荐"): void { pending = { demo, grade, unit }; }
export function peekLesson() { return pending; }
export function clearLesson(): void { pending = null; }

/** 外部链接直达某节课：?lesson=decimal-div&grade=5。年级不适用时取这节课的第一个年级；无效参数返回 null。 */
export function lessonFromSearch(search: string): { demo: DemoId; grade: Grade } | null {
  const q = new URLSearchParams(search);
  const demo = q.get("lesson");
  if (!isDemoId(demo)) return null;
  const g = Number(q.get("grade"));
  const grades = DEMOS[demo].grades;
  return { demo, grade: (grades.includes(g as Grade) ? g : grades[0]) as Grade };
}
