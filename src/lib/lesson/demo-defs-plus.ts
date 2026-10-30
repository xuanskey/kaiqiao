import type { DemoDef } from "./demo-defs.ts";

// v0.16 补齐的课程：每个演示对应若干教材单元（见 curriculum.ts），计算、讲解与随堂练习在 plus.ts。

export type PlusId =
  | "sticks" | "abacus" | "column-add" | "column-mul" | "long-div" | "mixed-ops" | "bar-model" | "units"
  | "calendar" | "views" | "position" | "transform" | "triangle" | "decimal" | "tally" | "line-chart"
  | "factors" | "cuboid" | "fraction-add" | "fraction-div" | "combos" | "chicken-rabbit" | "tree-plant"
  | "odd-one" | "venn" | "id-code" | "square-numbers" | "optimize" | "pattern" | "logic";

const digit = (key: string, label: string, def: number, when?: [string, number[]]) => ({ key, label, min: 0, max: 9, default: def, when });

export const PLUS_DEMOS: Record<PlusId, DemoDef> = {
  sticks: { id: "sticks", subject: "math", title: "数小棒：几个十和几个一", grades: [1], summary: "10 根捆成 1 捆，看看几捆几根合起来是多少，十位、个位各写几。",
    params: [
      { key: "tens", label: "几捆（几个十）", min: 0, max: 9, default: 1, unit: "捆" },
      { key: "ones", label: "几根（几个一）", min: 0, max: 9, default: 3, unit: "根" },
    ] },
  abacus: { id: "abacus", subject: "math", title: "计数器：数位与读写", grades: [2, 4], summary: "在计数器上拨珠，认识数位顺序，学会中间、末尾有 0 的数怎么读、怎么写。",
    params: [
      { key: "mode", label: "范围", min: 0, max: 1, default: 0, options: ["万以内", "亿以内"] },
      digit("w3", "千万位", 0, ["mode", [1]]), digit("w2", "百万位", 3, ["mode", [1]]), digit("w1", "十万位", 0, ["mode", [1]]), digit("w0", "万位", 5, ["mode", [1]]),
      digit("d3", "千位", 3), digit("d2", "百位", 0), digit("d1", "十位", 5), digit("d0", "个位", 0),
    ] },
  "column-add": { id: "column-add", subject: "math", title: "竖式加减法：对齐、进位与退位", grades: [1, 2, 3], summary: "相同数位对齐，从个位算起；满十向前一位进 1，不够减向前一位借 1。",
    params: [
      { key: "op", label: "算法", min: 0, max: 1, default: 0, options: ["加法", "减法"] },
      { key: "a", label: "第一个数", min: 10, max: 9999, default: 368 },
      { key: "b", label: "第二个数", min: 1, max: 9999, default: 257 },
    ] },
  "column-mul": { id: "column-mul", subject: "math", title: "竖式乘法：一位数、两位数乘", grades: [3, 4], summary: "用乘数的每一位去乘另一个因数，满几十进几；两位数乘时，十位乘得的积末位和十位对齐。",
    params: [
      { key: "a", label: "被乘数", min: 10, max: 999, default: 128 },
      { key: "b", label: "乘数", min: 2, max: 99, default: 3 },
    ] },
  "long-div": { id: "long-div", subject: "math", title: "竖式除法：从高位除起", grades: [3, 4], summary: "从被除数的最高位除起，除到哪一位商就写在哪一位上，不够商 1 就商 0，余数比除数小。",
    params: [
      { key: "a", label: "被除数", min: 10, max: 999, default: 156 },
      { key: "b", label: "除数", min: 2, max: 99, default: 4 },
    ] },
  "mixed-ops": { id: "mixed-ops", subject: "math", title: "混合运算：先算什么", grades: [2, 3, 4], summary: "同级运算从左往右；有乘除又有加减先算乘除；有括号先算括号里面的。",
    params: [
      { key: "form", label: "算式", min: 0, max: 3, default: 1, options: ["a − b + c", "a + b × c", "(a + b) × c", "(a − b) ÷ c"] },
      { key: "a", label: "a", min: 1, max: 99, default: 30 },
      { key: "b", label: "b", min: 1, max: 50, default: 6 },
      { key: "c", label: "c", min: 1, max: 9, default: 4 },
    ] },
  "bar-model": { id: "bar-model", subject: "math", title: "线段图：数量关系与倍", grades: [1, 2, 3, 4], summary: "画线段图看清谁多谁少、部分和总数、一个数是另一个数的几倍。",
    params: [
      { key: "mode", label: "看什么", min: 0, max: 2, default: 0, options: ["相差多少", "部分与总数", "几倍"] },
      { key: "a", label: "红花", min: 1, max: 20, default: 12, unit: "朵" },
      { key: "b", label: "黄花", min: 1, max: 20, default: 7, unit: "朵", when: ["mode", [0, 1]] },
      { key: "k", label: "倍数", min: 2, max: 9, default: 3, unit: "倍", when: ["mode", [2]] },
    ] },
  units: { id: "units", subject: "math", title: "单位换算：长度、质量、面积、时间", grades: [2, 3, 4], summary: "认识相邻单位之间的进率，大单位换小单位用乘法，小单位换大单位用除法。",
    params: [
      { key: "kind", label: "单位", min: 0, max: 3, default: 0, options: ["长度", "质量", "面积", "时间"] },
      { key: "pair", label: "换算", min: 0, max: 4, default: 4 },
      { key: "v", label: "数量", min: 1, max: 20, default: 3 },
    ] },
  calendar: { id: "calendar", subject: "math", title: "年、月、日：大月、小月和闰年", grades: [3], summary: "看月历认识大月、小月，判断平年和闰年，2 月有几天。",
    params: [
      { key: "year", label: "年份", min: 1990, max: 2040, default: 2026, unit: "年" },
      { key: "month", label: "月份", min: 1, max: 12, default: 2, unit: "月" },
    ] },
  views: { id: "views", subject: "math", title: "观察物体：从正面、上面、左面看", grades: [2, 3, 4, 5], summary: "用小正方体搭一搭，分别从正面、上面、左面看，画出看到的形状。",
    params: [{ key: "shape", label: "搭法", min: 0, max: 5, default: 1, options: ["一排 3 个", "一排 3 个，左上加 1 个", "前 2 后 1", "L 形加高", "2×2 再加 1 个", "三级台阶"] }] },
  position: { id: "position", subject: "math", title: "位置与方向：数对和东南西北", grades: [1, 2, 3, 4, 5, 6], summary: "用上下左右、东南西北和数对描述位置，说清楚从哪里出发、往哪走几格。",
    params: [
      { key: "mode", label: "怎么说", min: 0, max: 2, default: 0, options: ["数对", "东南西北", "上下左右"] },
      { key: "x", label: "第几列", min: 1, max: 8, default: 6 },
      { key: "y", label: "第几行", min: 1, max: 6, default: 5 },
    ] },
  transform: { id: "transform", subject: "math", title: "图形的运动：平移、旋转、轴对称", grades: [2, 3, 4, 5], summary: "在方格纸上平移、旋转一个图形，或者画出它的轴对称图形，看什么变了、什么没变。",
    params: [
      { key: "kind", label: "运动", min: 0, max: 2, default: 0, options: ["平移", "旋转", "轴对称"] },
      { key: "n", label: "向右平移", min: 1, max: 5, default: 4, unit: "格", when: ["kind", [0]] },
      { key: "turn", label: "旋转", min: 0, max: 2, default: 0, options: ["顺时针 90°", "逆时针 90°", "旋转 180°"], when: ["kind", [1]] },
    ] },
  triangle: { id: "triangle", subject: "math", title: "三角形的内角和与分类", grades: [4], summary: "把三个角拼在一起是一个平角；按最大的角判断锐角、直角、钝角三角形。",
    params: [
      { key: "a", label: "∠1", min: 20, max: 120, default: 60, unit: "°" },
      { key: "b", label: "∠2", min: 20, max: 120, default: 70, unit: "°" },
    ] },
  decimal: { id: "decimal", subject: "math", title: "小数的意义和加减法", grades: [3, 4], summary: "把 1 平均分成 10 份、100 份认识小数；小数加减先把小数点对齐。",
    params: [
      { key: "mode", label: "看什么", min: 0, max: 2, default: 0, options: ["认识小数", "小数加法", "小数减法"] },
      { key: "a", label: "第一个小数", min: 1, max: 999, scale: 100, default: 135 },
      { key: "b", label: "第二个小数", min: 1, max: 999, scale: 100, default: 48, when: ["mode", [1, 2]] },
    ] },
  tally: { id: "tally", subject: "math", title: "分类与整理：画“正”字记录", grades: [1, 2, 3], summary: "先分类，一边数一边画“正”字，再整理成统计表，比一比哪类最多。",
    params: [
      { key: "c0", label: "晴天", min: 0, max: 15, default: 12, unit: "天" },
      { key: "c1", label: "阴天", min: 0, max: 15, default: 7, unit: "天" },
      { key: "c2", label: "雨天", min: 0, max: 15, default: 11, unit: "天" },
    ] },
  "line-chart": { id: "line-chart", subject: "math", title: "折线统计图：看出变化", grades: [5], summary: "描点、连线，从折线的上升和下降看出数量怎样变化。",
    params: ["一", "二", "三", "四", "五"].map((w, i) => ({ key: `v${i}`, label: `星期${w}`, min: 0, max: 30, default: [12, 15, 14, 20, 26][i], unit: "℃" })) },
  factors: { id: "factors", subject: "math", title: "因数与倍数：拼长方形", grades: [5], summary: "用同样多的小正方形拼长方形，找出一个数所有的因数，判断质数和合数。",
    params: [{ key: "n", label: "小正方形的个数", min: 2, max: 48, default: 12, unit: "个" }] },
  cuboid: { id: "cuboid", subject: "math", title: "长方体和正方体：棱长、表面积、体积", grades: [5], summary: "改变长、宽、高，数一数小正方体，算出棱长总和、表面积和体积。",
    params: [
      { key: "l", label: "长", min: 1, max: 8, default: 4, unit: "厘米" },
      { key: "w", label: "宽", min: 1, max: 6, default: 3, unit: "厘米" },
      { key: "h", label: "高", min: 1, max: 6, default: 2, unit: "厘米" },
    ] },
  "fraction-add": { id: "fraction-add", subject: "math", title: "分数加减法：通分与约分", grades: [5], summary: "同分母分数直接加减分子；异分母分数先通分，结果约成最简分数。",
    params: [
      { key: "op", label: "算法", min: 0, max: 1, default: 0, options: ["加法", "减法"] },
      { key: "n1", label: "第一个分数的分子", min: 1, max: 11, default: 1 },
      { key: "d1", label: "第一个分数的分母", min: 2, max: 12, default: 2 },
      { key: "n2", label: "第二个分数的分子", min: 1, max: 11, default: 1 },
      { key: "d2", label: "第二个分数的分母", min: 2, max: 12, default: 3 },
    ] },
  "fraction-div": { id: "fraction-div", subject: "math", title: "分数除法：乘倒数", grades: [6], summary: "除以一个不等于 0 的数，等于乘这个数的倒数；用线段图看懂为什么。",
    params: [
      { key: "mode", label: "算式", min: 0, max: 2, default: 0, options: ["分数 ÷ 整数", "整数 ÷ 分数", "分数 ÷ 分数"] },
      { key: "n1", label: "被除数的分子", min: 1, max: 8, default: 4, when: ["mode", [0, 2]] },
      { key: "d1", label: "被除数的分母", min: 2, max: 9, default: 5, when: ["mode", [0, 2]] },
      { key: "k", label: "整数", min: 2, max: 9, default: 2, when: ["mode", [0, 1]] },
      { key: "n2", label: "除数的分子", min: 1, max: 8, default: 3, when: ["mode", [1, 2]] },
      { key: "d2", label: "除数的分母", min: 2, max: 9, default: 4, when: ["mode", [1, 2]] },
    ] },
  combos: { id: "combos", subject: "math", title: "搭配：有序思考不重不漏", grades: [2, 3], summary: "穿衣搭配、用数字组两位数、握手，按顺序一个一个地找。",
    params: [
      { key: "mode", label: "问题", min: 0, max: 2, default: 0, options: ["衣服搭配", "数字组两位数", "每两人握一次手"] },
      { key: "a", label: "上衣 / 数字 / 人数", min: 2, max: 5, default: 3 },
      { key: "b", label: "裤子", min: 1, max: 4, default: 2, unit: "条", when: ["mode", [0]] },
    ] },
  "chicken-rabbit": { id: "chicken-rabbit", subject: "math", title: "鸡兔同笼：假设法", grades: [4], summary: "假设全是鸡，算出少了几只脚，每把一只鸡换成兔就多 2 只脚。",
    params: [
      { key: "heads", label: "头（鸡和兔一共）", min: 2, max: 20, default: 8, unit: "只" },
      { key: "rabbits", label: "其中兔", min: 0, max: 20, default: 3, unit: "只" },
    ] },
  "tree-plant": { id: "tree-plant", subject: "math", title: "植树问题：棵数和间隔数", grades: [5], summary: "先算间隔数，再看两端种不种、是不是围成一圈，得出棵数。",
    params: [
      { key: "ends", label: "怎么种", min: 0, max: 3, default: 0, options: ["两端都种", "只种一端", "两端都不种", "围成一圈"] },
      { key: "len", label: "全长", min: 5, max: 100, default: 20, unit: "米" },
      { key: "gap", label: "每隔", min: 1, max: 10, default: 5, unit: "米" },
    ] },
  "odd-one": { id: "odd-one", subject: "math", title: "找次品：用天平最少称几次", grades: [5], summary: "把物品尽量平均分成 3 份，每称一次排除约三分之二。",
    params: [{ key: "n", label: "零件个数（其中 1 个略轻）", min: 2, max: 27, default: 9, unit: "个" }] },
  venn: { id: "venn", subject: "math", title: "集合：重叠部分只算一次", grades: [3], summary: "用两个圈表示两组人，重叠的部分是两项都参加的人，总人数要减去重复的。",
    params: [
      { key: "a", label: "参加跳绳", min: 1, max: 20, default: 9, unit: "人" },
      { key: "b", label: "参加踢毽", min: 1, max: 20, default: 7, unit: "人" },
      { key: "both", label: "两项都参加", min: 0, max: 20, default: 3, unit: "人" },
    ] },
  "id-code": { id: "id-code", subject: "math", title: "数字编码：身份证号码的秘密", grades: [3], summary: "18 位身份证号码分成几段，每段表示不同的信息。",
    params: [
      { key: "year", label: "出生年", min: 2008, max: 2025, default: 2017, unit: "年" },
      { key: "month", label: "出生月", min: 1, max: 12, default: 5, unit: "月" },
      { key: "day", label: "出生日", min: 1, max: 28, default: 6, unit: "日" },
      { key: "gender", label: "性别", min: 0, max: 1, default: 1, options: ["男", "女"] },
    ] },
  "square-numbers": { id: "square-numbers", subject: "math", title: "数与形：用图形看规律", grades: [6], summary: "连续奇数的和是平方数；1/2 + 1/4 + … 越来越接近 1。",
    params: [
      { key: "mode", label: "规律", min: 0, max: 1, default: 0, options: ["1 + 3 + 5 + …", "1/2 + 1/4 + …"] },
      { key: "n", label: "加几项", min: 1, max: 8, default: 4, unit: "项" },
    ] },
  optimize: { id: "optimize", subject: "math", title: "优化：烙饼最少要几分钟", grades: [4], summary: "一锅烙两张，每面 3 分钟；让锅每次都放满，用的时间最少。",
    params: [{ key: "cakes", label: "饼的张数", min: 1, max: 9, default: 3, unit: "张" }] },
  pattern: { id: "pattern", subject: "math", title: "找规律：一组一组地看", grades: [1], summary: "找出重复的一组，或每次增加几，猜出下一个是什么。",
    params: [
      { key: "kind", label: "规律", min: 0, max: 2, default: 0, options: ["颜色 ABAB", "图形 ABB", "数字每次加几"] },
      { key: "step", label: "每次加", min: 1, max: 5, default: 2, when: ["kind", [2]] },
    ] },
  logic: { id: "logic", subject: "math", title: "推理：用表格排除", grades: [2], summary: "根据几条线索，在表格里画 √ 和 ×，推出每个人拿的是什么。",
    params: [{ key: "puzzle", label: "题目", min: 0, max: 2, default: 0, options: ["拿什么书", "拿什么颜色的气球", "参加什么活动"] }] },
};

