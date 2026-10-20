import type { Grade } from "../math/types.ts";
import { bandOf, stepDurationMs, type GradeBand } from "./grade-style.ts";
import type { BoardItem, LessonStep } from "./timeline.ts";
import { fmtScaled, gcd, roundTo } from "./num.ts";

export type Subject = "math" | "science";

export type DemoId =
  | "add-sub" | "group-share" | "fraction" | "perimeter-area" | "angle" | "law"
  | "decimal-mul" | "balance" | "circle" | "cylinder"
  | "magnet" | "shadow" | "circuit" | "pendulum";

export type ParamSpec = {
  key: string;
  label: string;
  min: number;
  max: number;
  /** 所有参数都是整数；display = value / scale */
  scale?: number;
  unit?: string;
  default: number;
  /** 0/1 开关或选项 */
  options?: string[];
};

export type Experiment = {
  goal: string;
  tools: string[];
  steps: string[];
  observe: string;
  explain: string;
  safety?: string;
  think: string;
  virtualNote: string;
};

export type DemoDef = {
  id: DemoId;
  subject: Subject;
  title: string;
  /** 正常课程适用年级 */
  grades: Grade[];
  summary: string;
  params: ParamSpec[];
  experiment?: Experiment;
};

export type Params = Record<string, number>;

