import type { Grade } from "../math/types.ts";
import { DEMOS, type DemoId } from "./demos.ts";
import { fmtScaled } from "./num.ts";

/**
 * 文本资料导入（Markdown / 纯文本）：逐行识别标题、题目和算式，
 * 对能算的算式独立计算答案，对超出年级或识别不清的内容给出提示，
 * 每一条都保留原文行号，方便家长核对。不会执行文本中的任何代码。
 */
export type ImportStatus = "ok" | "needs-confirm" | "above-grade" | "beyond-primary";

export type ImportItem = {
  line: number;
  source: string;
  kind: "heading" | "question" | "expression" | "text";
  status: ImportStatus;
  /** 估计最早在几年级学到（7 表示初中及以上） */
  level: number;
  answer?: string;
  steps?: string[];
  reason?: string;
  demo?: DemoId;
};

export type ImportResult = { items: ImportItem[]; summary: { total: number; ok: number; confirm: number; above: number; beyond: number } };

export const MAX_TEXT = 20000;

const BEYOND: [RegExp, string][] = [
  [/微积分|导数|积分|极限|∫|lim\b|sin|cos|tan|log|矩阵|向量|复数|概率密度|方差|标准差/i, "大学或高中内容"],
  [/函数|二次方程|一元二次|因式分解|平方根|√|勾股定理|相似三角形|有理数|无理数/, "初中及以上内容"],
];

const LEVELS: [RegExp, number, string][] = [
  [/解方程|列方程|方程的解/, 7, "解方程已调整到初中学习"],
  [/负数|百分数|百分之|打.折|比例尺|圆柱|圆锥|鸽巢|扇形|圆的(周长|面积)|圆周率|π/, 6, ""],
  [/小数乘|小数除|可能性|用字母表示|多边形的面积|平行四边形的面积|三角形的面积|梯形的面积/, 5, ""],
  [/量角器|平行|垂直|运算定律|亿|万以上|条形统计图/, 4, ""],
  [/分数|几分之|周长|面积|毫米|分米|千米|吨|小数/, 3, ""],
  [/乘法|除法|平均分|余数|厘米|米|时|分|角的/, 2, ""],
];

const DEMO_HINTS: [RegExp, DemoId][] = [
  [/(平行四边形|三角形|梯形).*面积|面积.*(平行四边形|三角形|梯形)|上底|下底|多边形/, "poly-area"], [/凑十|进位加法/, "make-ten"], [/统计图|条形|票数/, "bar-chart"],
  [/圆柱|圆锥/, "cylinder"], [/圆/, "circle"], [/分数|几分之/, "fraction"], [/周长|面积|长方形|正方形/, "perimeter-area"],
  [/百分|打.折|折扣/, "percent"], [/负数|零下|数轴/, "number-line"], [/量角器|度数|锐角|钝角/, "angle"], [/平行|垂直/, "parallel"],
  [/钟|几时|时.*分/, "clock"], [/元|角钱|人民币|找回/, "rmb"], [/厘米|尺子|测量/, "ruler"], [/平均分|每人|几组|乘法/, "group-share"],
  [/可能|摸球|一定|不可能/, "chance"], [/比例尺|图上距离/, "scale"], [/抽屉|至少/, "pigeonhole"], [/小数.*乘|乘.*小数/, "decimal-mul"],
  [/等式|天平|字母表示/, "balance"], [/磁铁/, "magnet"], [/影子/, "shadow"], [/电路|灯泡/, "circuit"], [/摆/, "pendulum"], [/结冰|沸腾|水蒸气/, "water"], [/杠杆|支点/, "lever"], [/斜面/, "slope"], [/声音|音调|振动/, "sound"], [/昼夜|自转/, "earth"], [/摩擦/, "friction"], [/发芽|种子|豆苗/, "plant"],
];

/** 把 "3.25" 转成 [325, 2]；不合法返回 null */
function parseDec(s: string): [number, number] | null {
  if (!/^\d{1,9}(\.\d{1,4})?$/.test(s)) return null;
  const [i, f = ""] = s.split(".");
  return [Number(i + f), f.length];
}

const OPS: Record<string, "+" | "-" | "×" | "÷"> = { "+": "+", "＋": "+", "-": "-", "−": "-", "－": "-", "×": "×", "*": "×", "x": "×", "X": "×", "÷": "÷", "/": "÷" };

