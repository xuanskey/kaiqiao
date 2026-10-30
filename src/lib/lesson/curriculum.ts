import type { Grade } from "../math/types.ts";
import type { DemoId, Subject } from "./demos.ts";

/**
 * 教材目录配置。每个版本独立维护，不同版本的单元不会混在一起。
 * 新增教材版本时，只需添加一个 Edition 对象。
 */
export type Term = "上" | "下";

export type CourseUnit = {
  id: string;
  title: string;
  /** 本单元可用的互动演示 */
  demos?: DemoId[];
  /** 打开演示时的初始参数（例如“认识立体图形”默认看立体图形） */
  preset?: Record<string, number>;
  /** 对应题库中的章节，可直接去练习 */
  practiceGrade?: Grade;
};

export type Edition = {
  id: string;
  name: string;
  subject: Subject;
  /** 来源与核对说明 */
  note: string;
  /** 是否已经录入目录 */
  ready: boolean;
  /** 本版本尚未出版的册次，暂用另一个版本的目录（界面会明确提示） */
  fallback?: { editionId: string; keys: string[]; note: string };
  catalog: Partial<Record<`${Grade}${Term}`, CourseUnit[]>>;
};

/** 复习单元：把本册各单元的互动课按顺序列出来，复习时可以逐个回看。 */
function withReview(unit: CourseUnit, _i: number, all: CourseUnit[]): CourseUnit {
  if (unit.demos?.length || !/复习/.test(unit.title)) return unit;
  return { ...unit, demos: [...new Set(all.flatMap((u) => (u === unit ? [] : u.demos ?? [])))] };
}

const U = (grade: Grade, term: Term, titles: (string | [string, DemoId[]] | [string, DemoId[], Record<string, number>])[]): CourseUnit[] =>
  titles.map((t, i) => {
    const [title, demos, preset] = typeof t === "string" ? [t, undefined, undefined] : t;
    return { id: `pep-${grade}${term === "上" ? "a" : "b"}-${i + 1}`, title, demos, preset, practiceGrade: grade };
  }).map(withReview);