export const DEMOS: Record<DemoId, DemoDef> = {
  "add-sub": { id: "add-sub", subject: "math", title: "摆一摆：加法和减法", grades: [1], summary: "拖动苹果，看合起来和拿走以后各有多少。",
    params: [
      { key: "op", label: "算法", min: 0, max: 1, default: 0, options: ["合起来（加法）", "拿走（减法）"] },
      { key: "a", label: "第一盘", min: 0, max: 10, default: 3, unit: "个" },
      { key: "b", label: "第二盘 / 拿走", min: 0, max: 10, default: 2, unit: "个" },
    ] },
  "group-share": { id: "group-share", subject: "math", title: "分一分：乘法与平均分", grades: [2], summary: "几个几用乘法；平均分给几个小朋友用除法。",
    params: [
      { key: "mode", label: "看什么", min: 0, max: 1, default: 0, options: ["几个几（乘法）", "平均分（除法）"] },
      { key: "groups", label: "几组 / 几人", min: 1, max: 9, default: 3 },
      { key: "each", label: "每组几个", min: 1, max: 9, default: 4, unit: "个" },
      { key: "total", label: "一共几个", min: 1, max: 40, default: 12, unit: "个" },
    ] },
  fraction: { id: "fraction", subject: "math", title: "分数的初步认识", grades: [3], summary: "把一个整体平均分，改变份数，看每一份和涂色部分怎样变化。",
    params: [
      { key: "parts", label: "平均分成几份", min: 2, max: 12, default: 4, unit: "份" },
      { key: "shaded", label: "涂色几份", min: 0, max: 12, default: 1, unit: "份" },
      { key: "shape", label: "图形", min: 0, max: 1, default: 0, options: ["长条", "圆"] },
    ] },
  "perimeter-area": { id: "perimeter-area", subject: "math", title: "周长和面积", grades: [3], summary: "沿边走一圈是周长，用方格铺满是面积。",
    params: [
      { key: "l", label: "长", min: 1, max: 12, default: 5, unit: "厘米" },
      { key: "w", label: "宽", min: 1, max: 8, default: 3, unit: "厘米" },
    ] },
  angle: { id: "angle", subject: "math", title: "量角器量角", grades: [4], summary: "拖动角的一条边，用量角器读出度数，判断是什么角。",
    params: [{ key: "deg", label: "角的度数", min: 0, max: 180, default: 60, unit: "°" }] },
  law: { id: "law", subject: "math", title: "乘法分配律", grades: [4], summary: "把一个长方形拆成两块，看 a×(b+c) 和 a×b+a×c 为什么相等。",
    params: [
      { key: "a", label: "a（宽）", min: 1, max: 9, default: 4 },
      { key: "b", label: "b", min: 1, max: 9, default: 3 },
      { key: "c", label: "c", min: 1, max: 9, default: 5 },
    ] },
  "decimal-mul": { id: "decimal-mul", subject: "math", title: "小数乘小数", grades: [5], summary: "先把小数看成整数相乘，再数一数积有几位小数。",
    params: [
      { key: "a", label: "第一个因数", min: 1, max: 99, scale: 10, default: 12 },
      { key: "b", label: "第二个因数", min: 1, max: 99, scale: 10, default: 5 },
    ] },
  balance: { id: "balance", subject: "math", title: "天平解方程", grades: [5], summary: "天平两边同时拿走、同时平均分，始终保持平衡。",
    params: [
      { key: "a", label: "x 的个数 a", min: 1, max: 6, default: 3 },
      { key: "b", label: "另放的砝码 b", min: 0, max: 20, default: 4, unit: "g" },
      { key: "x", label: "x 的真实质量（答案）", min: 1, max: 12, default: 5, unit: "g" },
    ] },
  circle: { id: "circle", subject: "math", title: "圆的周长和面积", grades: [6], summary: "改变半径，周长和面积实时计算；把圆切开拼成近似长方形。",
    params: [
      { key: "r", label: "半径 r", min: 1, max: 10, default: 3, unit: "厘米" },
      { key: "n", label: "切成几份", min: 4, max: 32, default: 8, unit: "份" },
    ] },
  cylinder: { id: "cylinder", subject: "math", title: "圆柱展开与体积", grades: [6], summary: "把圆柱侧面展开成长方形；等底等高的圆锥体积是圆柱的三分之一。",
    params: [
      { key: "r", label: "底面半径 r", min: 1, max: 6, default: 2, unit: "厘米" },
      { key: "h", label: "高 h", min: 1, max: 10, default: 5, unit: "厘米" },
      { key: "open", label: "展开程度", min: 0, max: 10, default: 0 },
    ] },
  magnet: { id: "magnet", subject: "science", title: "磁铁能吸住什么", grades: [1, 2], summary: "把磁铁靠近不同物品，看哪些会被吸住。",
    params: [
      { key: "dist", label: "磁铁离物品的距离", min: 1, max: 10, default: 6, unit: "厘米" },
      { key: "power", label: "磁铁大小", min: 1, max: 3, default: 2, options: ["小磁铁", "中磁铁", "大磁铁"] },
    ],
    experiment: { goal: "找出哪些物品能被磁铁吸引。", tools: ["条形磁铁", "回形针", "铁钉", "橡皮", "木块", "塑料尺", "铝制易拉罐"], steps: ["先猜一猜每样东西会不会被吸住。", "把磁铁慢慢靠近物品。", "记下被吸住的物品。"], observe: "铁做的回形针、铁钉会被吸住；橡皮、木块、塑料尺和铝罐不会。", explain: "磁铁能吸引铁一类的材料，不能吸引木头、塑料、橡胶，也不吸引铝。", safety: "不要把磁铁靠近手机、银行卡；小磁铁不能放进嘴里。", think: "磁铁离得越远，还吸得住吗？", virtualNote: "屏幕里的“吸引距离”只是示意，真实磁铁的力量要动手试一试才知道。" } },
  shadow: { id: "shadow", subject: "science", title: "太阳高度与影子", grades: [3, 4, 5, 6], summary: "改变太阳的高度，看木棍影子的长短和方向。",
    params: [
      { key: "sun", label: "太阳高度角", min: 10, max: 80, default: 45, unit: "°" },
      { key: "h", label: "木棍高度", min: 10, max: 100, default: 50, unit: "厘米" },
    ],
    experiment: { goal: "研究影子长短和太阳高度的关系。", tools: ["一根竖直的木棍", "卷尺", "记录表", "阳光"], steps: ["把木棍竖直插在空地上。", "上午、中午、下午各量一次影子长度。", "记录时间、太阳的位置和影子长度。"], observe: "太阳越高，影子越短；影子总在太阳的对面。", explain: "光沿直线传播，木棍挡住了光，后面就形成影子。太阳高了，被挡住的光落在近处，影子就短。", safety: "不要直接用眼睛看太阳。", think: "一天中什么时候影子最短？", virtualNote: "动画用简化的几何关系计算影子；真实测量会受地面是否平整、木棍是否竖直影响。" } },
  circuit: { id: "circuit", subject: "science", title: "简单电路", grades: [4, 5, 6], summary: "连接电池、开关和小灯泡，比较串联与并联。",
    params: [
      { key: "bulbs", label: "小灯泡个数", min: 1, max: 3, default: 2, unit: "个" },
      { key: "parallel", label: "连接方式", min: 0, max: 1, default: 0, options: ["串联", "并联"] },
      { key: "closed", label: "开关", min: 0, max: 1, default: 1, options: ["断开", "闭合"] },
      { key: "broken", label: "坏掉的灯泡", min: 0, max: 3, default: 0, options: ["没有", "第 1 个", "第 2 个", "第 3 个"] },
    ],
    experiment: { goal: "让小灯泡亮起来，比较串联和并联。", tools: ["1 节电池和电池盒", "开关", "小灯泡和灯座", "导线"], steps: ["用导线把电池、开关、灯泡连成一个闭合的圈。", "闭合开关，观察灯泡。", "增加灯泡，分别试试串联和并联。", "拧下一个灯泡，看其他灯泡还亮不亮。"], observe: "串联时一个灯坏了，其他灯都不亮；并联时互不影响。", explain: "电流要沿着闭合的回路流动。串联只有一条路，并联有几条路。", safety: "只用干电池做实验，绝不能用家里的插座；不要让导线直接连接电池两端（短路）。", think: "家里的电灯是串联还是并联？为什么？", virtualNote: "模拟按理想电池和相同灯泡计算亮度，真实灯泡亮度还会受电池电量影响。" } },
  pendulum: { id: "pendulum", subject: "science", title: "摆的研究", grades: [5, 6], summary: "改变摆长、摆锤质量和摆角，测量摆动快慢。",
    params: [
      { key: "len", label: "摆长", min: 10, max: 100, default: 50, unit: "厘米" },
      { key: "mass", label: "摆锤质量", min: 10, max: 100, default: 50, unit: "克" },
      { key: "amp", label: "摆角", min: 5, max: 15, default: 10, unit: "°" },
    ],
    experiment: { goal: "研究摆动快慢和哪些因素有关。", tools: ["细线", "摆锤（垫圈）", "铁架台", "秒表", "记录表"], steps: ["一次只改变一个条件，其他条件保持不变。", "数 10 次摆动所用的时间。", "每个条件测 3 次，取中间的数。"], observe: "摆长越长，摆得越慢；改变摆锤质量或小摆角，快慢几乎不变。", explain: "在摆角较小时，摆动一次的时间主要由摆长决定。", safety: "摆锤不要甩得太高，注意别碰到同学。", think: "想让摆 1 秒摆一次（单程），摆长大约要多长？", virtualNote: "动画使用小摆角下的理想公式，不考虑空气阻力；真实测量会有误差，所以要多测几次。" } },
};