/** 单位换算可选的相邻（或常用）单位：[大单位, 小单位, 进率]。 */
export const UNIT_KINDS = [
  { name: "长度", ladder: ["千米", "米", "分米", "厘米", "毫米"], pairs: [["米", "分米", 10], ["分米", "厘米", 10], ["厘米", "毫米", 10], ["千米", "米", 1000], ["米", "厘米", 100]] },
  { name: "质量", ladder: ["吨", "千克", "克"], pairs: [["千克", "克", 1000], ["吨", "千克", 1000]] },
  { name: "面积", ladder: ["平方千米", "公顷", "平方米", "平方分米"], pairs: [["平方米", "平方分米", 100], ["公顷", "平方米", 10000], ["平方千米", "公顷", 100]] },
  { name: "时间", ladder: ["日", "时", "分", "秒"], pairs: [["时", "分", 60], ["分", "秒", 60], ["日", "时", 24]] },
] as const;

/** 让新增演示里互相关联的参数保持合理（由 normalizeParams 调用）。 */
export function normalizePlus(id: string, p: Record<string, number>): void {
  if (id === "sticks" && p.tens === 0 && p.ones === 0) p.ones = 1;
  if (id === "column-add" && p.op === 1 && p.b > p.a) p.b = p.a;
  if (id === "long-div" && p.a < p.b) p.a = p.b;
  if (id === "mixed-ops") {
    if (p.form === 0 && p.b > p.a) p.b = p.a;
    if (p.form === 3) {
      if (p.c < 2) p.c = 2;
      let k = Math.max(1, Math.round((p.a - p.b) / p.c));
      while (p.b + k * p.c > 99) k -= 1;
      p.a = p.b + k * p.c;
    }
  }
  if (id === "units") p.pair = Math.min(p.pair, UNIT_KINDS[p.kind].pairs.length - 1);
  if (id === "triangle" && p.a + p.b > 170) p.b = 170 - p.a;
  if (id === "decimal" && p.mode === 2 && p.b > p.a) p.b = p.a;
  if (id === "fraction-add" || id === "fraction-div") {
    if (p.n1 >= p.d1) p.n1 = p.d1 - 1;
    if (p.n2 >= p.d2) p.n2 = p.d2 - 1;
  }
  if (id === "fraction-add" && p.op === 1 && p.n1 * p.d2 < p.n2 * p.d1) [p.n1, p.d1, p.n2, p.d2] = [p.n2, p.d2, p.n1, p.d1];
  if (id === "combos" && p.mode === 1 && p.a > 4) p.a = 4;
  if (id === "chicken-rabbit" && p.rabbits > p.heads) p.rabbits = p.heads;
  if (id === "tree-plant") {
    const minSeg = p.ends === 2 || p.ends === 3 ? 2 : 1;
    let seg = Math.max(minSeg, Math.round(p.len / p.gap));
    while (seg * p.gap > 100) seg -= 1;
    p.len = seg * p.gap;
  }
  if (id === "venn" && p.both > Math.min(p.a, p.b)) p.both = Math.min(p.a, p.b);
}