/** 人教版（2012 年起使用）：2026 秋季起各年级上册已全部换成新版；四、五、六年级下册在 2027 年春季换新版前仍用这一版。 */
export const PEP_MATH_2012: Edition = {
  id: "pep-math-2012",
  name: "人教版（2012 旧版）",
  subject: "math",
  ready: true,
  note: "人教版小学数学 2012 年版单元目录。2026 年秋季起已由新版替换；四、五、六年级下册在 2027 年春季换新版前仍使用此版。",
  catalog: {
    "1上": U(1, "上", [["准备课", ["add-sub"]], ["位置", ["position"], { mode: 2 }], ["1～5 的认识和加减法", ["add-sub"]], ["认识图形（一）", ["shapes"]], ["6～10 的认识和加减法", ["add-sub"]], ["11～20 各数的认识", ["sticks"], { tens: 1, ones: 3 }], ["认识钟表", ["clock"]], ["20 以内的进位加法", ["make-ten", "add-sub"]]]),
    "1下": U(1, "下", [["认识图形（二）", ["shapes"]], ["20 以内的退位减法", ["add-sub"]], ["分类与整理", ["tally"]], ["100 以内数的认识", ["sticks"], { tens: 4, ones: 6 }], ["认识人民币", ["rmb"]], ["100 以内的加法和减法（一）", ["column-add"], { op: 0, a: 35, b: 20 }], ["找规律", ["pattern"]]]),
    "2上": U(2, "上", [["长度单位", ["ruler"]], ["100 以内的加法和减法（二）", ["column-add"], { op: 1, a: 52, b: 27 }], ["角的初步认识", ["angle"]], ["表内乘法（一）", ["group-share"]], ["观察物体（一）", ["views"]], ["表内乘法（二）", ["group-share"]], ["认识时间", ["clock"]], ["数学广角——搭配（一）", ["combos"]]]),
    "2下": U(2, "下", [["数据收集整理", ["tally"]], ["表内除法（一）", ["group-share"]], ["图形的运动（一）", ["transform"]], ["表内除法（二）", ["group-share"]], ["混合运算", ["mixed-ops"], { form: 2, a: 12, b: 8, c: 3 }], ["有余数的除法", ["group-share"]], ["万以内数的认识", ["abacus"]], ["克和千克", ["units"], { kind: 1, pair: 0, v: 2 }], ["数学广角——推理", ["logic"]]]),
    "3上": U(3, "上", [["时、分、秒", ["clock", "units"]], ["万以内的加法和减法（一）", ["column-add"]], ["测量", ["units"], { kind: 0, pair: 3, v: 3 }], ["万以内的加法和减法（二）", ["column-add"]], ["倍的认识", ["bar-model"], { mode: 2 }], ["多位数乘一位数", ["column-mul"]], ["长方形和正方形", ["perimeter-area"]], ["分数的初步认识", ["fraction"]], ["数学广角——集合", ["venn"]]]),
    "3下": U(3, "下", [["位置与方向（一）", ["position"], { mode: 1 }], ["除数是一位数的除法", ["long-div"], { a: 156, b: 4 }], ["复式统计表", ["tally"]], ["两位数乘两位数", ["column-mul"], { a: 24, b: 13 }], ["面积", ["perimeter-area"]], ["年、月、日", ["calendar"]], ["小数的初步认识", ["decimal"], { mode: 0, a: 50 }], ["数学广角——搭配（二）", ["combos"], { mode: 1 }]]),
    "4上": U(4, "上", [["大数的认识", ["abacus"], { mode: 1 }], ["公顷和平方千米", ["units"], { kind: 2, pair: 1, v: 3 }], ["角的度量", ["angle"]], ["三位数乘两位数", ["column-mul"], { a: 145, b: 12 }], ["平行四边形和梯形", ["parallel"]], ["除数是两位数的除法", ["long-div"], { a: 828, b: 36 }], ["条形统计图", ["bar-chart"]], ["数学广角——优化", ["optimize"]]]),
    "4下": U(4, "下", [["四则运算", ["mixed-ops"]], ["观察物体（二）", ["views"]], ["运算定律", ["law"]], ["小数的意义和性质", ["decimal"]], ["三角形", ["triangle"]], ["小数的加法和减法", ["decimal"], { mode: 1 }], ["图形的运动（二）", ["transform"], { kind: 2 }], ["平均数与条形统计图", ["bar-chart"]], ["数学广角——鸡兔同笼", ["chicken-rabbit"]]]),
    "5上": U(5, "上", [["小数乘法", ["decimal-mul"]], ["位置", ["position"]], ["小数除法", ["decimal-div"]], ["可能性", ["chance"]], ["简易方程", ["balance"]], ["多边形的面积", ["poly-area"]], ["数学广角——植树问题", ["tree-plant"]]]),
    "5下": U(5, "下", [["观察物体（三）", ["views"]], ["因数与倍数", ["factors"]], ["长方体和正方体", ["cuboid"]], ["分数的意义和性质", ["fraction-add"]], ["图形的运动（三）", ["transform"], { kind: 1 }], ["分数的加法和减法", ["fraction-add"]], ["折线统计图", ["line-chart"]], ["数学广角——找次品", ["odd-one"]]]),
    "6上": U(6, "上", [["分数乘法", ["fraction-mul"]], ["位置与方向（二）", ["position"], { mode: 1 }], ["分数除法", ["fraction-div"]], ["比", ["fraction-div"], { mode: 2, n1: 2, d1: 3, n2: 1, d2: 3 }], ["圆", ["circle"]], ["百分数（一）", ["percent"]], ["扇形统计图", ["percent"]], ["数学广角——数与形", ["square-numbers"]]]),
    "6下": U(6, "下", [["负数", ["number-line"]], ["百分数（二）", ["percent"]], ["圆柱与圆锥", ["cylinder"]], ["比例", ["scale"]], ["数学广角——鸽巢问题", ["pigeonhole"]], "整理和复习"]),
  },
};

const N = (grade: Grade, term: Term, titles: (string | [string, DemoId[]] | [string, DemoId[], Record<string, number>])[]): CourseUnit[] =>
  titles.map((t, i) => {
    const [title, demos, preset] = typeof t === "string" ? [t, undefined, undefined] : t;
    return { id: `pep24-${grade}${term === "上" ? "a" : "b"}-${i + 1}`, title, demos, preset, practiceGrade: grade };
  }).map(withReview);

/**
 * 人教版（2024 年修订）：2024 秋一年级起逐年换用，2026 年秋季起 1—6 年级上册全部使用。
 * 单元目录按人民教育出版社新版课本目录整理（☆ 为综合与实践活动，带“选学”的为数学广角）。
 * 新版四、五、六年级下册 2027 年春季才启用，目前沿用旧版目录，界面会明确标出。
 * 简易方程（解方程）已调整到初中；五年级上册只保留“用字母表示数和数量关系”和等式的性质。
 */