export const DEMO_LIST = Object.values(DEMOS);

export function isDemoId(x: unknown): x is DemoId {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(DEMOS, x);
}

export function defaultParams(id: DemoId): Params {
  return Object.fromEntries(DEMOS[id].params.map((p) => [p.key, p.default]));
}

export function displayParam(spec: ParamSpec, value: number): string {
  if (spec.options) return spec.options[value] ?? String(value);
  const text = spec.scale ? fmtScaled(value, Math.round(Math.log10(spec.scale))) : String(value);
  return spec.unit ? `${text} ${spec.unit}` : text;
}

/** 让互相关联的参数保持合理：减数不大于被减数、涂色份数不超过总份数等。 */
export function normalizeParams(id: DemoId, input: Params): Params {
  const p: Params = { ...defaultParams(id) };
  for (const spec of DEMOS[id].params) {
    const v = input[spec.key];
    if (typeof v === "number" && Number.isFinite(v)) p[spec.key] = Math.min(spec.max, Math.max(spec.min, Math.round(v)));
  }
  if (id === "add-sub" && p.op === 1 && p.b > p.a) p.b = p.a;
  if (id === "fraction" && p.shaded > p.parts) p.shaded = p.parts;
  if (id === "circle" && p.n % 2 === 1) p.n += p.n < 32 ? 1 : -1;
  if (id === "circuit" && p.broken > p.bulbs) p.broken = 0;
  return p;
}

// ———————————— 计算（所有结果都由参数实时算出） ————————————

export function addSub(p: Params) {
  const result = p.op === 0 ? p.a + p.b : p.a - p.b;
  return { result, expr: `${p.a} ${p.op === 0 ? "+" : "−"} ${p.b} = ${result}` };
}

export function groupShare(p: Params) {
  if (p.mode === 0) return { product: p.groups * p.each, expr: `${p.groups} × ${p.each} = ${p.groups * p.each}`, add: Array(p.groups).fill(p.each).join(" + ") };
  const q = Math.floor(p.total / p.groups), r = p.total % p.groups;
  return { quotient: q, remainder: r, expr: r ? `${p.total} ÷ ${p.groups} = ${q}……${r}` : `${p.total} ÷ ${p.groups} = ${q}` };
}

export function fraction(p: Params) {
  const g = gcd(p.shaded, p.parts) || 1;
  return { text: `${p.shaded}/${p.parts}`, unit: `1/${p.parts}`, simplest: p.shaded === 0 ? "0" : `${p.shaded / g}/${p.parts / g}`, whole: p.shaded === p.parts,
    vsHalf: p.shaded * 2 === p.parts ? "等于" : p.shaded * 2 > p.parts ? "大于" : "小于" };
}

export function perimeterArea(p: Params) {
  return { perimeter: 2 * (p.l + p.w), area: p.l * p.w };
}

export function angleKind(deg: number): string {
  if (deg === 0) return "还没有张开";
  if (deg < 90) return "锐角";
  if (deg === 90) return "直角";
  if (deg < 180) return "钝角";
  return "平角";
}

export function law(p: Params) {
  const left = p.a * (p.b + p.c), ab = p.a * p.b, ac = p.a * p.c;
  return { left, ab, ac, right: ab + ac, equal: left === ab + ac };
}

export function decimalMul(p: Params) {
  // a、b 都是“十分之几”的整数表示
  const int = p.a * p.b; // 积放大了 100 倍
  return { aText: fmtScaled(p.a, 1), bText: fmtScaled(p.b, 1), intProduct: int, product: fmtScaled(int, 2), raw: `${Math.floor(int / 100)}.${String(int % 100).padStart(2, "0")}` };
}

export function balance(p: Params) {
  const c = p.a * p.x + p.b;
  return { c, left: `${p.a === 1 ? "" : p.a}x + ${p.b}`, afterSub: c - p.b, x: (c - p.b) / p.a, eq: `${p.a === 1 ? "" : p.a}x + ${p.b} = ${c}` };
}

/** 圆：π 取 3.14，用整数运算得到精确结果。 */
export function circle(p: Params) {
  return { d: 2 * p.r, perimeter: fmtScaled(628 * p.r, 2), area: fmtScaled(314 * p.r * p.r, 2), halfC: fmtScaled(314 * p.r, 2) };
}

export function cylinder(p: Params) {
  const side = 628 * p.r * p.h; // ×100
  const base = 314 * p.r * p.r; // ×100
  const volume = base * p.h; // ×100
  return { circumference: fmtScaled(628 * p.r, 2), side: fmtScaled(side, 2), base: fmtScaled(base, 2), surface: fmtScaled(side + 2 * base, 2), volume: fmtScaled(volume, 2),
    cone: volume % 3 === 0 ? fmtScaled(volume / 3, 2) : `约 ${roundTo(volume / 300, 2)}`, coneExact: volume % 3 === 0 };
}