/** 计算“a 运算 b”，小数用整数运算，除法整除或带余数。 */
export function computeExpr(a: string, op: string, b: string): { answer: string; steps: string[] } | null {
  const A = parseDec(a), B = parseDec(b), o = OPS[op];
  if (!A || !B || !o) return null;
  const scale = Math.max(A[1], B[1]);
  const ai = A[0] * 10 ** (scale - A[1]), bi = B[0] * 10 ** (scale - B[1]);
  if (o === "+") return { answer: fmtScaled(ai + bi, scale), steps: [`${a} + ${b} = ${fmtScaled(ai + bi, scale)}`] };
  if (o === "-") { const d = ai - bi; return { answer: fmtScaled(d, scale), steps: [`${a} − ${b} = ${fmtScaled(d, scale)}`] }; }
  if (o === "×") { const pr = A[0] * B[0]; return { answer: fmtScaled(pr, A[1] + B[1]), steps: [`按整数算 ${A[0]} × ${B[0]} = ${pr}`, `因数共有 ${A[1] + B[1]} 位小数，积是 ${fmtScaled(pr, A[1] + B[1])}`] }; }
  if (bi === 0) return { answer: "除数不能为 0", steps: ["0 不能作除数。"] };
  if (scale === 0) { const q = Math.floor(ai / bi), r = ai % bi; return { answer: r ? `${q}……${r}` : String(q), steps: [r ? `${a} ÷ ${b} = ${q}……${r}` : `${a} ÷ ${b} = ${q}`] }; }
  const q = ai / bi;
  return Number.isInteger(q * 100) ? { answer: fmtScaled(Math.round(q * 100), 2), steps: [`${a} ÷ ${b} = ${fmtScaled(Math.round(q * 100), 2)}`] } : null;
}

function estimateLevel(text: string): { level: number; reason?: string; beyond?: string } {
  for (const [re, why] of BEYOND) if (re.test(text)) return { level: 9, beyond: why };
  for (const [re, lv, why] of LEVELS) if (re.test(text)) return { level: lv, reason: why || undefined };
  const nums = text.match(/\d+(\.\d+)?/g) ?? [];
  let level = 1;
  for (const n of nums) {
    if (n.includes(".")) level = Math.max(level, 3);
    else if (Number(n) > 10000) level = Math.max(level, 4);
    else if (Number(n) > 100) level = Math.max(level, 2);
    else if (Number(n) > 20) level = Math.max(level, 1);
  }
  if (/[×÷*]/.test(text)) level = Math.max(level, 2);
  return { level };
}

/** 识别不清的迹象：数字中夹着容易认错的字母（O/l/I/S/B）、乱码、未配对括号。 */
function looksGarbled(text: string): string | null {
  if (/\d[OolIiSB]|[OolIiSB]\d/.test(text)) return "数字里夹着字母，可能是识别错误（如 O 和 0、l 和 1）";
  if (/\uFFFD|[□■]{2,}/.test(text)) return "有无法识别的字符";
  const open = (text.match(/[（(]/g) ?? []).length, close = (text.match(/[）)]/g) ?? []).length;
  if (open !== close) return "括号不配对";
  return null;
}

export function analyzeText(raw: string, grade: Grade): ImportResult {
  const text = String(raw ?? "").slice(0, MAX_TEXT).replace(/\r\n?/g, "\n");
  const items: ImportItem[] = [];
  text.split("\n").forEach((rawLine, idx) => {
    const source = rawLine.trim();
    if (!source || /^[-*_]{3,}$/.test(source)) return;
    const clean = source.replace(/^#{1,6}\s*/, "").replace(/^[-*]\s+/, "").replace(/<[^>]*>/g, "");
    const line = idx + 1;
    const isHeading = /^#{1,6}\s/.test(source) || /^第[一二三四五六七八九十\d]+(单元|章|课)/.test(clean) || /^[一二三四五六七八九十]+[、.]/.test(clean);
    const est = estimateLevel(clean);
    const demoHint = DEMO_HINTS.find(([re]) => re.test(clean))?.[1];
    const demo = demoHint && DEMOS[demoHint].grades.some((g) => g <= grade) ? demoHint : undefined;
    const base = { line, source, level: est.level, demo };
    if (isHeading) { items.push({ ...base, kind: "heading", status: est.beyond ? "beyond-primary" : "ok", reason: est.beyond }); return; }
    const garbled = looksGarbled(clean);
    const m = clean.replace(/\s+/g, "").match(/(\d+(?:\.\d+)?)([+＋\-−－×*xX÷/])(\d+(?:\.\d+)?)=(?:\?|？|（）|\(\)|_+|□)?$/);
    let status: ImportStatus = est.beyond ? "beyond-primary" : est.level > grade ? "above-grade" : "ok";
    let reason = est.beyond ?? (est.level > grade ? est.reason ?? `估计是 ${est.level >= 7 ? "初中" : `${est.level} 年级`}的内容，超出所选的 ${grade} 年级` : undefined);
    if (garbled && status === "ok") { status = "needs-confirm"; reason = garbled; }
    if (m) {
      const r = garbled ? null : computeExpr(m[1], m[2], m[3]);
      items.push({ ...base, kind: "expression", status: r ? status : "needs-confirm", reason: r ? reason : reason ?? "这个算式无法自动核对，请人工确认", answer: r?.answer, steps: r?.steps });
      return;
    }
    const isQuestion = /[？?]|（\s*）|\(\s*\)|_{2,}|多少|几个|求/.test(clean);
    items.push({ ...base, kind: isQuestion ? "question" : "text", status, reason, ...(isQuestion ? {} : { demo: undefined }) });
  });
  const summary = {
    total: items.length,
    ok: items.filter((i) => i.status === "ok").length,
    confirm: items.filter((i) => i.status === "needs-confirm").length,
    above: items.filter((i) => i.status === "above-grade").length,
    beyond: items.filter((i) => i.status === "beyond-primary").length,
  };
  return { items, summary };
}