export const PEP_MATH: Edition = {
  id: "pep-math",
  name: "人教版（2024 新版）",
  subject: "math",
  ready: true,
  fallback: { editionId: "pep-math-2012", keys: ["4下", "5下", "6下"], note: "新版四、五、六年级下册 2027 年春季启用，这学期的下册仍用旧版，以下为旧版目录。" },
  note: "按人教版 2024 年修订教材目录整理（2026 年秋季起 1—6 年级上册全部换用）。各地进度可能不同，请以孩子手中的课本为准。",
  catalog: {
    "1上": N(1, "上", [["学习准备（数学游戏）", ["add-sub"]], ["一 5 以内数的认识和加、减法", ["add-sub"]], ["二 6～10 的认识和加、减法", ["add-sub"]], ["三 认识立体图形", ["shapes"], { kind: 1 }], ["四 11～20 的认识", ["sticks"], { tens: 1, ones: 3 }], ["五 20 以内的进位加法", ["make-ten", "add-sub"]], "六 复习与关联"]),
    "1下": N(1, "下", [["一 认识平面图形", ["shapes"]], ["二 20 以内的退位减法", ["add-sub"]], ["三 100 以内数的认识", ["sticks"], { tens: 4, ones: 6 }], ["四 100 以内的口算加、减法", ["column-add"], { op: 0, a: 35, b: 20 }], ["五 100 以内的笔算加、减法", ["column-add"], { op: 0, a: 38, b: 25 }], ["六 数量间的加减关系", ["bar-model"], { mode: 0 }], ["☆ 欢乐购物街（认识人民币）", ["rmb"]], "七 复习与关联"]),
    "2上": N(2, "上", [["一 分类与整理", ["tally"]], ["二 1～6 的表内乘法", ["group-share"]], ["三 1～6 的表内除法", ["group-share"]], ["☆ 校园小导游", ["position"], { mode: 1 }], ["四 厘米和米", ["ruler"]], ["☆ 身体上的尺子", ["ruler"]], ["五 7～9 的表内乘、除法", ["group-share"]], "六 复习与关联"]),
    "2下": N(2, "下", [["☆ 时间在哪里（认识时间）", ["clock"]], ["一 有余数的除法", ["group-share"]], ["二 数量间的乘除关系", ["bar-model"], { mode: 2 }], ["三 万以内数的认识", ["abacus"]], ["四 万以内的加法和减法", ["column-add"]], ["☆ 数学连环画", ["bar-model"], { mode: 1 }], "五 复习与关联"]),
    "3上": N(3, "上", [["一 观察物体", ["views"]], ["二 混合运算", ["mixed-ops"], { form: 1 }], ["三 毫米、分米和千米", ["units"], { kind: 0, pair: 3, v: 2 }], ["☆ 曹冲称象的故事", ["units"], { kind: 1, pair: 1, v: 3 }], ["四 多位数乘一位数", ["column-mul"]], ["☆ 数字编码", ["id-code"]], ["五 线和角", ["angle"]], ["六 分数的初步认识", ["fraction"]], "七 复习与关联", ["数学广角——搭配问题（选学）", ["combos"], { mode: 1 }]]),
    "3下": N(3, "下", [["一 生活中的运动现象", ["transform"], { kind: 0 }], ["二 除数是一位数的除法", ["long-div"], { a: 156, b: 4 }], ["三 长方形和正方形（周长）", ["perimeter-area"]], ["四 图形的面积", ["perimeter-area"]], ["五 数据的收集与整理", ["tally"]], ["☆ 年、月、日的秘密", ["calendar"]], ["六 小数的初步认识", ["decimal"], { mode: 0, a: 50 }], "七 复习与关联"]),
    "4上": N(4, "上", [["一 万以上数的认识", ["abacus"], { mode: 1 }], ["☆ 1 亿有多大", ["abacus"], { mode: 1, w3: 9, w2: 9, w1: 9, w0: 9, d3: 9, d2: 9, d1: 9, d0: 9 }], ["二 角的度量", ["angle"]], ["三 多位数乘两位数", ["column-mul"], { a: 145, b: 12 }], ["四 加法模型和乘法模型", ["bar-model"], { mode: 2, a: 8, k: 4 }], ["五 平行四边形和梯形", ["parallel"]], ["六 条形统计图", ["bar-chart"]], ["☆ 寻找宝藏", ["position"], { mode: 1, x: 7, y: 6 }], "七 复习与关联"]),
    "5上": N(5, "上", [["一 观察简单组合体", ["views"]], ["二 小数乘法", ["decimal-mul"]], ["三 小数除法", ["decimal-div"]], ["四 图形的运动", ["transform"], { kind: 1 }], ["五 用字母表示数和数量关系（含等式的性质）", ["balance"]], ["六 多边形的面积", ["poly-area"]], ["☆ 有趣的密铺", ["transform", "poly-area"], { kind: 0 }], ["七 可能性", ["chance"]], "八 复习与关联"]),
    "6上": N(6, "上", [["一 确定位置", ["position"]], ["二 分数乘法", ["fraction-mul"]], ["三 分数除法", ["fraction-div"]], ["☆ 生活中的负数", ["number-line"]], ["四 圆", ["circle"]], ["☆ 体育中的数学", ["circle"]], ["五 百分数", ["percent"]], ["☆ 水是生命之源", ["percent"]], "六 复习与关联", ["数学广角——鸽巢问题（选学）", ["pigeonhole"]]]),
  },
};