export const MAGNET_ITEMS = [
  { name: "回形针", iron: true, emoji: "📎" },
  { name: "铁钉", iron: true, emoji: "🔩" },
  { name: "橡皮", iron: false, emoji: "🧽" },
  { name: "木块", iron: false, emoji: "🪵" },
  { name: "塑料尺", iron: false, emoji: "📏" },
  { name: "铝制易拉罐", iron: false, emoji: "🥫" },
] as const;

export function magnet(p: Params) {
  const reach = p.power * 3; // 示意：小 3 厘米、中 6 厘米、大 9 厘米
  return { reach, items: MAGNET_ITEMS.map((it) => ({ ...it, pulled: it.iron && p.dist <= reach })) };
}

export function shadow(p: Params) {
  const len = p.h / Math.tan((p.sun * Math.PI) / 180);
  return { length: roundTo(len, 1), lengthNum: len, longer: len > p.h };
}

export function circuit(p: Params) {
  const n = p.bulbs;
  const bulbs = Array.from({ length: n }, (_, i) => {
    const broken = p.broken === i + 1;
    let lit: boolean;
    if (!p.closed) lit = false;
    else if (p.parallel) lit = !broken;
    else lit = p.broken === 0;
    // 理想电池、相同灯泡：串联每个灯功率为单灯的 1/n²，并联不变
    const brightness = lit ? (p.parallel ? 1 : 1 / (n * n)) : 0;
    return { broken, lit, brightness };
  });
  return { bulbs, anyLit: bulbs.some((b) => b.lit) };
}

/** 单摆：T = 2π√(L/g)，g 取 9.8 m/s²。返回往返一次的周期（秒）。 */
export function pendulum(p: Params) {
  const T = 2 * Math.PI * Math.sqrt(p.len / 100 / 9.8);
  return { period: roundTo(T, 2), ten: roundTo(T * 10, 1), periodNum: T };
}

// ———————————— 讲解脚本：按学段生成 ————————————

let seq = 0;
const T = (text: string, tone?: "title" | "note" | "result" | "warn"): BoardItem => ({ kind: "text", id: `t${seq++}`, text, tone });

type Draft = { say: string; board?: BoardItem[]; highlight?: string[]; scene?: Params };

function steps(grade: Grade, drafts: Draft[]): LessonStep[] {
  return drafts.map((d, i) => ({ id: `s${i}`, say: d.say, board: d.board ?? [], highlight: d.highlight, scene: d.scene, durationMs: stepDurationMs(d.say, grade) }));
}

/**
 * 生成一节演示课的分步讲解。
 * variant 0：标准讲法；1：换一种方法讲；2：生活例子。
 */
export function lessonScript(id: DemoId, raw: Params, grade: Grade, variant = 0): LessonStep[] {
  seq = 0;
  const p = normalizeParams(id, raw);
  const band: GradeBand = bandOf(grade);
  const v = Math.max(0, Math.min(2, variant));
  switch (id) {
    case "add-sub": {
      const r = addSub(p);
      const f = { kind: "formula" as const, id: "f", text: r.expr } as BoardItem;
      if (p.op === 0) return steps(grade, v === 2 ? [
        { say: `小明有 ${p.a} 颗糖。`, board: [T(`小明：${p.a} 颗`)], scene: { reveal: 1 } },
        { say: `妈妈又给他 ${p.b} 颗。`, board: [T(`妈妈给：${p.b} 颗`)], scene: { reveal: 2 } },
        { say: "现在一共几颗？合起来数一数。", scene: { reveal: 3 } },
        { say: `一共 ${r.result} 颗。`, board: [f], highlight: ["f"] },
      ] : v === 1 ? [
        { say: `先记住大一点的数 ${Math.max(p.a, p.b)}。`, board: [T(`先想 ${Math.max(p.a, p.b)}`)], scene: { reveal: 1 } },
        { say: `再往后数 ${Math.min(p.a, p.b)} 个。`, board: [T(`往后数 ${Math.min(p.a, p.b)} 个`)], scene: { reveal: 2 } },
        { say: `数到了 ${r.result}。`, board: [f], highlight: ["f"], scene: { reveal: 3 } },
      ] : [
        { say: `左边盘子有 ${p.a} 个苹果。`, board: [T(`左边 ${p.a} 个`)], scene: { reveal: 1 } },
        { say: `右边盘子有 ${p.b} 个苹果。`, board: [T(`右边 ${p.b} 个`)], scene: { reveal: 2 } },
        { say: "把它们放在一起。", scene: { reveal: 3 } },
        { say: `一个一个数，一共 ${r.result} 个。`, board: [f], highlight: ["f"] },
        { say: "合起来，用加法。", board: [T("合起来 → 加法", "result")] },
      ]);
      return steps(grade, v === 2 ? [
        { say: `你有 ${p.a} 元钱。`, board: [T(`有 ${p.a} 元`)], scene: { reveal: 1 } },
        { say: `买橡皮花了 ${p.b} 元。`, board: [T(`花了 ${p.b} 元`)], scene: { reveal: 2 } },
        { say: `还剩 ${r.result} 元。`, board: [f], highlight: ["f"], scene: { reveal: 3 } },
      ] : v === 1 ? [
        { say: `想一想：${p.b} 加几等于 ${p.a}？`, board: [T(`${p.b} + ? = ${p.a}`)], scene: { reveal: 1 } },
        { say: `${p.b} 加 ${r.result} 等于 ${p.a}。`, scene: { reveal: 2 } },
        { say: `所以 ${p.a} 减 ${p.b} 等于 ${r.result}。`, board: [f], highlight: ["f"], scene: { reveal: 3 } },
      ] : [
        { say: `篮子里有 ${p.a} 个苹果。`, board: [T(`原来 ${p.a} 个`)], scene: { reveal: 1 } },
        { say: `拿走 ${p.b} 个。`, board: [T(`拿走 ${p.b} 个`)], scene: { reveal: 2 } },
        { say: `数一数，还剩 ${r.result} 个。`, board: [f], highlight: ["f"], scene: { reveal: 3 } },
        { say: "拿走以后还剩几个，用减法。", board: [T("拿走 → 减法", "result")] },
      ]);
    }
    case "group-share": {
      const r = groupShare(p) as ReturnType<typeof groupShare> & Record<string, unknown>;
      if (p.mode === 0) return steps(grade, v === 1 ? [
        { say: `每组 ${p.each} 个，一共 ${p.groups} 组。`, board: [T(`${p.groups} 个 ${p.each}`)], scene: { reveal: 1 } },
        { say: `用加法：${r.add}。`, board: [{ kind: "formula" as const, id: "add", text: `${r.add} = ${r.product}` }], scene: { reveal: 2 } },
        { say: "相同的数连加，可以写成乘法。", board: [{ kind: "formula" as const, id: "f", text: r.expr }], highlight: ["f"], scene: { reveal: 3 } },
      ] : [
        { say: `每盘放 ${p.each} 个草莓。`, board: [T(`每盘 ${p.each} 个`)], scene: { reveal: 1 } },
        { say: `一共有 ${p.groups} 盘。`, board: [T(`${p.groups} 盘`)], scene: { reveal: 2 } },
        { say: `${p.groups} 个 ${p.each} 相加，就是 ${p.groups} 乘 ${p.each}。`, board: [{ kind: "formula" as const, id: "f", text: r.expr }], highlight: ["f"], scene: { reveal: 3 } },
        { say: v === 2 ? `就像 ${p.groups} 个同学，每人带 ${p.each} 本书，一共 ${r.product} 本。` : `一共 ${r.product} 个。`, board: [T(`一共 ${r.product} 个`, "result")] },
      ]);
      const q = r.quotient as number, rem = r.remainder as number;
      return steps(grade, [
        { say: `一共有 ${p.total} 块饼干。`, board: [T(`一共 ${p.total} 块`)], scene: { reveal: 1 } },
        { say: `平均分给 ${p.groups} 个小朋友。`, board: [T(`平均分给 ${p.groups} 人`)], scene: { reveal: 2 } },
        { say: v === 1 ? `想乘法口诀：${p.groups} 乘几最接近 ${p.total}？` : "一人一块，轮流分，分到不够分为止。", scene: { reveal: 3 } },
        { say: rem ? `每人 ${q} 块，还剩 ${rem} 块。` : `每人正好 ${q} 块。`, board: [{ kind: "formula" as const, id: "f", text: r.expr }], highlight: ["f"] },
        ...(rem ? [{ say: `剩下的 ${rem} 块比 ${p.groups} 少，不够再分。`, board: [T("余数要比除数小", "note")] }] : []),
      ]);
    }
    case "fraction": {
      const r = fraction(p);
      return steps(grade, [
        { say: "这是一个整体。", board: [T("一个整体 = 1")], scene: { reveal: 1 } },
        { say: `把它平均分成 ${p.parts} 份。`, board: [T(`平均分成 ${p.parts} 份`)], scene: { reveal: 2 } },
        { say: `每一份是它的 ${p.parts} 分之一。`, board: [{ kind: "formula" as const, id: "u", text: `每份 = ${r.unit}` }], highlight: ["u"], scene: { reveal: 3 } },
        { say: `涂色的有 ${p.shaded} 份，就是 ${p.parts} 分之 ${p.shaded}。`, board: [{ kind: "formula" as const, id: "f", text: `涂色 = ${r.text}` }], highlight: ["f"], scene: { reveal: 4 } },
        v === 1
          ? { say: `分母 ${p.parts} 表示平均分的份数，分子 ${p.shaded} 表示取的份数。`, board: [T("分母：平均分几份；分子：取几份", "note")] }
          : v === 2
            ? { say: `一个比萨平均切成 ${p.parts} 块，吃了 ${p.shaded} 块，吃了 ${r.text}。`, board: [T(`比萨：${r.text}`)] }
            : { say: r.whole ? "全部涂满，就是整个 1。" : `${r.text} ${r.vsHalf} 一半。`, board: [T(r.whole ? `${r.text} = 1` : `${r.text} ${r.vsHalf} 1/2`, "result")] },
        ...(band !== "low" ? [{ say: "份数越多，每一份就越小。", board: [T("平均分的份数越多，每份越小", "note")] }] : []),
      ]);
    }
    case "perimeter-area": {
      const r = perimeterArea(p);
      return steps(grade, [
        { say: `长方形长 ${p.l} 厘米，宽 ${p.w} 厘米。`, board: [T(`长 ${p.l} 厘米，宽 ${p.w} 厘米`)], scene: { reveal: 1 } },
        { say: "沿着边走一圈，走过的长度就是周长。", scene: { reveal: 2 } },
        v === 1
          ? { say: `四条边加起来：${p.l}+${p.w}+${p.l}+${p.w}。`, board: [{ kind: "formula" as const, id: "c", text: `${p.l}+${p.w}+${p.l}+${p.w} = ${r.perimeter}（厘米）` }], highlight: ["c"] }
          : { say: `一条长加一条宽，再乘 2。`, board: [{ kind: "formula" as const, id: "c", text: `(${p.l}+${p.w})×2 = ${r.perimeter}（厘米）` }], highlight: ["c"] },
        { say: "再用 1 平方厘米的小方格把它铺满。", scene: { reveal: 3 } },
        { say: `每行 ${p.l} 个，有 ${p.w} 行，一共 ${r.area} 个方格。`, board: [{ kind: "formula" as const, id: "s", text: `${p.l}×${p.w} = ${r.area}（平方厘米）` }], highlight: ["s"] },
        { say: "周长量的是一圈有多长，面积量的是占了多大地方。", board: [T("周长：厘米；面积：平方厘米", "note")] },
      ]);
    }
    case "angle": {
      const k = angleKind(p.deg);
      return steps(grade, [
        { say: "角有一个顶点和两条边。", board: [T("角 = 顶点 + 两条边")], scene: { reveal: 1 } },
        { say: "量角器的中心对准角的顶点。", board: [T("① 中心对顶点")], scene: { reveal: 2 } },
        { say: "零刻度线和角的一条边重合。", board: [T("② 0° 线对一条边")], scene: { reveal: 3 } },
        { say: `另一条边对着 ${p.deg} 度，这个角是 ${p.deg} 度。`, board: [{ kind: "formula" as const, id: "f", text: `∠ = ${p.deg}°` }], highlight: ["f"], scene: { reveal: 4 } },
        { say: v === 1 ? "读数时看从 0 度开始的那一圈刻度，不要看反了。" : `${p.deg} 度是${k}。`, board: [T(v === 1 ? "从 0° 开始的那圈读" : `${p.deg}° 是${k}`, "result")] },
        { say: "锐角小于 90 度，直角等于 90 度，钝角在 90 度和 180 度之间。", board: [T("锐角 < 90° = 直角 < 钝角 < 180°", "note")] },
      ]);
    }
    case "law": {
      const r = law(p);
      return steps(grade, [
        { say: `一个长方形宽 ${p.a}，长是 ${p.b} 加 ${p.c}。`, board: [T(`宽 ${p.a}，长 ${p.b}+${p.c}`)], scene: { reveal: 1 } },
        { say: "整体算：宽乘长。", board: [{ kind: "formula" as const, id: "l", text: `${p.a}×(${p.b}+${p.c}) = ${p.a}×${p.b + p.c} = ${r.left}` }], highlight: ["l"], scene: { reveal: 2 } },
        { say: "把它切成两块，分别算再相加。", board: [{ kind: "formula" as const, id: "r", text: `${p.a}×${p.b} + ${p.a}×${p.c} = ${r.ab}+${r.ac} = ${r.right}` }], highlight: ["r"], scene: { reveal: 3 } },
        { say: "面积是同一个长方形，所以两边相等。", board: [{ kind: "formula" as const, id: "eq", text: `${p.a}×(${p.b}+${p.c}) = ${p.a}×${p.b} + ${p.a}×${p.c}` }], highlight: ["eq"] },
        { say: v === 2 ? `买 ${p.a} 件上衣和 ${p.a} 条裤子，可以先算一套的价钱再乘 ${p.a}。` : "这叫乘法分配律：(a+b)×c = a×c + b×c。", board: [T("乘法分配律", "result")] },
      ]);
    }
    case "decimal-mul": {
      const r = decimalMul(p);
      const intA = p.a, intB = p.b;
      return steps(grade, [
        { say: `计算 ${r.aText} 乘 ${r.bText}。`, board: [T(`${r.aText} × ${r.bText} = ?`, "title")], scene: { reveal: 1 } },
        { say: `先把 ${r.aText} 看成 ${intA}，${r.bText} 看成 ${intB}，都扩大到原来的 10 倍。`, board: [T(`${r.aText} → ${intA}（×10）`), T(`${r.bText} → ${intB}（×10）`)], scene: { reveal: 2 } },
        { say: `按整数乘：${intA} 乘 ${intB} 等于 ${r.intProduct}。`, board: [{ kind: "column" as const, id: "col", lines: [String(intA), `× ${intB}`, "────", String(r.intProduct)] }], highlight: ["col"], scene: { reveal: 3 } },
        { say: v === 1 ? "两个因数一共扩大了 100 倍，积就要缩小到原来的 100 分之一。" : "两个因数一共有两位小数，就从积的右边数出两位，点上小数点。", board: [T(v === 1 ? `${r.intProduct} ÷ 100` : "因数共 2 位小数 → 积 2 位小数", "note")], scene: { reveal: 4 } },
        { say: r.raw !== r.product ? `得到 ${r.raw}，末尾的 0 可以去掉，写成 ${r.product}。` : `得到 ${r.product}。`, board: [{ kind: "formula" as const, id: "f", text: `${r.aText} × ${r.bText} = ${r.product}` }], highlight: ["f"] },
      ]);
    }
    case "balance": {
      const r = balance(p);
      const ax = p.a === 1 ? "x" : `${p.a}x`;
      return steps(grade, [
        { say: `左边放 ${p.a} 个同样重的 x 和 ${p.b} 克砝码，右边放 ${r.c} 克，天平平衡。`, board: [{ kind: "formula" as const, id: "e0", text: r.eq }], scene: { reveal: 1 } },
        { say: v === 1 ? `想一想：${ax} 加 ${p.b} 等于 ${r.c}，那 ${ax} 是多少？` : `两边同时拿走 ${p.b} 克，天平仍然平衡。`, board: [{ kind: "formula" as const, id: "e1", text: `${ax} + ${p.b} − ${p.b} = ${r.c} − ${p.b}` }], highlight: ["e1"], scene: { reveal: 2 } },
        { say: `所以 ${ax} 等于 ${r.afterSub}。`, board: [{ kind: "formula" as const, id: "e2", text: `${ax} = ${r.afterSub}` }], scene: { reveal: 3 } },
        ...(p.a > 1 ? [{ say: `两边同时平均分成 ${p.a} 份。`, board: [{ kind: "formula" as const, id: "e3", text: `${ax} ÷ ${p.a} = ${r.afterSub} ÷ ${p.a}` }], highlight: ["e3"], scene: { reveal: 4 } }] : []),
        { say: `x 等于 ${r.x}。`, board: [{ kind: "formula" as const, id: "f", text: `x = ${r.x}` }], highlight: ["f"], scene: { reveal: 5 } },
        { say: "检验：把答案代回原方程。", board: [T(`检验：${p.a === 1 ? "" : `${p.a}×`}${r.x} + ${p.b} = ${r.c} ✓`, "result")] },
      ]);
    }
    case "circle": {
      const r = circle(p);
      return steps(grade, [
        { say: `圆的半径是 ${p.r} 厘米，直径是 ${r.d} 厘米。`, board: [T(`r = ${p.r} 厘米，d = ${r.d} 厘米`)], scene: { reveal: 1, cut: 0 } },
        { say: "周长约是直径的 3.14 倍。", board: [{ kind: "formula" as const, id: "c", text: `C = 2πr ≈ 2×3.14×${p.r} = ${r.perimeter}（厘米）` }], highlight: ["c"], scene: { reveal: 2 } },
        { say: `把圆平均切成 ${p.n} 份，拼起来。`, scene: { reveal: 3, cut: 1 } },
        { say: v === 1 ? "切得越细，拼成的图形越接近长方形。" : "拼成的图形接近长方形：长是周长的一半，宽是半径。", board: [T(`长 ≈ πr = ${r.halfC}，宽 = r = ${p.r}`)], scene: { reveal: 4, cut: 1 } },
        { say: "长方形面积等于长乘宽，所以圆面积等于 π 乘 r 的平方。", board: [{ kind: "formula" as const, id: "s", text: `S = πr² ≈ 3.14×${p.r}² = ${r.area}（平方厘米）` }], highlight: ["s"] },
        { say: v === 2 ? `给半径 ${p.r} 米的圆形花坛围栏杆要 ${r.perimeter} 米，铺草坪要 ${r.area} 平方米。` : "注意：周长用 2πr，面积用 πr²，单位不一样。", board: [T(v === 2 ? "围一圈 → 周长；铺满 → 面积" : "周长：厘米；面积：平方厘米", "note")] },
      ]);
    }
    case "cylinder": {
      const r = cylinder(p);
      return steps(grade, [
        { say: `圆柱底面半径 ${p.r} 厘米，高 ${p.h} 厘米。`, board: [T(`r = ${p.r}，h = ${p.h}`)], scene: { open: 0 } },
        { say: "沿着高把侧面剪开、展开。", scene: { open: 5 } },
        { say: "展开后是一个长方形：长是底面周长，宽是圆柱的高。", board: [T(`长 = 2πr ≈ ${r.circumference}，宽 = ${p.h}`)], scene: { open: 10 } },
        { say: "侧面积等于底面周长乘高。", board: [{ kind: "formula" as const, id: "side", text: `S侧 = 2πrh ≈ ${r.side}（平方厘米）` }], highlight: ["side"] },
        { say: "体积等于底面积乘高。", board: [{ kind: "formula" as const, id: "v", text: `V = πr²h ≈ ${r.base}×${p.h} = ${r.volume}（立方厘米）` }], highlight: ["v"] },
        { say: "等底等高的圆锥，体积是圆柱的三分之一。", board: [{ kind: "formula" as const, id: "cone", text: `V锥 = ⅓πr²h ${r.coneExact ? "≈ " : ""}${r.cone}（立方厘米）` }], highlight: ["cone"] },
      ]);
    }
    case "magnet": {
      const r = magnet(p);
      const pulled = r.items.filter((i) => i.pulled).map((i) => i.name);
      return steps(grade, [
        { say: "猜一猜，磁铁能吸住哪些东西？", board: [T("我猜……")] },
        { say: "把磁铁慢慢靠近。", scene: { reveal: 1 } },
        { say: pulled.length ? `${pulled.join("、")}被吸住了。` : "现在离得太远，什么都没吸住。", board: [T(pulled.length ? `吸住：${pulled.join("、")}` : "没吸住", "result")], scene: { reveal: 2 } },
        { say: "它们都是铁做的。", board: [T("磁铁能吸铁", "note")] },
        { say: "木头、塑料、橡皮和铝罐，都吸不住。", board: [T("吸不住：木头、塑料、橡皮、铝")] },
      ]);
    }
    case "shadow": {
      const r = shadow(p);
      return steps(grade, [
        { say: "阳光照到木棍上，木棍后面出现影子。", board: [T("挡住光 → 形成影子")], scene: { reveal: 1 } },
        { say: "影子总在太阳的对面。", board: [T("影子方向与太阳相反")], scene: { reveal: 2 } },
        { say: `现在太阳高度是 ${p.sun} 度，影子大约长 ${r.length} 厘米。`, board: [{ kind: "formula" as const, id: "f", text: `影长 ≈ ${r.length} 厘米` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: "太阳越高，影子越短；太阳越低，影子越长。", board: [T("太阳越高，影子越短", "result")] },
        ...(band === "high" ? [{ say: `可以记录不同时刻的影长，画成统计图找规律。`, board: [T("记录 → 画图 → 找规律", "note")] }] : []),
      ]);
    }
    case "circuit": {
      const r = circuit(p);
      return steps(grade, [
        { say: "电池、导线、开关、灯泡连成一个圈，叫闭合电路。", board: [T("闭合回路才有电流")], scene: { reveal: 1 } },
        { say: p.parallel ? "并联：每个灯泡各有一条路。" : "串联：所有灯泡在同一条路上。", board: [T(p.parallel ? "并联：多条路" : "串联：一条路")], scene: { reveal: 2 } },
        { say: !p.closed ? "开关断开，电路不通，灯不亮。" : r.anyLit ? "开关闭合，灯泡亮了。" : "开关闭合了，但电路中有断开的地方，灯不亮。", board: [T(r.anyLit ? "灯亮" : "灯不亮", r.anyLit ? "result" : "warn")], scene: { reveal: 3 } },
        { say: p.parallel ? "并联时，一个灯坏了，其他灯照样亮。" : "串联时，一个灯坏了，整条路断开，所有灯都灭。", board: [T(p.parallel ? "并联互不影响" : "串联一断全断", "note")] },
      ]);
    }
    case "pendulum": {
      const r = pendulum(p);
      return steps(grade, [
        { say: "摆锤来回摆动一次，叫一个周期。", board: [T("来回一次 = 一个周期")], scene: { reveal: 1 } },
        { say: `摆长 ${p.len} 厘米时，来回一次约 ${r.period} 秒，10 次约 ${r.ten} 秒。`, board: [{ kind: "formula" as const, id: "f", text: `10 次 ≈ ${r.ten} 秒` }], highlight: ["f"], scene: { reveal: 2 } },
        { say: "只改变摆锤质量，快慢几乎不变。", board: [T("质量 → 几乎无影响")] },
        { say: "摆长越长，摆得越慢。", board: [T("摆长越长 → 越慢", "result")] },
        { say: "做实验时一次只改变一个条件，这叫控制变量。", board: [T("一次只改变一个条件", "note")] },
      ]);
    }
  }
}

/** 按年级给出生活中的例子。 */
export function lifeExample(id: DemoId, grade: Grade): string {
  const low = bandOf(grade) === "low";
  const map: Record<DemoId, string> = {
    "add-sub": "早上有 3 只小鸟，又飞来 2 只，一共几只？",
    "group-share": "6 个同学分 18 支铅笔，每人分得同样多，每人几支？",
    fraction: "一块蛋糕平均切成 8 块，你吃了 3 块，就是吃了 3/8。",
    "perimeter-area": "给相框镶边看周长；给桌面铺桌布看面积。",
    angle: "打开的门和门框之间、剪刀的两片刀刃之间，都有角。",
    law: "4 个同学每人买一支 3 元的笔和一本 5 元的本子，可以算 4×(3+5)。",
    "decimal-mul": "每千克苹果 1.2 元，买 0.5 千克，要付 1.2×0.5 元。",
    balance: "3 本一样的书加 4 克的书签一共重 19 克，每本书多重？",
    circle: "自行车轮子转一圈走的路，就是轮子的周长。",
    cylinder: "做一个圆柱形笔筒要多少纸，看侧面积；能装多少水，看体积。",
    magnet: "冰箱贴能贴在冰箱门上，因为门是铁做的。",
    shadow: low ? "中午操场上的影子短，傍晚影子长。" : "旗杆的影子早晚长、中午短，古人用日晷看时间。",
    circuit: "手电筒里有电池、开关和灯泡，就是一个简单电路。",
    pendulum: "老式摆钟就是利用摆来计时的。",
  };
  return map[id];
}