/** 科学课的演示按学段归类，标注对应的教科版单元主题，未逐课核对。 */
const S = (id: string, title: string, demos: DemoId[]): CourseUnit => ({ id, title, demos });
export const JK_SCIENCE: Edition = {
  id: "jk-science",
  name: "教科版",
  subject: "science",
  ready: true,
  note: "只收录已有互动实验的主题，对应教科版相关单元，未逐课核对；屏幕实验不能代替真实动手实验。",
  catalog: {
    "2下": [S("jk-2b-magnet", "磁铁", ["magnet"])],
    "3上": [S("jk-3a-water", "水（水的三态变化）", ["water"])],
    "3下": [S("jk-3b-plant", "植物的生长变化（种子发芽）", ["plant"]), S("jk-3b-shadow", "太阳、地球和月球（影子的变化）", ["shadow"])],
    "4上": [S("jk-4a-sound", "声音（声音的高低和强弱）", ["sound"]), S("jk-4a-friction", "运动和力（摩擦力）", ["friction"])],
    "4下": [S("jk-4b-plant", "植物的生长变化（豆苗生长）", ["plant"]), S("jk-4b-circuit", "电路", ["circuit"])],
    "5上": [S("jk-5a-pendulum", "计量时间（摆的研究）", ["pendulum"])],
    "6上": [S("jk-6a-earth", "地球的运动（昼夜交替）", ["earth"]), S("jk-6a-lever", "工具与技术（杠杆）", ["lever"]), S("jk-6a-slope", "工具与技术（斜面）", ["slope"])],
  },
};

/** 预留的其他版本：目录尚未录入，界面会如实显示“暂未录入”，不会借用别的版本的目录。 */
export const PLACEHOLDER_EDITIONS: Edition[] = [
  { id: "bsd-math", name: "北师大版", subject: "math", ready: false, note: "目录尚未录入。", catalog: {} },
  { id: "sj-math", name: "苏教版", subject: "math", ready: false, note: "目录尚未录入。", catalog: {} },
];

export const EDITIONS: Edition[] = [PEP_MATH, PEP_MATH_2012, ...PLACEHOLDER_EDITIONS, JK_SCIENCE];

export function editionsFor(subject: Subject): Edition[] {
  return EDITIONS.filter((e) => e.subject === subject);
}

export function unitsOf(edition: Edition, grade: Grade, term: Term): CourseUnit[] {
  return resolveUnits(edition, grade, term).units;
}

/** 取某一册的单元；本版本未出版的册次按 fallback 取旧版，并返回提示文字。 */
export function resolveUnits(edition: Edition, grade: Grade, term: Term): { units: CourseUnit[]; fallbackNote?: string; from: Edition } {
  const key = `${grade}${term}` as const;
  const own = edition.catalog[key];
  if (own) return { units: own, from: edition };
  if (edition.fallback?.keys.includes(key)) {
    const other = EDITIONS.find((e) => e.id === edition.fallback!.editionId);
    if (other?.catalog[key]) return { units: other.catalog[key]!, fallbackNote: edition.fallback.note, from: other };
  }
  return { units: [], from: edition };
}

export const SUBJECT_LABEL: Record<Subject, string> = { math: "数学", science: "科学" };
