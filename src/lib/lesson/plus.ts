import type { Grade } from "../math/types.ts";
import type { Rng } from "../math/rng.ts";
import type { BoardItem, LessonStep } from "./timeline.ts";
import { stepDurationMs } from "./grade-style.ts";
import { fmtScaled, gcd } from "./num.ts";
import { UNIT_KINDS, type PlusId } from "./demo-defs-plus.ts";
import { normalizeParams, type Params } from "./demo-defs.ts";
import type { PracticeQ } from "./practice.ts";

// v0.16 补齐课程：计算（结果都由参数实时算出）、分步讲解、随堂练习与独立核对。

const CN = "零一二三四五六七八九";
const PLACE = ["个", "十", "百", "千"];
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const digitAt = (n: number, i: number) => Math.floor(n / 10 ** i) % 10;
const len = (n: number) => String(Math.abs(n)).length;

/** 一个四位以内的数（一个“级”）的读法；leading 表示它是整个数最高的一级（十几读作“十几”）。 */
function readGroup(n: number, leading: boolean): string {
  let s = "", zero = false, started = false;
  for (let i = 3; i >= 0; i--) {
    const d = digitAt(n, i);
    if (d === 0) { if (started) zero = true; continue; }
    if (zero) { s += "零"; zero = false; }
    if (!(leading && !started && i === 1 && d === 1)) s += CN[d];
    s += i ? PLACE[i] : "";
    started = true;
  }
  return s;
}

/** 整数的读法（到亿级）：每级末尾的 0 不读，中间连续的 0 只读一个“零”。 */
export function readNum(n: number): string {
  if (n === 0) return "零";
  let s = "", started = false, gap = false;
  for (const [v, unit] of [[Math.floor(n / 1e8), "亿"], [Math.floor(n / 1e4) % 1e4, "万"], [n % 1e4, ""]] as [number, string][]) {
    if (v === 0) { if (started) gap = true; continue; }
    if (started && (gap || v < 1000)) s += "零";
    s += readGroup(v, !started) + unit;
    started = true; gap = false;
  }
  return s;
}

const fracText = (n: number, d: number) => { const g = gcd(n, d); return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`; };

// ———————————— 计算 ————————————

export function sticks(p: Params) { const n = p.tens * 10 + p.ones; return { n, read: readNum(n) }; }

export const PLACES8 = ["个位", "十位", "百位", "千位", "万位", "十万位", "百万位", "千万位"];
export function abacus(p: Params) {
  const digits = [p.d0, p.d1, p.d2, p.d3, ...(p.mode === 1 ? [p.w0, p.w1, p.w2, p.w3] : [])];
  const n = digits.reduce((sum, d, i) => sum + d * 10 ** i, 0);
  const parts = digits.map((d, i) => ({ d, place: PLACES8[i].replace("位", "") })).filter((x) => x.d > 0).reverse();
  return { digits, n, read: readNum(n), parts, text: n.toLocaleString("en-US").replace(/,/g, " ") };
}

export function columnAdd(p: Params) {
  const sub = p.op === 1, result = sub ? p.a - p.b : p.a + p.b;
  const cols: { da: number; db: number; inc: number; out: number; d: number }[] = [];
  let carry = 0;
  for (let i = 0; i < Math.max(len(p.a), len(p.b)); i++) {
    const da = digitAt(p.a, i), db = i < len(p.b) ? digitAt(p.b, i) : 0;
    if (sub) { let x = da - carry - db; const out = x < 0 ? 1 : 0; if (out) x += 10; cols.push({ da, db, inc: carry, out, d: x }); carry = out; }
    else { const s = da + db + carry; cols.push({ da, db, inc: carry, out: s >= 10 ? 1 : 0, d: s % 10 }); carry = s >= 10 ? 1 : 0; }
  }
  return { sub, result, cols, carryTop: !sub && carry === 1, regroup: cols.some((c) => c.out), expr: `${p.a} ${sub ? "−" : "+"} ${p.b}` };
}

export function columnMul(p: Params) {
  const product = p.a * p.b, b1 = p.b % 10, b2 = Math.floor(p.b / 10);
  const rows: { d: number; inc: number; v: number }[] = [];
  let carry = 0;
  for (let i = 0; i < len(p.a); i++) { const d = digitAt(p.a, i), v = d * b1 + carry; rows.push({ d, inc: carry, v }); carry = Math.floor(v / 10); }
  return { product, b1, b2, p1: p.a * b1, p2: p.a * b2, rows, carryTop: carry, twoDigit: b2 > 0 };
}

export function longDiv(p: Params) {
  const ds = String(p.a).split("").map(Number);
  const steps: { cur: number; q: number; prod: number; rem: number; at: number }[] = [];
  let cur = 0, started = false, quotient = "";
  ds.forEach((d, at) => {
    cur = cur * 10 + d;
    if (!started && cur < p.b && at < ds.length - 1) return;
    started = true;
    const q = Math.floor(cur / p.b);
    steps.push({ cur, q, prod: q * p.b, rem: cur - q * p.b, at });
    quotient += q;
    cur -= q * p.b;
  });
  const q = Math.floor(p.a / p.b), r = p.a % p.b;
  return { q, r, steps, firstLen: steps[0].at + 1, text: r ? `${q}……${r}` : String(q), zeroInside: quotient.slice(1).includes("0") };
}

export function mixedOps(p: Params) {
  const { a, b, c } = p;
  const forms = [
    { expr: `${a} − ${b} + ${c}`, first: `${a} − ${b}`, mid: a - b, line: `${a - b} + ${c}`, result: a - b + c, rule: "只有加减法，从左往右依次计算" },
    { expr: `${a} + ${b} × ${c}`, first: `${b} × ${c}`, mid: b * c, line: `${a} + ${b * c}`, result: a + b * c, rule: "既有加法又有乘法，先算乘法，再算加法" },
    { expr: `(${a} + ${b}) × ${c}`, first: `${a} + ${b}`, mid: a + b, line: `${a + b} × ${c}`, result: (a + b) * c, rule: "有括号，先算括号里面的" },
    { expr: `(${a} − ${b}) ÷ ${c}`, first: `${a} − ${b}`, mid: a - b, line: `${a - b} ÷ ${c}`, result: (a - b) / c, rule: "有括号，先算括号里面的" },
  ];
  return forms[p.form];
}

export function barModel(p: Params) {
  const big = Math.max(p.a, p.b), small = Math.min(p.a, p.b);
  return { diff: big - small, total: p.a + p.b, times: p.a * p.k, more: p.a > p.b ? "红花" : p.a < p.b ? "黄花" : "", less: p.a > p.b ? "黄花" : p.a < p.b ? "红花" : "" };
}

export function units(p: Params) {
  const kind = UNIT_KINDS[p.kind], [big, small, rate] = kind.pairs[p.pair] as readonly [string, string, number];
  return { kind: kind.name, ladder: kind.ladder.join(" > "), big, small, rate, value: p.v * rate };
}

export const WEEK = "日一二三四五六";
export function calendar(p: Params) {
  const y = p.year, m = p.month;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = m === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const reason = y % 100 === 0 ? (leap ? `${y} 是整百年份，是 400 的倍数` : `${y} 是整百年份，不是 400 的倍数`) : leap ? `${y} 是 4 的倍数` : `${y} 不是 4 的倍数`;
  return { leap, days, first, reason, kind: m === 2 ? "2 月" : days === 31 ? "大月" : "小月", yearDays: leap ? 366 : 365 };
}

/** 小正方体的位置：x 从左到右，y 从前到后，z 从下到上。 */
export const VIEW_SHAPES: { desc: string; cubes: [number, number, number][] }[] = [
  { desc: "3 个小正方体从左到右摆成一排", cubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0]] },
  { desc: "3 个小正方体从左到右摆成一排，再在最左边那个的上面放 1 个", cubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 0, 1]] },
  { desc: "前排左右摆 2 个，在前排右边那个的后面再放 1 个", cubes: [[0, 0, 0], [1, 0, 0], [1, 1, 0]] },
  { desc: "前排从左到右摆 3 个，最左边那个的后面放 1 个、上面放 1 个", cubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [0, 0, 1]] },
  { desc: "底层前后两排、每排 2 个，在右后方那个的上面再放 1 个", cubes: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [1, 1, 1]] },
  { desc: "一排 3 摞，从左到右分别叠 1 个、2 个、3 个", cubes: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 0, 1], [2, 0, 1], [2, 0, 2]] },
];
export function views(p: Params) {
  const cubes = VIEW_SHAPES[p.shape].cubes;
  const cells = (f: (c: [number, number, number]) => string) => [...new Set(cubes.map(f))].map((k) => k.split(",").map(Number) as [number, number]);
  const maxY = Math.max(...cubes.map((c) => c[1]));
  const front = cells(([x, , z]) => `${x},${z}`), top = cells(([x, y]) => `${x},${y}`), left = cells(([, y, z]) => `${maxY - y},${z}`);
  return { n: cubes.length, front, top, left };
}

const DIR = (dx: number, dy: number) => (dy > 0 ? "北" : dy < 0 ? "南" : "") + (dx > 0 ? "东" : dx < 0 ? "西" : "");
/** 东北、西南等按“东/西 + 南/北”的习惯说法排列。 */
const dirName = (dx: number, dy: number) => { const d = DIR(dx, dy); return d.length === 2 ? d[1] + d[0] : d || "原地"; };
export function position(p: Params) {
  const dx = p.x - 4, dy = p.y - 3;
  const route = [dx ? `向${dx > 0 ? "东" : "西"}走 ${Math.abs(dx)} 格` : "", dy ? `向${dy > 0 ? "北" : "南"}走 ${Math.abs(dy)} 格` : ""].filter(Boolean).join("，再");
  const rel = (dx === 0 ? "" : dx > 0 ? "右" : "左") + (dy === 0 ? "" : dy > 0 ? "上" : "下");
  const relText = !rel ? "同一个位置" : rel.length === 1 ? `${rel === "左" || rel === "右" ? rel + "边" : rel + "面"}` : `${rel}方`;
  return { pair: `(${p.x},${p.y})`, swapped: `(${p.y},${p.x})`, dir: dirName(dx, dy), route: route ? `先${route}` : "就在学校", dx, dy, relText };
}

const FLAG: [number, number][] = [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1]];
export function transform(p: Params) {
  const origin = { x: 2, y: 1 };
  const base = FLAG.map(([x, y]) => [origin.x + x, origin.y + y] as [number, number]);
  let moved: [number, number][];
  if (p.kind === 0) moved = base.map(([x, y]) => [x + p.n, y]);
  else if (p.kind === 1) {
    const r = ([x, y]: [number, number]): [number, number] => { const dx = x - origin.x, dy = y - origin.y; return p.turn === 0 ? [origin.x + dy, origin.y - dx] : p.turn === 1 ? [origin.x - dy, origin.y + dx] : [origin.x - dx, origin.y - dy]; };
    moved = base.map(r).map(([x, y]) => [x + 4, y + 2]);
  } else moved = base.map(([x, y]) => [2 * 5 - x - 1, y]);
  const turnName = ["顺时针旋转 90°", "逆时针旋转 90°", "旋转 180°"][p.turn];
  return { base, moved, turnName, axis: 5 };
}

export function triangle(p: Params) {
  const c = 180 - p.a - p.b, max = Math.max(p.a, p.b, c);
  const kind = max === 90 ? "直角三角形" : max > 90 ? "钝角三角形" : "锐角三角形";
  const side = p.a === 60 && p.b === 60 ? "等边三角形" : p.a === p.b || p.a === c || p.b === c ? "等腰三角形" : "";
  return { c, max, kind, side };
}

const readDec = (v: number, s: number) => { const t = fmtScaled(v, s); const [i, f] = t.split("."); return readNum(Number(i)) + (f ? "点" + [...f].map((d) => CN[Number(d)]).join("") : ""); };
export function decimal(p: Params) {
  const r = p.mode === 1 ? p.a + p.b : p.mode === 2 ? p.a - p.b : p.a;
  return { aText: fmtScaled(p.a, 2), bText: fmtScaled(p.b, 2), result: fmtScaled(r, 2), raw: r, ones: Math.floor(p.a / 100), tenths: digitAt(p.a, 1), hundredths: digitAt(p.a, 0), read: readDec(p.a, 2) };
}

export const TALLY_NAMES = ["晴天", "阴天", "雨天"];
export const tallyMarks = (n: number) => "正".repeat(Math.floor(n / 5)) + ["", "一", "丅", "下", "止"][n % 5];
export function tally(p: Params) {
  const c = [p.c0, p.c1, p.c2], max = Math.max(...c), min = Math.min(...c);
  const names = (v: number) => TALLY_NAMES.filter((_, i) => c[i] === v).join("和");
  return { counts: c, total: c[0] + c[1] + c[2], maxName: names(max), minName: names(min), same: max === min };
}

export const WEEKDAYS = ["星期一", "星期二", "星期三", "星期四", "星期五"];
export function lineChart(p: Params) {
  const v = [p.v0, p.v1, p.v2, p.v3, p.v4], max = Math.max(...v);
  let rise = -Infinity, at = 0;
  for (let i = 0; i < 4; i++) if (v[i + 1] - v[i] > rise) { rise = v[i + 1] - v[i]; at = i; }
  return { v, max, maxDays: WEEKDAYS.filter((_, i) => v[i] === max), rise, at };
}

export function factors(p: Params) {
  const list: number[] = [], pairs: [number, number][] = [];
  for (let i = 1; i <= p.n; i++) if (p.n % i === 0) { list.push(i); if (i <= p.n / i) pairs.push([i, p.n / i]); }
  return { list, pairs, prime: list.length === 2, multiples: [1, 2, 3, 4, 5].map((k) => k * p.n) };
}

export function cuboid(p: Params) {
  return { edge: (p.l + p.w + p.h) * 4, area: (p.l * p.w + p.l * p.h + p.w * p.h) * 2, volume: p.l * p.w * p.h, cube: p.l === p.w && p.w === p.h };
}

export function fractionAdd(p: Params) {
  const l = lcm(p.d1, p.d2), m1 = (p.n1 * l) / p.d1, m2 = (p.n2 * l) / p.d2, rn = p.op === 1 ? m1 - m2 : m1 + m2;
  return { l, m1, m2, rn, same: p.d1 === p.d2, sign: p.op === 1 ? "−" : "+", result: fracText(rn, l), reduced: gcd(rn, l) > 1 || rn === 0 };
}

export function fractionDiv(p: Params) {
  const [an, ad] = p.mode === 1 ? [p.k, 1] : [p.n1, p.d1];
  const [bn, bd] = p.mode === 0 ? [p.k, 1] : [p.n2, p.d2];
  const a = fracText(an, ad), b = fracText(bn, bd), recip = fracText(bd, bn);
  return { a, b, recip, expr: `${a} ÷ ${b}`, mul: `${a} × ${recip}`, result: fracText(an * bd, ad * bn) };
}

export function combos(p: Params) {
  if (p.mode === 0) return { total: p.a * p.b, list: [] as string[] };
  if (p.mode === 1) { const ds = Array.from({ length: p.a }, (_, i) => i + 1); return { total: p.a * (p.a - 1), list: ds.flatMap((t) => ds.filter((o) => o !== t).map((o) => `${t}${o}`)) }; }
  return { total: (p.a * (p.a - 1)) / 2, list: [] as string[] };
}

export function chickenRabbit(p: Params) {
  const legs = 2 * (p.heads - p.rabbits) + 4 * p.rabbits;
  return { legs, chickens: p.heads - p.rabbits, allChicken: 2 * p.heads, short: legs - 2 * p.heads };
}

export const ENDS = ["两端都种", "只种一端", "两端都不种", "围成一圈"];
export function treePlant(p: Params) {
  const seg = p.len / p.gap, trees = [seg + 1, seg, seg - 1, seg][p.ends];
  const rule = ["两端都种：棵数 = 间隔数 + 1", "只种一端：棵数 = 间隔数", "两端都不种：棵数 = 间隔数 − 1", "围成一圈：棵数 = 间隔数"][p.ends];
  return { seg, trees, rule };
}

export function oddOne(p: Params) {
  let k = 0;
  while (3 ** k < p.n) k++;
  const g = Math.ceil(p.n / 3);
  return { k, groups: [g, g, p.n - 2 * g] };
}

export function venn(p: Params) { return { total: p.a + p.b - p.both, onlyA: p.a - p.both, onlyB: p.b - p.both }; }

export function idCode(p: Params) {
  const mm = String(p.month).padStart(2, "0"), dd = String(p.day).padStart(2, "0");
  const g = p.gender === 0 ? "3" : "4";
  return { date: `${p.year}${mm}${dd}`, seq: `01${g}`, g, code: `××××××${p.year}${mm}${dd}01${g}×` };
}

export function squareNumbers(p: Params) {
  if (p.mode === 0) { const odds = Array.from({ length: p.n }, (_, i) => 2 * i + 1); return { list: odds.join(" + "), result: String(p.n * p.n), last: 2 * p.n - 1 }; }
  const d = 2 ** p.n;
  return { list: Array.from({ length: p.n }, (_, i) => `1/${2 ** (i + 1)}`).join(" + "), result: fracText(d - 1, d), last: d };
}

export function optimize(p: Params) { const rounds = p.cakes === 1 ? 2 : p.cakes; return { sides: 2 * p.cakes, rounds, time: rounds * 3 }; }

export const PATTERN_KINDS = [
  { group: ["红", "黄"], name: "颜色" }, { group: ["○", "△", "△"], name: "图形" },
];
export function pattern(p: Params) {
  if (p.kind === 2) { const seq = Array.from({ length: 6 }, (_, i) => String(2 + i * p.step)); return { seq: seq.slice(0, 5), next: seq[5], group: `每次加 ${p.step}` }; }
  const g = PATTERN_KINDS[p.kind].group, seq = Array.from({ length: 7 }, (_, i) => g[i % g.length]);
  return { seq: seq.slice(0, 6), next: seq[6], group: g.join("") };
}

export const PEOPLE = ["小明", "小红", "小军"];
export const PUZZLES = [
  { items: ["语文书", "数学书", "美术书"], clues: ["小军拿的是美术书。", "小红拿的不是语文书。"], answer: [0, 1, 2], order: [2, 1, 0] },
  { items: ["红气球", "黄气球", "蓝气球"], clues: ["小明拿的是红气球。", "小红拿的不是黄气球。"], answer: [0, 2, 1], order: [0, 1, 2] },
  { items: ["跳绳", "踢毽", "拍球"], clues: ["小军不跳绳，也不踢毽。", "小红不跳绳。"], answer: [0, 1, 2], order: [2, 1, 0] },
];
export function logic(p: Params) {
  const z = PUZZLES[p.puzzle];
  return { ...z, pairs: PEOPLE.map((who, i) => `${who}：${z.items[z.answer[i]]}`) };
}

// ———————————— 讲解脚本 ————————————

let seq = 0;
const T = (text: string, tone?: "title" | "note" | "result" | "warn"): BoardItem => ({ kind: "text", id: `p${seq++}`, text, tone });
const F = (text: string): BoardItem => ({ kind: "formula", id: `p${seq++}`, text });
const COL = (lines: string[]): BoardItem => ({ kind: "column", id: `p${seq++}`, lines });
type Draft = { say: string; board?: BoardItem[]; scene?: Params; hl?: boolean };
const lesson = (grade: Grade, drafts: Draft[]): LessonStep[] => drafts.map((d, i) => ({ id: `s${i}`, say: d.say, board: d.board ?? [], highlight: d.hl && d.board?.length ? [d.board[d.board.length - 1].id] : undefined, scene: d.scene, durationMs: stepDurationMs(d.say, grade) }));
const R = (n: number) => ({ reveal: n });

export function plusScript(id: PlusId, raw: Params, grade: Grade, v: number): LessonStep[] {
  seq = 0;
  const p = normalizeParams(id, raw);
  const L = (d: Draft[]) => lesson(grade, d);
  switch (id) {
    case "sticks": {
      const r = sticks(p);
      return L([
        { say: v === 2 ? "鸡蛋 10 个装一盒，10 根小棒捆成一捆，1 捆就是 1 个十。" : "一根一根地数，数满 10 根捆成 1 捆。1 捆就是 1 个十。", board: [T("10 个一是 1 个十")], scene: R(1) },
        { say: `这里有 ${p.tens} 捆，是 ${p.tens} 个十；还有 ${p.ones} 根，是 ${p.ones} 个一。`, board: [T(`${p.tens} 个十，${p.ones} 个一`)], scene: R(2) },
        v === 1
          ? { say: `先十个十个地数：${Array.from({ length: p.tens }, (_, i) => (i + 1) * 10).join("、") || "0"}，再一个一个地数，数到 ${r.n}。`, board: [F(`${r.n}`)], scene: R(3), hl: true }
          : { say: `${p.tens} 个十和 ${p.ones} 个一合起来是 ${r.n}。`, board: [F(`${p.tens} 个十和 ${p.ones} 个一组成 ${r.n}`)], scene: R(3), hl: true },
        { say: `写数时，十位上写 ${p.tens}，个位上写 ${p.ones}${p.ones === 0 ? "，个位一个也没有就写 0" : ""}。读作：${r.read}。`, board: [T(`写作 ${r.n}，读作 ${r.read}`, "result")], scene: R(4) },
      ]);
    }
    case "abacus": {
      const r = abacus(p);
      const has0 = r.digits.slice(0, len(r.n)).includes(0);
      return L([
        { say: p.mode === 1 ? "从右往左，个级是个位、十位、百位、千位；万级是万位、十万位、百万位、千万位。" : "从右往左，数位依次是个位、十位、百位、千位。", board: [T(p.mode === 1 ? "千万 百万 十万 万 | 千 百 十 个" : "千位 百位 十位 个位")], scene: R(1) },
        { say: `计数器上拨的是：${r.parts.map((x) => `${x.d} 个${x.place}`).join("、") || "0"}。`, board: [T(`${r.parts.map((x) => `${x.d} 个${x.place}`).join("，")}`)], scene: R(2) },
        { say: `写数时，从高位写起，哪一位上一个珠子也没有，就写 0 占位：${r.n}。`, board: [F(`写作 ${r.n}`)], scene: R(3), hl: true },
        { say: has0 ? `读数时，末尾的 0 不读，中间不管有几个 0，都只读一个“零”。读作：${r.read}。` : `从高位读起，读作：${r.read}。`, board: [F(`读作 ${r.read}`)], scene: R(4), hl: true },
        ...(p.mode === 1 ? [{ say: v === 1 ? "先读万级，按个级的读法读，再加一个“万”字；然后读个级。" : "读亿以内的数：先读万级，再读个级。", board: [T("先读万级，再读个级", "note")] }] : [{ say: "相邻两个数位之间的进率是十：10 个一是 1 个十，10 个十是 1 个百。", board: [T("满十进一", "note")] }]),
      ]);
    }
    case "column-add": {
      const r = columnAdd(p);
      const W = Math.max(len(p.a), len(p.b), len(r.result)) + 2;
      const col = COL([String(p.a).padStart(W), `${r.sub ? "−" : "+"}${String(p.b).padStart(W - 1)}`, "—".repeat(W), String(r.result).padStart(W)]);
      return L([
        { say: "列竖式时，相同数位要对齐，从个位算起。", board: [T(`${r.expr} = ？`)], scene: R(0) },
        ...r.cols.slice(0, 4).map((c, i): Draft => ({
          say: r.sub
            ? (c.out
              ? `${PLACE[i]}位上${c.inc ? `被借走 1 后` : ""}不够减${c.da === 0 && c.inc ? "（0 被借走 1，要先向前一位借 1 当 10，借给后一位后剩 9）" : ""}，向前一位借 1 当 10：${c.d + c.db} − ${c.db} = ${c.d}。`
              : `${PLACE[i]}位：${c.inc ? `${c.da} 被借走 1 剩 ${c.da - 1}，` : ""}${c.da - c.inc} − ${c.db} = ${c.d}。`)
            : `${PLACE[i]}位：${c.da} + ${c.db}${c.inc ? " + 进上来的 1" : ""} = ${c.da + c.db + c.inc}${c.out ? `，满十向${PLACE[i + 1] ?? "前一"}位进 1，写 ${c.d}` : ""}。`,
          scene: R(i + 1),
        })),
        ...(r.carryTop ? [{ say: "最高位相加满十，进上来的 1 直接写在最前面。", scene: R(5) }] : []),
        { say: `所以 ${r.expr} = ${r.result}。`, board: [col, F(`${r.expr} = ${r.result}`)], scene: R(9), hl: true },
        v === 1
          ? { say: r.sub ? `验算减法用加法：${r.result} + ${p.b} = ${p.a}，对了。` : `验算加法可以交换加数再算一遍：${p.b} + ${p.a} = ${r.result}。`, board: [T(r.sub ? `验算：${r.result} + ${p.b} = ${p.a}` : `验算：${p.b} + ${p.a} = ${r.result}`, "note")] }
          : { say: r.sub ? "记住：哪一位不够减，就从前一位借 1 当 10。" : "记住：哪一位相加满十，就向前一位进 1。", board: [T(r.sub ? "不够减，退一当十" : "满十进一", "note")] },
      ]);
    }
    case "column-mul": {
      const r = columnMul(p);
      const W = len(r.product) + 2;
      const lines = r.twoDigit ? [String(p.a).padStart(W), `×${String(p.b).padStart(W - 1)}`, "—".repeat(W), String(r.p1).padStart(W), `${String(r.p2).padStart(W - 1)} `, "—".repeat(W), String(r.product).padStart(W)] : [String(p.a).padStart(W), `×${String(p.b).padStart(W - 1)}`, "—".repeat(W), String(r.product).padStart(W)];
      return L([
        { say: r.twoDigit ? `两位数乘时，先用 ${p.b} 个位上的 ${r.b1} 去乘 ${p.a}，再用十位上的 ${r.b2} 去乘。` : `用 ${p.b} 去乘 ${p.a} 的每一位，从个位乘起。`, board: [T(`${p.a} × ${p.b} = ？`)], scene: R(1) },
        ...(r.twoDigit
          ? [
            { say: `${p.a} × ${r.b1} = ${r.p1}，积的末位和个位对齐。`, board: [T(`${p.a} × ${r.b1} = ${r.p1}`)], scene: R(2) },
            { say: `${p.a} × ${r.b2} = ${r.p2}，表示 ${r.p2} 个十，积的末位要和十位对齐。`, board: [T(`${p.a} × ${r.b2}0 = ${r.p2 * 10}`)], scene: R(3) },
            { say: `把两次乘得的积加起来：${r.p1} + ${r.p2 * 10} = ${r.product}。`, scene: R(4) },
          ]
          : r.rows.map((x, i): Draft => ({ say: `${PLACE[i]}位：${p.b} × ${x.d}${x.inc ? ` 再加进上来的 ${x.inc}` : ""} = ${x.v}${i < r.rows.length - 1 || r.carryTop ? (x.v >= 10 ? `，写 ${x.v % 10}，向前一位进 ${Math.floor(x.v / 10)}` : "") : ""}。`, scene: R(i + 2) }))),
        { say: `所以 ${p.a} × ${p.b} = ${r.product}。`, board: [COL(lines), F(`${p.a} × ${p.b} = ${r.product}`)], scene: R(9), hl: true },
        v === 1
          ? { say: `估一估：${p.a} 接近 ${Math.round(p.a / 10) * 10}，${Math.round(p.a / 10) * 10} × ${p.b} = ${Math.round(p.a / 10) * 10 * p.b}，结果差不多，说明没算错大方向。`, board: [T(`估算：${Math.round(p.a / 10) * 10} × ${p.b} = ${Math.round(p.a / 10) * 10 * p.b}`, "note")] }
          : { say: "哪一位乘得满几十，就向前一位进几，进上来的数要加上去。", board: [T("满几十进几", "note")] },
      ]);
    }
    case "long-div": {
      const r = longDiv(p);
      const first = String(p.a).slice(0, r.firstLen);
      return L([
        { say: `${p.a} ÷ ${p.b}：从被除数的最高位除起。${r.firstLen > 1 ? `前 ${r.firstLen - 1} 位不够除，就看前 ${r.firstLen} 位 ${first}。` : `最高位 ${first} 够除。`}`, board: [T(`${p.a} ÷ ${p.b} = ？`)], scene: R(1) },
        ...r.steps.slice(0, 3).map((s, i): Draft => ({ say: s.q === 0 ? `${s.cur} 比 ${p.b} 小，不够商 1，这一位商 0。${i < r.steps.length - 1 ? "再把下一位落下来。" : ""}` : `${s.cur} ÷ ${p.b}，商 ${s.q}，${s.q} × ${p.b} = ${s.prod}，${s.cur} − ${s.prod} = ${s.rem}${i < r.steps.length - 1 ? "，落下下一位" : ""}。`, scene: R(i + 2) })),
        ...(r.steps.length > 3 ? [{ say: "照这样一位一位地除下去。", scene: R(5) }] : []),
        { say: r.r ? `余数 ${r.r} 比除数 ${p.b} 小，结果是 ${p.a} ÷ ${p.b} = ${r.q}……${r.r}。` : `正好除尽：${p.a} ÷ ${p.b} = ${r.q}。`, board: [F(`${p.a} ÷ ${p.b} = ${r.text}`)], scene: R(9), hl: true },
        v === 1
          ? { say: `验算：商 × 除数${r.r ? " + 余数" : ""} = 被除数，${r.q} × ${p.b}${r.r ? ` + ${r.r}` : ""} = ${p.a}。`, board: [T(`验算：${r.q} × ${p.b}${r.r ? ` + ${r.r}` : ""} = ${p.a}`, "note")] }
          : { say: r.zeroInside ? "注意：商的中间有 0，那一位不够商 1 时一定要写 0 占位。" : "除到被除数的哪一位，商就写在哪一位的上面。", board: [T(r.zeroInside ? "不够商 1，商 0 占位" : "余数要比除数小", "note")] },
      ]);
    }
    case "mixed-ops": {
      const r = mixedOps(p);
      return L([
        { say: `${r.expr}：${r.rule}。`, board: [T(r.rule, "title")], scene: R(1) },
        { say: `先算 ${r.first} = ${r.mid}。`, board: [T(`先算 ${r.first} = ${r.mid}`)], scene: R(2) },
        { say: `再算 ${r.line} = ${r.result}。`, board: [COL([r.expr, `= ${r.line}`, `= ${r.result}`])], scene: R(3), hl: true },
        v === 1 && p.form === 1
          ? { say: `如果想先算加法，就要加括号：(${p.a} + ${p.b}) × ${p.c} = ${(p.a + p.b) * p.c}，结果不一样。`, board: [T(`(${p.a} + ${p.b}) × ${p.c} = ${(p.a + p.b) * p.c}`, "note")] }
          : { say: "用递等式写：每一步算完，下一行先写等号，再写还没算的部分。", board: [T("同级从左到右；先乘除后加减；有括号先算括号里", "note")] },
      ]);
    }
    case "bar-model": {
      const r = barModel(p);
      if (p.mode === 2) return L([
        { say: `红花有 ${p.a} 朵。把 ${p.a} 朵看作 1 份，画一段线段。`, board: [T(`红花：${p.a} 朵（1 份）`)], scene: R(1) },
        { say: `黄花有这样的 ${p.k} 份，就说黄花的朵数是红花的 ${p.k} 倍。`, board: [T(`黄花：${p.k} 份`)], scene: R(2) },
        { say: `求 ${p.a} 的 ${p.k} 倍是多少，用乘法：${p.a} × ${p.k} = ${r.times}（朵）。`, board: [F(`${p.a} × ${p.k} = ${r.times}`)], scene: R(3), hl: true },
        { say: v === 1 ? `反过来，${r.times} 里面有几个 ${p.a}，用除法：${r.times} ÷ ${p.a} = ${p.k}，就是 ${p.k} 倍。` : `求一个数是另一个数的几倍，用除法：${r.times} ÷ ${p.a} = ${p.k}。`, board: [F(`${r.times} ÷ ${p.a} = ${p.k}`)], hl: true },
      ]);
      if (p.mode === 1) return L([
        { say: `红花 ${p.a} 朵，黄花 ${p.b} 朵。把两段线段接在一起，就是一共的朵数。`, board: [T(`红花 ${p.a}，黄花 ${p.b}`)], scene: R(1) },
        { say: `把两部分合起来求总数，用加法：${p.a} + ${p.b} = ${r.total}（朵）。`, board: [F(`${p.a} + ${p.b} = ${r.total}`)], scene: R(2), hl: true },
        { say: `知道总数和其中一部分，求另一部分用减法：${r.total} − ${p.a} = ${p.b}。`, board: [F(`${r.total} − ${p.a} = ${p.b}`)], scene: R(3), hl: true },
        { say: v === 2 ? "比如一共有 20 个苹果，吃了 8 个，还剩几个，就是用总数减去一部分。" : "部分 + 部分 = 总数，总数 − 一部分 = 另一部分。", board: [T("部分 + 部分 = 总数", "note")] },
      ]);
      return L([
        { say: `红花有 ${p.a} 朵，黄花有 ${p.b} 朵。各画一条线段，左端对齐。`, board: [T(`红花 ${p.a}，黄花 ${p.b}`)], scene: R(1) },
        { say: r.diff ? `${r.more}的线段长，多出来的一段就是多的部分。` : "两条线段一样长，两种花同样多。", scene: R(2) },
        { say: `求一个数比另一个数多几、少几，用减法：${Math.max(p.a, p.b)} − ${Math.min(p.a, p.b)} = ${r.diff}。`, board: [F(`${Math.max(p.a, p.b)} − ${Math.min(p.a, p.b)} = ${r.diff}`)], scene: R(3), hl: true },
        { say: r.diff ? `${r.more}比${r.less}多 ${r.diff} 朵，也就是${r.less}比${r.more}少 ${r.diff} 朵。` : "相差 0 朵。", board: [T(r.diff ? `${r.more}多 ${r.diff} 朵` : "一样多", "result")] },
      ]);
    }
    case "units": {
      const r = units(p);
      const life: Record<string, string> = { 长度: "一根跳绳长约 2 米，也就是 200 厘米。", 质量: "一袋大米重 10 千克，就是 10000 克。", 面积: "一个标准足球场约 7000 平方米，不到 1 公顷。", 时间: "一节课 40 分，课间 10 分，合起来是 50 分。" };
      return L([
        { say: `${r.kind}单位从大到小：${r.ladder.replace(/ > /g, "、")}。`, board: [T(r.ladder)], scene: R(1) },
        { say: `1 ${r.big} = ${r.rate} ${r.small}，它们之间的进率是 ${r.rate}。`, board: [F(`1 ${r.big} = ${r.rate} ${r.small}`)], scene: R(2), hl: true },
        { say: `大单位换成小单位用乘法：${p.v} ${r.big} = ${p.v} × ${r.rate} = ${r.value} ${r.small}。`, board: [F(`${p.v} ${r.big} = ${r.value} ${r.small}`)], scene: R(3), hl: true },
        { say: v === 2 ? life[r.kind] : `反过来，小单位换成大单位用除法：${r.value} ${r.small} = ${r.value} ÷ ${r.rate} = ${p.v} ${r.big}。`, board: [T(v === 2 ? life[r.kind] : `${r.value} ÷ ${r.rate} = ${p.v}`, "note")] },
      ]);
    }
    case "calendar": {
      const r = calendar(p);
      return L([
        { say: "一年有 12 个月。1、3、5、7、8、10、12 月是大月，每月 31 天。", board: [T("大月：1、3、5、7、8、10、12 月，31 天")], scene: R(1) },
        { say: v === 1 ? "握起拳头数月份：凸起的是大月，凹下的是小月（2 月除外）。4、6、9、11 月是小月，每月 30 天。" : "4、6、9、11 月是小月，每月 30 天。", board: [T("小月：4、6、9、11 月，30 天")], scene: R(1) },
        { say: "2 月特别：平年 28 天，闰年 29 天。公历年份是 4 的倍数的一般是闰年；整百年份要是 400 的倍数才是闰年。", board: [T("平年 2 月 28 天，闰年 2 月 29 天", "note")], scene: R(2) },
        { say: `${p.year} 年：${r.reason}，所以是${r.leap ? "闰年" : "平年"}，全年 ${r.yearDays} 天。`, board: [F(`${p.year} 年是${r.leap ? "闰年" : "平年"}，${r.yearDays} 天`)], scene: R(3), hl: true },
        { say: `${p.year} 年 ${p.month} 月有 ${r.days} 天，1 日是星期${WEEK[r.first]}。`, board: [T(`${p.month} 月：${r.days} 天`, "result")], scene: R(4) },
      ]);
    }
    case "views": {
      const r = views(p);
      return L([
        { say: `这个立体图形用了 ${r.n} 个同样大的小正方体。`, board: [T(`${r.n} 个小正方体`)], scene: R(1) },
        { say: `从正面看，看到 ${r.front.length} 个正方形。`, board: [T(`正面：${r.front.length} 个正方形`)], scene: R(2) },
        { say: `从上面看，看到 ${r.top.length} 个正方形。`, board: [T(`上面：${r.top.length} 个正方形`)], scene: R(3) },
        { say: `从左面看，看到 ${r.left.length} 个正方形。`, board: [T(`左面：${r.left.length} 个正方形`)], scene: R(4) },
        { say: v === 1 ? "被挡住的小正方体从这个方向看不到；只看一个方向，不能确定一共用了几个。" : "同一个物体，从不同方向看，看到的形状可能不同。", board: [T("从不同方向看，形状可能不同", "note")] },
      ]);
    }
    case "position": {
      const r = position(p);
      if (p.mode === 1) return L([
        { say: "看地图时，一般是上北下南，左西右东。", board: [T("上北下南，左西右东")], scene: R(1) },
        { say: r.dir === "原地" ? "小旗就在学校。" : `小旗在学校的${r.dir}方向。`, board: [T(`小旗在学校的${r.dir}方向`)], scene: R(2) },
        { say: `从学校出发：${r.route}，就到小旗。`, board: [F(r.route)], scene: R(3), hl: true },
        { say: v === 2 ? "早上面向太阳，前面是东，后面是西，左面是北，右面是南。" : "东和西相对，南和北相对；东北、西北、东南、西南在它们中间。", board: [T("东—西相对，南—北相对", "note")] },
      ]);
      if (p.mode === 2) return L([
        { say: "以小猫为准，说一说小旗在小猫的哪一边。", board: [T("以小猫为准")], scene: R(1) },
        { say: `小旗在小猫的${r.relText}。`, board: [F(`小旗在小猫的${r.relText}`)], scene: R(2), hl: true },
        { say: "说位置时，先说清楚以谁为准。换一个物体做标准，说法就会变。", board: [T("上和下相对，左和右相对", "note")], scene: R(3) },
      ]);
      return L([
        { say: "确定位置时，先说第几列，再说第几行。列从左往右数，行从下往上数。", board: [T("先列后行")], scene: R(1) },
        { say: `小旗在第 ${p.x} 列、第 ${p.y} 行。`, board: [T(`第 ${p.x} 列，第 ${p.y} 行`)], scene: R(2) },
        { say: `用数对表示就是 ${r.pair}：前一个数表示列，后一个数表示行。`, board: [F(`数对 ${r.pair}`)], scene: R(3), hl: true },
        { say: p.x === p.y ? "列和行相同的点在一条斜线上。" : `${r.swapped} 是第 ${p.y} 列、第 ${p.x} 行，和 ${r.pair} 不是同一个位置。`, board: [T(p.x === p.y ? "列数 = 行数" : `${r.pair} ≠ ${r.swapped}`, "note")] },
      ]);
    }
    case "transform": {
      const r = transform(p);
      if (p.kind === 1) return L([
        { say: "旋转时，图形绕着一个点转动，这个点的位置不变。", board: [T("绕点 O 旋转")], scene: R(1) },
        { say: `把小旗绕点 O ${r.turnName}。`, board: [T(r.turnName)], scene: R(2) },
        { say: "每条线段都转过同样的角度，长度不变，所以图形的形状和大小都不变。", board: [F("形状、大小不变，位置和方向变了")], scene: R(3), hl: true },
        { say: v === 2 ? "钟面上的指针、转动的风车，都在旋转。" : "顺时针就是和钟面指针转动的方向相同。", board: [T("顺时针 ↻，逆时针 ↺", "note")] },
      ]);
      if (p.kind === 2) return L([
        { say: "沿一条直线对折，两边能完全重合的图形是轴对称图形，这条直线是对称轴。", board: [T("对折后完全重合")], scene: R(1) },
        { say: "画对称图形：先找出关键点，数一数它到对称轴有几格。", scene: R(2) },
        { say: "在对称轴另一边，离对称轴同样多格的地方点出对应点，再连起来。", board: [F("对应点到对称轴的距离相等")], scene: R(3), hl: true },
        { say: v === 1 ? "长方形有 2 条对称轴，正方形有 4 条，圆有无数条。" : "对称图形的形状和大小不变，只是左右方向相反。", board: [T(v === 1 ? "长方形 2 条，正方形 4 条，圆无数条" : "左右相反", "note")] },
      ]);
      return L([
        { say: "平移时，图形沿着直线移动，形状、大小和方向都不变。", board: [T("平移：沿直线移动")], scene: R(1) },
        { say: `把小旗向右平移 ${p.n} 格。数格子时，看一个点和它的对应点之间隔了几格。`, board: [T(`向右平移 ${p.n} 格`)], scene: R(2) },
        { say: `旗杆底部原来在第 ${r.base[0][0] + 1} 格，平移后在第 ${r.moved[0][0] + 1} 格：${r.base[0][0] + 1} + ${p.n} = ${r.moved[0][0] + 1}。`, board: [F(`每个点都向右移动 ${p.n} 格`)], scene: R(3), hl: true },
        { say: v === 2 ? "推拉窗、电梯上下运动、拉抽屉，都是平移。" : "不要数两个图形之间空了几格，要数对应点之间移动了几格。", board: [T("数对应点之间的格数", "note")] },
      ]);
    }
    case "triangle": {
      const r = triangle(p);
      return L([
        { say: "把三角形的三个角撕下来，拼在一起，正好拼成一个平角。", board: [T("三个角拼成一个平角")], scene: R(1) },
        { say: "所以三角形的内角和是 180°，和三角形的大小无关。", board: [F("内角和 = 180°")], scene: R(2), hl: true },
        { say: `已知两个角是 ${p.a}° 和 ${p.b}°，第三个角是 180° − ${p.a}° − ${p.b}° = ${r.c}°。`, board: [F(`180° − ${p.a}° − ${p.b}° = ${r.c}°`)], scene: R(3), hl: true },
        { say: `最大的角是 ${r.max}°，${r.max === 90 ? "是直角" : r.max > 90 ? "是钝角" : "三个角都是锐角"}，所以这是${r.kind}。${r.side ? `有两个角相等，也是${r.side}。` : ""}`, board: [T(`${r.kind}${r.side ? `，${r.side}` : ""}`, "result")], scene: R(4) },
        { say: v === 1 ? "一个三角形里最多只有一个直角或一个钝角，因为两个就超过 180° 了。" : "按角分：锐角三角形、直角三角形、钝角三角形。", board: [T("最多一个直角或钝角", "note")] },
      ]);
    }
    case "decimal": {
      const r = decimal(p);
      if (p.mode === 0) return L([
        { say: "把 1 平均分成 10 份，每份是 0.1；平均分成 100 份，每份是 0.01。", board: [T("1/10 = 0.1，1/100 = 0.01")], scene: R(1) },
        { say: `${r.aText} 由 ${r.ones} 个一、${r.tenths} 个 0.1 和 ${r.hundredths} 个 0.01 组成，也就是 ${p.a} 个 0.01。`, board: [T(`${r.aText} = ${p.a} 个 0.01`)], scene: R(2) },
        { say: "小数点左边是整数部分，右边依次是十分位、百分位。", board: [F(`${r.aText}：${r.ones} 个一，${r.tenths} 个十分之一，${r.hundredths} 个百分之一`)], scene: R(3), hl: true },
        { say: `读小数时，整数部分按整数读，小数部分一个一个读出数字：${r.read}。`, board: [T(`读作 ${r.read}`, "result")] },
        ...(v === 2 ? [{ say: `${r.aText} 元就是 ${r.ones} 元 ${r.tenths} 角 ${r.hundredths} 分。`, board: [T(`${r.aText} 元 = ${r.ones} 元 ${r.tenths} 角 ${r.hundredths} 分`, "note")] }] : []),
      ]);
      const sign = p.mode === 1 ? "+" : "−";
      return L([
        { say: "小数加减法，先把小数点对齐，也就是相同数位对齐。", board: [T(`${r.aText} ${sign} ${r.bText} = ？`)], scene: R(1) },
        { say: "从最低位算起，按整数加减法的方法计算，满十进一，不够减退一。", scene: R(2) },
        { say: `得数的小数点要和上面的小数点对齐：${r.aText} ${sign} ${r.bText} = ${r.result}。`, board: [F(`${r.aText} ${sign} ${r.bText} = ${r.result}`)], scene: R(3), hl: true },
        { say: v === 1 ? `可以想成钱：${r.aText} 元 ${sign === "+" ? "加" : "减"} ${r.bText} 元，元对元、角对角、分对分。` : "得数末尾有 0 的，一般把 0 去掉。", board: [T("小数点对齐", "note")] },
      ]);
    }
    case "tally": {
      const r = tally(p);
      return L([
        { say: "记录一个月的天气。先分类：晴天、阴天、雨天各放一类。", board: [T("先分类")], scene: R(1) },
        { say: "一边数一边画“正”字，一笔表示 1 天，一个“正”字表示 5 天。", board: [T("一个“正”字是 5")], scene: R(2) },
        { say: `晴天 ${p.c0} 天，阴天 ${p.c1} 天，雨天 ${p.c2} 天，一共 ${r.total} 天。`, board: [F(`${p.c0} + ${p.c1} + ${p.c2} = ${r.total}`)], scene: R(3), hl: true },
        { say: r.same ? "三种天气一样多。" : `${r.maxName}最多，${r.minName}最少。`, board: [T(r.same ? "一样多" : `${r.maxName}最多`, "result")], scene: R(4) },
        { say: v === 1 ? "整理成统计表，一眼就能看出每类有多少。" : "分类时标准要统一，不重复、不遗漏。", board: [T("统计表：类别 | 天数", "note")] },
      ]);
    }
    case "line-chart": {
      const r = lineChart(p);
      return L([
        { say: "折线统计图先按数量描点，再把点按顺序连起来。", board: [T("描点 → 连线")], scene: R(1) },
        { say: `从点的高低看数量的多少：${r.maxDays.join("、")}最高，${r.max} ℃。`, board: [T(`最高：${r.max} ℃`)], scene: R(2) },
        { say: "从线的方向看变化：往上是上升，往下是下降，越陡变化越大。", scene: R(3) },
        { say: r.rise > 0 ? `${WEEKDAYS[r.at]}到${WEEKDAYS[r.at + 1]}上升得最多，升高了 ${r.rise} ℃。` : "这几天的气温没有上升。", board: [F(r.rise > 0 ? `${r.v[r.at + 1]} − ${r.v[r.at]} = ${r.rise}（℃）` : "没有上升")], scene: R(4), hl: true },
        { say: v === 1 ? "条形统计图便于比较多少，折线统计图还能清楚地看出增减变化。" : "根据变化的趋势，还可以大致推测后面的情况。", board: [T("折线图：看出增减变化", "note")] },
      ]);
    }
    case "factors": {
      const r = factors(p);
      return L([
        { say: `用 ${p.n} 个同样的小正方形拼长方形，每排个数 × 排数 = ${p.n}。`, board: [T(`${p.n} 个小正方形`)], scene: R(1) },
        { say: `能拼成：${r.pairs.map(([a, b]) => `${a} × ${b}`).join("、")}。`, board: [T(r.pairs.map(([a, b]) => `${a}×${b}`).join("  "))], scene: R(2) },
        { say: `所以 ${p.n} 的因数有：${r.list.join("、")}，共 ${r.list.length} 个。`, board: [F(`${p.n} 的因数：${r.list.join("，")}`)], scene: R(3), hl: true },
        { say: r.prime ? `${p.n} 只有 1 和它本身两个因数，是质数。` : `${p.n} 除了 1 和它本身还有别的因数，是合数。`, board: [T(r.prime ? "质数" : "合数", "result")] },
        { say: v === 1 ? `${p.n} 的倍数有 ${r.multiples.join("、")}……一个数的倍数有无数个，最小的倍数是它本身。` : "一个数的因数个数是有限的，最小的是 1，最大的是它本身。", board: [T(`${p.n} 的倍数：${r.multiples.join("，")}……`, "note")] },
      ]);
    }
    case "cuboid": {
      const r = cuboid(p);
      return L([
        { say: `长方体有 6 个面，相对的面完全相同；有 12 条棱，长、宽、高各 4 条。${r.cube ? "长、宽、高都相等，这是正方体。" : ""}`, board: [T(`长 ${p.l}，宽 ${p.w}，高 ${p.h}（厘米）`)], scene: R(1) },
        { say: `棱长总和 = (长 + 宽 + 高) × 4 = (${p.l} + ${p.w} + ${p.h}) × 4 = ${r.edge} 厘米。`, board: [F(`(${p.l}+${p.w}+${p.h})×4 = ${r.edge}（cm）`)], scene: R(2), hl: true },
        { say: `表面积是 6 个面的面积和：(${p.l}×${p.w} + ${p.l}×${p.h} + ${p.w}×${p.h}) × 2 = ${r.area} 平方厘米。`, board: [F(`(${p.l}×${p.w}+${p.l}×${p.h}+${p.w}×${p.h})×2 = ${r.area}（cm²）`)], scene: R(3), hl: true },
        { say: `体积：每层摆 ${p.l} × ${p.w} = ${p.l * p.w} 个 1 立方厘米的小正方体，摆 ${p.h} 层，一共 ${r.volume} 个。长 × 宽 × 高 = ${r.volume} 立方厘米。`, board: [F(`${p.l}×${p.w}×${p.h} = ${r.volume}（cm³）`)], scene: R(4), hl: true },
        { say: v === 1 ? "表面积看的是外面一层的大小，体积看的是占了多大的空间，单位不同。" : "体积也可以写成：底面积 × 高。", board: [T("表面积用 cm²，体积用 cm³", "note")] },
      ]);
    }
    case "fraction-add": {
      const r = fractionAdd(p);
      return L([
        { say: `${p.n1}/${p.d1} ${r.sign} ${p.n2}/${p.d2}：${r.same ? "分母相同，分数单位相同，可以直接相加减。" : `分母不同，分数单位不同，要先通分。${p.d1} 和 ${p.d2} 的最小公倍数是 ${r.l}。`}`, board: [T(`${p.n1}/${p.d1} ${r.sign} ${p.n2}/${p.d2}`)], scene: R(1) },
        { say: r.same ? `分母不变，分子${p.op === 1 ? "相减" : "相加"}：${p.n1} ${r.sign} ${p.n2} = ${r.rn}。` : `${p.n1}/${p.d1} = ${r.m1}/${r.l}，${p.n2}/${p.d2} = ${r.m2}/${r.l}。`, board: [T(r.same ? `分子 ${p.n1} ${r.sign} ${p.n2} = ${r.rn}` : `通分：${r.m1}/${r.l} ${r.sign} ${r.m2}/${r.l}`)], scene: R(2) },
        { say: `${r.m1}/${r.l} ${r.sign} ${r.m2}/${r.l} = ${r.rn}/${r.l}。`, board: [F(`${r.m1}/${r.l} ${r.sign} ${r.m2}/${r.l} = ${r.rn}/${r.l}`)], scene: R(3), hl: true },
        { say: r.reduced ? `结果要化成最简分数：${r.rn}/${r.l} = ${r.result}。` : `${r.rn}/${r.l} 已经是最简分数。`, board: [F(`= ${r.result}`)], scene: R(4), hl: true },
        { say: v === 1 ? "通分就是把分数单位变成一样的，这样才能直接数有几个分数单位。" : "约分时，分子分母同时除以它们的最大公因数。", board: [T("先通分，再计算，最后约分", "note")] },
      ]);
    }
    case "fraction-div": {
      const r = fractionDiv(p);
      return L([
        { say: "分数除法和整数除法意义相同：已知两个因数的积和其中一个因数，求另一个因数。", board: [T(`${r.expr} = ？`)], scene: R(1) },
        { say: p.mode === 0 ? `把 ${r.a} 平均分成 ${p.k} 份，求每份是多少，就是求 ${r.a} 的 1/${p.k}。` : `${r.expr} 就是看 ${r.a} 里面有几个 ${r.b}。`, scene: R(2) },
        { say: `除以一个不等于 0 的数，等于乘这个数的倒数。${r.b} 的倒数是 ${r.recip}。`, board: [F(`${r.b} 的倒数是 ${r.recip}`)], scene: R(3), hl: true },
        { say: `所以 ${r.expr} = ${r.mul} = ${r.result}。`, board: [F(`${r.expr} = ${r.mul} = ${r.result}`)], scene: R(4), hl: true },
        { say: v === 1 ? `验算：${r.result} × ${r.b} = ${r.a}，对了。` : "乘积是 1 的两个数互为倒数；0 没有倒数。", board: [T(v === 1 ? `验算：${r.result} × ${r.b} = ${r.a}` : "乘积是 1 的两个数互为倒数", "note")] },
      ]);
    }
    case "combos": {
      const r = combos(p);
      if (p.mode === 1) return L([
        { say: `用 ${Array.from({ length: p.a }, (_, i) => i + 1).join("、")} 组成十位和个位不同的两位数。`, board: [T(`数字：${Array.from({ length: p.a }, (_, i) => i + 1).join("、")}`)], scene: R(1) },
        { say: `先定十位：有 ${p.a} 种选法；个位只能从剩下的 ${p.a - 1} 个数字里选。`, scene: R(2) },
        { say: `一共 ${p.a} × ${p.a - 1} = ${r.total} 个：${r.list.join("、")}。`, board: [F(`${p.a} × ${p.a - 1} = ${r.total}`)], scene: R(3), hl: true },
        { say: "按顺序写：十位是 1 的写完，再写十位是 2 的，就不会重复也不会漏掉。", board: [T("有序思考，不重不漏", "note")] },
      ]);
      if (p.mode === 2) return L([
        { say: `${p.a} 个小朋友，每两人握一次手。`, board: [T(`${p.a} 人，每两人握一次`)], scene: R(1) },
        { say: `每个人都要和另外 ${p.a - 1} 人握手，${p.a} × ${p.a - 1} = ${p.a * (p.a - 1)}，但这样每次握手都算了两遍。`, scene: R(2) },
        { say: `所以一共握 ${p.a} × ${p.a - 1} ÷ 2 = ${r.total} 次。`, board: [F(`${p.a} × ${p.a - 1} ÷ 2 = ${r.total}`)], scene: R(3), hl: true },
        { say: v === 1 ? `也可以依次数：第 1 人握 ${p.a - 1} 次，第 2 人再握 ${p.a - 2} 次……加起来也是 ${r.total} 次。` : "画图连线，每两个点连一条线，数一数有几条线。", board: [T("每两人之间只握一次", "note")] },
      ]);
      return L([
        { say: `有 ${p.a} 件上衣、${p.b} 条裤子，一件上衣配一条裤子，有几种穿法？`, board: [T(`${p.a} 件上衣，${p.b} 条裤子`)], scene: R(1) },
        { say: `先看第 1 件上衣：可以配 ${p.b} 条裤子中的任意一条，有 ${p.b} 种。`, scene: R(2) },
        { say: `每件上衣都有 ${p.b} 种配法，${p.a} 件就是 ${p.a} × ${p.b} = ${r.total} 种。`, board: [F(`${p.a} × ${p.b} = ${r.total}`)], scene: R(3), hl: true },
        { say: "按顺序一件一件地连线，就能不重复、不遗漏。", board: [T("有序思考，不重不漏", "note")] },
      ]);
    }
    case "chicken-rabbit": {
      const r = chickenRabbit(p);
      const assumeRabbit = v === 1;
      return L([
        { say: `笼子里有鸡和兔共 ${p.heads} 只，从下面数有 ${r.legs} 只脚。鸡和兔各有几只？`, board: [T(`头 ${p.heads}，脚 ${r.legs}`)], scene: R(1) },
        assumeRabbit
          ? { say: `假设全是兔：${p.heads} × 4 = ${p.heads * 4} 只脚，比实际多了 ${p.heads * 4 - r.legs} 只。`, board: [T(`${p.heads} × 4 − ${r.legs} = ${p.heads * 4 - r.legs}`)], scene: R(2) }
          : { say: `假设全是鸡：${p.heads} × 2 = ${r.allChicken} 只脚，比实际少了 ${r.short} 只。`, board: [T(`${r.legs} − ${p.heads} × 2 = ${r.short}`)], scene: R(2) },
        assumeRabbit
          ? { say: `把 1 只兔换成鸡，脚少 2 只：${p.heads * 4 - r.legs} ÷ 2 = ${r.chickens}，鸡有 ${r.chickens} 只。`, board: [F(`鸡：${p.heads * 4 - r.legs} ÷ 2 = ${r.chickens}`)], scene: R(3), hl: true }
          : { say: `把 1 只鸡换成兔，脚多 2 只：${r.short} ÷ 2 = ${p.rabbits}，兔有 ${p.rabbits} 只。`, board: [F(`兔：${r.short} ÷ 2 = ${p.rabbits}`)], scene: R(3), hl: true },
        { say: `${assumeRabbit ? `兔有 ${p.heads} − ${r.chickens} = ${p.rabbits} 只` : `鸡有 ${p.heads} − ${p.rabbits} = ${r.chickens} 只`}。检验：${r.chickens} × 2 + ${p.rabbits} × 4 = ${r.legs}。`, board: [T(`鸡 ${r.chickens} 只，兔 ${p.rabbits} 只`, "result")], scene: R(4) },
      ]);
    }
    case "tree-plant": {
      const r = treePlant(p);
      return L([
        { say: p.ends === 3 ? `在周长 ${p.len} 米的圆形花坛边上，每隔 ${p.gap} 米种一棵树。` : `在 ${p.len} 米长的小路一边，每隔 ${p.gap} 米种一棵树，${ENDS[p.ends]}。`, board: [T(`全长 ${p.len} 米，间隔 ${p.gap} 米`)], scene: R(1) },
        { say: `先求有几个间隔：${p.len} ÷ ${p.gap} = ${r.seg}（个）。`, board: [F(`${p.len} ÷ ${p.gap} = ${r.seg}`)], scene: R(2), hl: true },
        { say: `${r.rule}，所以要种 ${r.trees} 棵。`, board: [F(`${r.trees} 棵`)], scene: R(3), hl: true },
        { say: v === 1 ? "数大的时候不好画，可以先画一小段，找出棵数和间隔数的关系。" : "围成一圈时，首尾两棵重合，所以棵数正好等于间隔数。", board: [T(r.rule, "note")] },
      ]);
    }
    case "odd-one": {
      const r = oddOne(p);
      return L([
        { say: `${p.n} 个零件里有 1 个次品，比其他的轻一点。用天平最少称几次能保证找出来？`, board: [T(`${p.n} 个，1 个次品略轻`)], scene: R(1) },
        { say: `把零件尽量平均分成 3 份：${r.groups.join("、")}。天平两边各放一份。`, board: [T(`分成 ${r.groups.join("，")}`)], scene: R(2) },
        { say: "天平平衡，次品在没放上去的那一份；不平衡，次品在轻的那一边。", scene: R(3) },
        { say: `每称一次，范围缩小到约三分之一。${p.n} 个最少称 ${r.k} 次能保证找到。`, board: [F(`最少称 ${r.k} 次`)], scene: R(4), hl: true },
        { say: v === 1 ? "2—3 个称 1 次，4—9 个称 2 次，10—27 个称 3 次。" : "分成 3 份比分成 2 份更快，因为没放上去的那一份也能被判断。", board: [T("3 次方：3、9、27", "note")] },
      ]);
    }
    case "venn": {
      const r = venn(p);
      return L([
        { say: `参加跳绳的有 ${p.a} 人，参加踢毽的有 ${p.b} 人，两项都参加的有 ${p.both} 人。`, board: [T(`跳绳 ${p.a}，踢毽 ${p.b}，都参加 ${p.both}`)], scene: R(1) },
        { say: "画两个圈，两项都参加的人放在两个圈重叠的部分。", scene: R(2) },
        { say: `只参加跳绳的有 ${p.a} − ${p.both} = ${r.onlyA} 人，只参加踢毽的有 ${p.b} − ${p.both} = ${r.onlyB} 人。`, board: [T(`只跳绳 ${r.onlyA}，只踢毽 ${r.onlyB}`)], scene: R(3) },
        { say: `一共有 ${p.a} + ${p.b} − ${p.both} = ${r.total} 人。重叠部分的人被数了两次，要减去一次。`, board: [F(`${p.a} + ${p.b} − ${p.both} = ${r.total}`)], scene: R(4), hl: true },
        { say: v === 1 ? `也可以三部分相加：${r.onlyA} + ${p.both} + ${r.onlyB} = ${r.total}。` : "这样的图叫集合图，也叫韦恩图。", board: [T("重叠部分只算一次", "note")] },
      ]);
    }
    case "id-code": {
      const r = idCode(p);
      return L([
        { say: "身份证号码共 18 位，每一段都有意思。", board: [T(r.code)], scene: R(1) },
        { say: "前 6 位是地址码，表示户口登记的地方。", scene: R(2) },
        { say: `第 7 到 14 位是出生日期码：${r.date}，表示 ${p.year} 年 ${p.month} 月 ${p.day} 日出生。`, board: [F(`${r.date} → ${p.year} 年 ${p.month} 月 ${p.day} 日`)], scene: R(3), hl: true },
        { say: `第 15 到 17 位是顺序码，第 17 位单数表示男性，双数表示女性。这里是 ${r.g}，表示${p.gender === 0 ? "男" : "女"}性。`, board: [T(`第 17 位 ${r.g} → ${p.gender === 0 ? "男" : "女"}`)], scene: R(4) },
        { say: v === 1 ? "邮政编码、车牌号、学号也是编码，编码要简明、有规律、不重复。" : "最后一位是校验码，用来检查前面的号码有没有写错。", board: [T("编码：简明、有规律、不重复", "note")], scene: R(5) },
      ]);
    }
    case "square-numbers": {
      const r = squareNumbers(p);
      if (p.mode === 1) return L([
        { say: "把一个正方形看作 1。先涂一半，是 1/2；再涂剩下的一半，是 1/4……", board: [T("一次涂剩下的一半")], scene: R(1) },
        { say: `一共涂了 ${p.n} 次：${r.list}。`, board: [T(r.list)], scene: R(2) },
        { say: `没涂的部分是 1/${r.last}，所以和是 1 − 1/${r.last} = ${r.result}。`, board: [F(`${r.list} = ${r.result}`)], scene: R(3), hl: true },
        { say: "涂的次数越多，剩下的越少，和越来越接近 1。", board: [T("和越来越接近 1", "note")] },
      ]);
      return L([
        { say: "从 1 个小正方形开始，每次在外面加一层，拼成更大的正方形。", board: [T("1，3，5，7……")], scene: R(1) },
        { say: `每一层分别是 ${r.list} 个，都是连续的奇数。`, scene: R(2) },
        { say: `拼成的是每边 ${p.n} 个的正方形：${r.list} = ${p.n} × ${p.n} = ${r.result}。`, board: [F(`${r.list} = ${p.n}² = ${r.result}`)], scene: R(3), hl: true },
        { say: v === 1 ? "从 1 开始的连续奇数相加，加几个，和就是几乘几。" : "借助图形，抽象的算式一下子就看懂了，这就是数形结合。", board: [T("连续奇数的和是平方数", "note")] },
      ]);
    }
    case "optimize": {
      const r = optimize(p);
      return L([
        { say: `一口锅每次最多烙 2 张饼，每面要烙 3 分钟。烙 ${p.cakes} 张饼最少要几分钟？`, board: [T(`${p.cakes} 张饼，共 ${r.sides} 个面`)], scene: R(1) },
        { say: p.cakes === 1 ? "只有 1 张饼时，正面、反面不能同时烙，要烙 2 次。" : "让锅里每次都放满 2 个面，锅就不会空着。", scene: R(2) },
        { say: p.cakes === 3 ? "第 1 次烙 1、2 号的正面；第 2 次烙 1 号反面和 3 号正面；第 3 次烙 2、3 号的反面。" : `${r.sides} 个面，每次烙 2 个，要烙 ${r.rounds} 次。`, scene: R(3) },
        { say: `最少要 ${r.rounds} × 3 = ${r.time} 分钟。`, board: [F(`${r.rounds} × 3 = ${r.time}（分）`)], scene: R(4), hl: true },
        { say: v === 1 ? "沏茶时，烧水的同时洗茶杯，也是合理安排、节省时间。" : "合理安排，让每一次都不浪费，就是优化。", board: [T("每次都放满，不让锅空着", "note")] },
      ]);
    }
    case "pattern": {
      const r = pattern(p);
      return L([
        { say: p.kind === 2 ? `看这一列数：${r.seq.join("、")}。` : `看这一排：${r.seq.join("、")}。`, board: [T(r.seq.join("  "))], scene: R(1) },
        { say: p.kind === 2 ? `后一个数都比前一个数多 ${p.step}。` : `${r.group.split("").join("、")}是一组，一组一组地重复出现。`, board: [T(p.kind === 2 ? r.group : `一组：${r.group}`)], scene: R(2) },
        { say: `所以下一个是 ${r.next}。`, board: [F(`下一个：${r.next}`)], scene: R(3), hl: true },
        { say: v === 2 ? "红绿灯、一周七天，都是按规律重复出现的。" : "找规律时，先找出重复的一组，或者看每次怎样变化。", board: [T("先找一组", "note")] },
      ]);
    }
    case "logic": {
      const r = logic(p);
      return L([
        { say: `小明、小红、小军各拿了一样：${r.items.join("、")}。线索：${r.clues.join("")}`, board: [T(r.clues.join(" "))], scene: R(1) },
        { say: `先用最确定的线索：${r.clues[0]}在表格里画 √，同一行、同一列的其他格画 ×。`, scene: R(2) },
        { say: `再看第二条：${r.clues[1]}画 ×，剩下的只有一种可能。`, scene: R(3) },
        { say: `结果：${r.pairs.join("，")}。`, board: [F(r.pairs.join("  "))], scene: R(4), hl: true },
        { say: "用表格推理：一行一列只能有一个 √。", board: [T("一行一列只有一个 √", "note")] },
      ]);
    }
  }
}

// ———————————— 随堂练习 ————————————

const J = (b: boolean) => (b ? "对" : "错");
function choices(answer: string, wrong: string[], rng: Rng): string[] {
  return rng.shuffle([...new Set([answer, ...wrong.filter((w) => w !== answer)])].slice(0, 4));
}
const pick = <T,>(rng: Rng, xs: readonly T[]) => xs[rng.int(0, xs.length - 1)];

type Base = { id: string; demo: PlusId; level: number; traps: Record<string, string> };
type Q = Omit<PracticeQ, "id" | "demo" | "level">;

const TRANSFORM_JUDGE = [["电梯上下运动是平移。", true], ["风扇叶片的转动是旋转。", true], ["平移后，图形的形状和大小都变了。", false], ["钟表指针的转动是平移。", false]] as const;
const SYMMETRY = [["长方形", "2 条"], ["正方形", "4 条"], ["等边三角形", "3 条"], ["圆", "无数条"]] as const;
const TRIANGLE_JUDGE = [["一个三角形中最多有一个直角。", true], ["钝角三角形中可能有两个钝角。", false], ["等边三角形的每个角都是 60°。", true], ["三角形越大，内角和越大。", false]] as const;
const DIRECTION_LOW = [["小猫在小狗的左边，那么小狗在小猫的（　）边。", "右", ["左", "上", "下"]], ["早上面对太阳，前面是东，后面是（　）。", "西", ["南", "北", "东"]], ["看地图时上北下南，左边是（　）。", "西", ["东", "南", "北"]]] as const;
const ID_PARTS = ["出生日期", "地址", "性别和顺序", "校验"];

function build(demo: PlusId, grade: Grade, lv: number, rng: Rng): Q {
  switch (demo) {
    case "sticks": {
      if (lv === 1) { const o = rng.int(0, 9); return { kind: "fill", params: { tens: 1, ones: o, q: 1 }, prompt: `1 个十和 ${o} 个一合起来是（　）。`, answer: String(10 + o), steps: [`10 + ${o} = ${10 + o}`], traps: { [`1${o}0`]: "1 个十就是 10，再加几个一。" } }; }
      if (lv === 2) { const t = rng.int(2, 9), o = rng.int(0, 9); return { kind: "fill", params: { tens: t, ones: o, q: 2 }, prompt: `${t * 10 + o} 里面有（　）个十和 ${o} 个一。`, answer: String(t), steps: [`十位上是 ${t}，表示 ${t} 个十。`], traps: { [String(o)]: "个位上的数表示几个一，十位上的数表示几个十。" } }; }
      let a = rng.int(10, 99), b = rng.int(10, 99); if (a === b) b = a === 99 ? 98 : a + 1;
      return { kind: "choice", params: { a, b, q: 3 }, prompt: `${a} 和 ${b}，哪个数大？`, answer: String(Math.max(a, b)), choices: [String(a), String(b)], steps: [Math.floor(a / 10) !== Math.floor(b / 10) ? "先比十位，十位大的数就大。" : "十位相同，再比个位。"], traps: {} };
    }
    case "abacus": {
      const big = grade >= 4;
      const make = () => { const n = big ? rng.int(1, 9) * 1e7 + rng.int(0, 9) * 1e5 + rng.int(0, 9) * 1e4 + rng.int(0, 9) * 100 + rng.int(0, 9) : rng.int(1, 9) * 1000 + rng.int(0, 1) * rng.int(1, 9) * 100 + rng.int(0, 9) * 10 + rng.int(0, 1) * rng.int(1, 9); return n; };
      const n = make();
      if (lv === 1) { const wrong = [readNum(n).replace(/零/g, ""), readNum(n + (big ? 1e6 : 100)), readNum(Math.floor(n / 10))]; return { kind: "choice", params: { n, q: 1 }, prompt: `${n} 读作（　）。`, answer: readNum(n), choices: choices(readNum(n), wrong, rng), steps: ["从高位读起；末尾的 0 不读，中间连续的 0 只读一个“零”。"], traps: { [readNum(n).replace(/零/g, "")]: "中间的 0 要读出一个“零”。" } }; }
      if (lv === 2) { const place = rng.int(0, big ? 7 : 3); return { kind: "fill", params: { n, place, q: 2 }, prompt: `${n} 的${PLACES8[place]}上是（　）。`, answer: String(digitAt(n, place)), steps: [`从右往左数：个位、十位、百位、千位${big ? "、万位、十万位、百万位、千万位" : ""}。`], traps: {} }; }
      return { kind: "fill", params: { n, q: 3 }, prompt: `${readNum(n)}，写作（　）。`, answer: String(n), steps: ["从高位写起，哪一位上一个单位也没有，就写 0 占位。"], traps: { [String(n).replace(/0/g, "")]: "没有单位的数位要写 0 占位。" } };
    }
    case "column-add": {
      const op = lv === 3 ? 1 : rng.int(0, 1);
      let a = 0, b = 0;
      for (let t = 0; t < 60; t++) {
        a = lv === 3 ? rng.int(100, 999) : rng.int(10, 99); b = lv === 3 ? rng.int(10, a) : rng.int(10, op ? a : 99);
        const regroup = columnAdd({ op, a, b }).regroup;
        if (op && b > a) continue;
        if ((lv === 1 && !regroup) || (lv >= 2 && regroup)) break;
      }
      const r = columnAdd({ op, a, b });
      const naive = op ? Number(r.cols.map((c) => Math.abs(c.da - c.db)).reverse().join("")) : Number(r.cols.map((c) => (c.da + c.db) % 10).reverse().join(""));
      return { kind: "fill", params: { op, a, b }, prompt: `用竖式计算：${r.expr} = （　）`, answer: String(r.result), steps: [r.sub ? "相同数位对齐，从个位减起，不够减向前一位借 1 当 10。" : "相同数位对齐，从个位加起，满十向前一位进 1。", `${r.expr} = ${r.result}`], traps: naive !== r.result ? { [String(naive)]: r.sub ? "不够减要向前一位借 1，不能用大数减小数。" : "别忘了加上进上来的 1。" } : {} };
    }
    case "column-mul": {
      const a = lv === 1 ? rng.int(12, 49) : lv === 2 ? rng.int(102, 499) : rng.int(12, 99), b = lv === 3 ? rng.int(12, 39) : rng.int(2, 9);
      const r = columnMul({ a, b });
      const trap = r.twoDigit ? r.p1 + r.p2 : r.rows.map((x) => (x.d * b) % 10).reverse().reduce((s, d) => s * 10 + d, 0);
      return { kind: "fill", params: { a, b }, prompt: `用竖式计算：${a} × ${b} = （　）`, answer: String(r.product), steps: r.twoDigit ? [`${a} × ${r.b1} = ${r.p1}`, `${a} × ${r.b2}0 = ${r.p2 * 10}`, `${r.p1} + ${r.p2 * 10} = ${r.product}`] : [`用 ${b} 乘 ${a} 的每一位，满几十进几：${r.product}`], traps: trap !== r.product ? { [String(trap)]: r.twoDigit ? "十位上的数乘得的积，末位要和十位对齐（表示几个十）。" : "乘得满几十要向前一位进几，再加上进上来的数。" } : {} };
    }
    case "long-div": {
      if (lv === 1) { const b = rng.int(2, 9), q = rng.int(11, Math.floor(99 / b)); const a = b * q; return { kind: "fill", params: { a, b, q: 1 }, prompt: `${a} ÷ ${b} = （　）`, answer: String(q), steps: [`从十位除起：${a} ÷ ${b} = ${q}`], traps: {} }; }
      if (lv === 2 || grade < 4) { const b = rng.int(2, 9), a = rng.int(100, 999); const r = longDiv({ a, b }); return { kind: "fill", params: { a, b, q: 2 }, prompt: `${a} ÷ ${b}，商是（　）${r.r ? "（余数不用写）" : ""}。`, answer: String(r.q), steps: [`${a} ÷ ${b} = ${r.text}`, "验算：商 × 除数 + 余数 = 被除数。"], traps: r.zeroInside ? { [String(r.q).replace(/0/g, "")]: "不够商 1 的那一位要商 0 占位。" } : {} }; }
      const b = rng.int(12, 49), a = rng.int(b * 3, 999); const r = longDiv({ a, b });
      return { kind: "fill", params: { a, b, q: 3 }, prompt: `${a} ÷ ${b}，余数是（　）。`, answer: String(r.r), steps: [`${a} ÷ ${b} = ${r.text}`, "余数一定比除数小。"], traps: {} };
    }
    case "mixed-ops": {
      if (lv === 3) {
        const form = rng.int(0, 2), p = normalizeParams("mixed-ops", { form, a: rng.int(10, 60), b: rng.int(2, 9), c: rng.int(2, 9) }), r = mixedOps(p);
        const wrongFirst = form === 0 ? `${p.b} + ${p.c}` : form === 1 ? `${p.a} + ${p.b}` : `${p.b} × ${p.c}`;
        return { kind: "choice", params: { ...p, q: 3 }, prompt: `计算 ${r.expr}，应该先算（　）。`, answer: r.first, choices: choices(r.first, [wrongFirst], rng), steps: [`${r.rule}。`], traps: { [wrongFirst]: r.rule + "。" } };
      }
      const form = lv === 1 ? pick(rng, [0, 2]) : pick(rng, [1, 3]);
      const p = normalizeParams("mixed-ops", { form, a: rng.int(10, 60), b: rng.int(2, 9), c: rng.int(2, 9) }), r = mixedOps(p);
      const wrong = form === 1 ? (p.a + p.b) * p.c : form === 0 ? p.a - (p.b + p.c) : null;
      return { kind: "fill", params: { ...p, q: 1 }, prompt: `计算：${r.expr} = （　）`, answer: String(r.result), steps: [`${r.rule}。`, `${r.expr} = ${r.line} = ${r.result}`], traps: wrong !== null && wrong !== r.result && wrong >= 0 ? { [String(wrong)]: r.rule + "。" } : {} };
    }
    case "bar-model": {
      if (lv === 1) { const a = rng.int(3, 15), b = rng.int(3, 15); return { kind: "fill", params: { mode: 1, a, b, k: 2, q: 1 }, prompt: `红花有 ${a} 朵，黄花有 ${b} 朵，一共有（　）朵。`, answer: String(a + b), steps: [`求总数用加法：${a} + ${b} = ${a + b}`], traps: { [String(Math.abs(a - b))]: "求一共有多少，要把两部分合起来，用加法。" } }; }
      if (lv === 2) { const a = rng.int(8, 20), b = rng.int(2, a - 1); return { kind: "fill", params: { mode: 0, a, b, k: 2, q: 2 }, prompt: `红花有 ${a} 朵，黄花有 ${b} 朵，红花比黄花多（　）朵。`, answer: String(a - b), steps: [`求多几用减法：${a} − ${b} = ${a - b}`], traps: { [String(a + b)]: "求一个数比另一个数多几，用减法。" } }; }
      const a = rng.int(2, 9), k = rng.int(2, 9), ask = rng.int(0, 1);
      return ask
        ? { kind: "fill", params: { mode: 2, a, b: 1, k, q: 3, ask }, prompt: `红花有 ${a} 朵，黄花有 ${a * k} 朵，黄花的朵数是红花的（　）倍。`, answer: String(k), steps: [`${a * k} ÷ ${a} = ${k}`], traps: { [String(a * k - a)]: "求几倍用除法，不是求相差多少。" } }
        : { kind: "fill", params: { mode: 2, a, b: 1, k, q: 3, ask }, prompt: `红花有 ${a} 朵，黄花的朵数是红花的 ${k} 倍，黄花有（　）朵。`, answer: String(a * k), steps: [`求 ${a} 的 ${k} 倍：${a} × ${k} = ${a * k}`], traps: { [String(a + k)]: "求一个数的几倍是多少，用乘法。" } };
    }
    case "units": {
      const kind = grade >= 4 ? rng.int(0, 3) : grade === 3 ? pick(rng, [0, 1, 3]) : pick(rng, [0, 1]);
      const pair = rng.int(0, UNIT_KINDS[kind].pairs.length - 1), v = rng.int(2, 9);
      const r = units({ kind, pair, v });
      const wrongRate = r.rate === 60 || r.rate === 24 ? 100 : r.rate === 10 ? 100 : 10;
      if (lv === 1) return { kind: "fill", params: { kind, pair, v, q: 1 }, prompt: `1 ${r.big} = （　）${r.small}`, answer: String(r.rate), steps: [`${r.big}和${r.small}之间的进率是 ${r.rate}。`], traps: { [String(wrongRate)]: `1 ${r.big} = ${r.rate} ${r.small}，记清进率。` } };
      if (lv === 2) return { kind: "fill", params: { kind, pair, v, q: 2 }, prompt: `${v} ${r.big} = （　）${r.small}`, answer: String(r.value), steps: [`大单位换小单位乘进率：${v} × ${r.rate} = ${r.value}`], traps: { [String(v * wrongRate)]: `${r.big}和${r.small}的进率是 ${r.rate}。` } };
      return { kind: "fill", params: { kind, pair, v, q: 3 }, prompt: `${r.value} ${r.small} = （　）${r.big}`, answer: String(v), steps: [`小单位换大单位除以进率：${r.value} ÷ ${r.rate} = ${v}`], traps: { [String(r.value * r.rate)]: "小单位换成大单位要除以进率。" } };
    }
    case "calendar": {
      if (lv === 1) { const month = pick(rng, [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); return { kind: "fill", params: { year: 2026, month, q: 1 }, prompt: `${month} 月有（　）天。`, answer: String(calendar({ year: 2026, month }).days), steps: ["1、3、5、7、8、10、12 月是大月，31 天；4、6、9、11 月是小月，30 天。"], traps: {} }; }
      const year = pick(rng, [1900, 2000, 2008, 2016, 2019, 2023, 2024, 2025, 2028, 2100]), r = calendar({ year, month: 2 });
      if (lv === 2) return { kind: "choice", params: { year, month: 2, q: 2 }, prompt: `${year} 年是平年还是闰年？`, answer: r.leap ? "闰年" : "平年", choices: ["平年", "闰年"], steps: [`${r.reason}，所以是${r.leap ? "闰年" : "平年"}。`], traps: year % 100 === 0 && !r.leap ? { "闰年": "整百年份要是 400 的倍数才是闰年。" } : {} };
      return { kind: "fill", params: { year, month: 2, q: 3 }, prompt: `${year} 年的 2 月有（　）天。`, answer: String(r.days), steps: [`${r.reason}，是${r.leap ? "闰年" : "平年"}，2 月有 ${r.days} 天。`], traps: {} };
    }
    case "views": {
      const shape = rng.int(0, VIEW_SHAPES.length - 1), r = views({ shape });
      const [dir, count] = lv === 1 ? ["正面", r.front.length] : lv === 2 ? ["上面", r.top.length] : ["左面", r.left.length];
      return { kind: "fill", params: { shape, q: lv }, prompt: `${VIEW_SHAPES[shape].desc}。从${dir}看，能看到（　）个正方形。`, answer: String(count), steps: [`从${dir}看，前后（或上下）重叠的小正方体只看到一个面。`, `看到 ${count} 个正方形。`], traps: count !== r.n ? { [String(r.n)]: "被挡住的小正方体看不到，重叠的只算一个。" } : {} };
    }
    case "position": {
      if (grade <= 2) { const i = rng.int(0, 2), [prompt, ans, wrong] = DIRECTION_LOW[i]; return { kind: "choice", params: { i, q: 1 }, prompt, answer: ans, choices: choices(ans, [...wrong], rng), steps: ["左和右相对，东和西相对，南和北相对。"], traps: {} }; }
      if (lv === 1 || lv === 3) {
        const x = rng.int(1, 7), y = rng.int(1, 6), n = lv === 3 ? rng.int(1, 3) : 0;
        const ans = `(${x + n},${y})`;
        return { kind: "choice", params: { x, y, n, q: lv }, prompt: lv === 1 ? `第 ${x} 列、第 ${y} 行，用数对表示是（　）。` : `点 A 的位置是 (${x},${y})，向右平移 ${n} 格后，用数对表示是（　）。`, answer: ans, choices: choices(ans, [`(${y},${x + n})`, `(${x},${y + n || y + 1})`, `(${x + n + 1},${y})`], rng), steps: lv === 1 ? ["先写列，再写行。"] : [`向右平移，列数加 ${n}，行数不变。`], traps: { [`(${y},${x + n})`]: "数对先写列、后写行。" } };
      }
      const dx = pick(rng, [-3, -2, -1, 1, 2, 3]), dy = pick(rng, [-3, -2, -1, 1, 2, 3]), ans = dirName(dx, dy);
      return { kind: "choice", params: { dx, dy, q: 2 }, prompt: `从学校向${dx > 0 ? "东" : "西"}走 ${Math.abs(dx)} 格，再向${dy > 0 ? "北" : "南"}走 ${Math.abs(dy)} 格到公园。公园在学校的什么方向？`, answer: ans, choices: choices(ans, ["东北", "西北", "东南", "西南"], rng), steps: [`向${dx > 0 ? "东" : "西"}又向${dy > 0 ? "北" : "南"}，在${ans}方向。`], traps: {} };
    }
    case "transform": {
      if (lv === 1) { const i = rng.int(0, 3); return { kind: "judge", params: { i, q: 1 }, prompt: `判断：${TRANSFORM_JUDGE[i][0]}`, answer: J(TRANSFORM_JUDGE[i][1]), choices: ["对", "错"], steps: ["平移沿直线移动，旋转绕一个点转动；形状和大小都不变。"], traps: {} }; }
      if (lv === 2) { const c = rng.int(1, 6), n = rng.int(2, 6); return { kind: "fill", params: { c, n, q: 2 }, prompt: `点 A 在第 ${c} 格，向右平移 ${n} 格后，在第（　）格。`, answer: String(c + n), steps: [`${c} + ${n} = ${c + n}`], traps: { [String(c + n + 1)]: "数的是移动了几格，不要把起点那一格也数进去。" } }; }
      const i = rng.int(0, 3);
      return { kind: "choice", params: { i, q: 3 }, prompt: `${SYMMETRY[i][0]}有几条对称轴？`, answer: SYMMETRY[i][1], choices: choices(SYMMETRY[i][1], ["1 条", "2 条", "3 条", "4 条", "无数条"].filter((x) => x !== SYMMETRY[i][1]).slice(0, 3), rng), steps: [`${SYMMETRY[i][0]}有 ${SYMMETRY[i][1]}对称轴。`], traps: {} };
    }
    case "triangle": {
      if (lv === 3) { const i = rng.int(0, 3); return { kind: "judge", params: { i, q: 3 }, prompt: `判断：${TRIANGLE_JUDGE[i][0]}`, answer: J(TRIANGLE_JUDGE[i][1]), choices: ["对", "错"], steps: ["三角形的内角和是 180°，和大小无关；最多有一个直角或钝角。"], traps: {} }; }
      const a = rng.int(2, 10) * 5, b = rng.int(2, Math.min(20, 32 - a / 5)) * 5, r = triangle({ a, b });
      if (lv === 1) return { kind: "fill", params: { a, b, q: 1 }, prompt: `三角形的两个角是 ${a}° 和 ${b}°，第三个角是（　）度。`, answer: String(r.c), steps: [`180 − ${a} − ${b} = ${r.c}`], traps: { [String(180 - a)]: "要减去已知的两个角。" } };
      return { kind: "choice", params: { a, b, q: 2 }, prompt: `三角形的两个角是 ${a}° 和 ${b}°，它是（　）。`, answer: r.kind, choices: ["锐角三角形", "直角三角形", "钝角三角形"], steps: [`第三个角是 ${r.c}°，最大的角是 ${r.max}°。`], traps: {} };
    }
    case "decimal": {
      const s = grade <= 3 ? 1 : 2, top = s === 1 ? 99 : 999;
      if (lv === 1) { const k = rng.int(1, 9); return { kind: "fill", params: { k, s: 1, q: 1 }, prompt: `${k} 个 0.1 是（　）。`, answer: fmtScaled(k, 1), steps: [`${k} 个十分之一是 ${fmtScaled(k, 1)}。`], traps: { [String(k)]: "0.1 是十分之一，几个 0.1 就是零点几。" } }; }
      let a = rng.int(11, top), b = rng.int(11, top);
      if (lv === 3 && b > a) [a, b] = [b, a];
      const op = lv === 3 ? 1 : 0, res = op ? a - b : a + b;
      const at = fmtScaled(a, s), bt = fmtScaled(b, s);
      return { kind: "fill", params: { a, b, s, op, q: 2 }, prompt: `${at} ${op ? "−" : "+"} ${bt} = （　）`, answer: fmtScaled(res, s), steps: ["小数点对齐，按整数加减的方法计算。", `${at} ${op ? "−" : "+"} ${bt} = ${fmtScaled(res, s)}`], traps: {} };
    }
    case "tally": {
      if (lv === 1) { const f = rng.int(1, 3), r = rng.int(0, 4); return { kind: "fill", params: { f, r, q: 1 }, prompt: `画了 ${f} 个“正”字${r ? `，还有一个“${["", "一", "丅", "下", "止"][r]}”（${r} 笔）` : ""}，表示（　）。`, answer: String(f * 5 + r), steps: [`一个“正”字是 5：${f} × 5${r ? ` + ${r}` : ""} = ${f * 5 + r}`], traps: { [String(f + r)]: "一个“正”字表示 5，不是 1。" } }; }
      const c = [rng.int(3, 15), rng.int(3, 15), rng.int(3, 15)];
      if (lv === 2) return { kind: "fill", params: { c0: c[0], c1: c[1], c2: c[2], q: 2 }, prompt: `一个月里晴天 ${c[0]} 天，阴天 ${c[1]} 天，雨天 ${c[2]} 天，一共记录了（　）天。`, answer: String(c[0] + c[1] + c[2]), steps: [`${c[0]} + ${c[1]} + ${c[2]} = ${c[0] + c[1] + c[2]}`], traps: {} };
      const [x, y] = c[0] >= c[2] ? [0, 2] : [2, 0];
      return { kind: "fill", params: { c0: c[0], c1: c[1], c2: c[2], x, y, q: 3 }, prompt: `晴天 ${c[0]} 天，阴天 ${c[1]} 天，雨天 ${c[2]} 天。${TALLY_NAMES[x]}比${TALLY_NAMES[y]}多（　）天。`, answer: String(c[x] - c[y]), steps: [`${c[x]} − ${c[y]} = ${c[x] - c[y]}`], traps: { [String(c[x] + c[y])]: "求多几天用减法。" } };
    }
    case "line-chart": {
      let v: number[] = [];
      do v = Array.from({ length: 5 }, () => rng.int(8, 30)); while (v.filter((x) => x === Math.max(...v)).length > 1);
      const data = v.map((x, i) => `${WEEKDAYS[i]} ${x} ℃`).join("，");
      if (lv === 1) { const r = lineChart({ v0: v[0], v1: v[1], v2: v[2], v3: v[3], v4: v[4] }); return { kind: "choice", params: { v0: v[0], v1: v[1], v2: v[2], v3: v[3], v4: v[4], q: 1 }, prompt: `一周气温：${data}。哪天最高？`, answer: r.maxDays[0], choices: [...WEEKDAYS], steps: [`最高的点是 ${r.max} ℃。`], traps: {} }; }
      if (lv === 2) { const i = rng.int(0, 3); return { kind: "fill", params: { v0: v[0], v1: v[1], v2: v[2], v3: v[3], v4: v[4], i, q: 2 }, prompt: `一周气温：${data}。${WEEKDAYS[i]}到${WEEKDAYS[i + 1]}气温变化了（　）℃。`, answer: String(Math.abs(v[i + 1] - v[i])), steps: [`${Math.max(v[i], v[i + 1])} − ${Math.min(v[i], v[i + 1])} = ${Math.abs(v[i + 1] - v[i])}`], traps: {} }; }
      return { kind: "choice", params: { q: 3 }, prompt: "要清楚地看出一周气温的升降变化，选用哪种统计图更合适？", answer: "折线统计图", choices: ["条形统计图", "折线统计图"], steps: ["折线统计图不但能看出数量多少，还能清楚地看出增减变化。"], traps: {} };
    }
    case "factors": {
      if (lv === 3) { const g = rng.int(2, 9), a = g * rng.int(1, 6), b = g * rng.int(2, 7); return { kind: "fill", params: { a, b, q: 3 }, prompt: `${a} 和 ${b} 的最大公因数是（　）。`, answer: String(gcd(a, b)), steps: [`${a} 和 ${b} 公有的因数中最大的是 ${gcd(a, b)}。`], traps: { [String(lcm(a, b))]: "最大公因数是两个数公有的因数中最大的，不是公倍数。" } }; }
      const n = rng.int(lv === 1 ? 6 : 11, lv === 1 ? 30 : 48), r = factors({ n });
      if (lv === 1) return { kind: "fill", params: { n, q: 1 }, prompt: `${n} 一共有（　）个因数。`, answer: String(r.list.length), steps: [`${n} 的因数：${r.list.join("、")}。`], traps: {} };
      return { kind: "choice", params: { n, q: 2 }, prompt: `${n} 是质数还是合数？`, answer: r.prime ? "质数" : "合数", choices: ["质数", "合数"], steps: [`${n} 的因数：${r.list.join("、")}，${r.prime ? "只有两个" : "不止两个"}。`], traps: {} };
    }
    case "cuboid": {
      const l = rng.int(2, 9), w = rng.int(2, 6), h = rng.int(2, 6), r = cuboid({ l, w, h });
      const [ask, ans, tip, trap] = lv === 1 ? ["棱长总和", r.edge, `(${l}+${w}+${h}) × 4 = ${r.edge}`, l + w + h] : lv === 2 ? ["表面积", r.area, `(${l}×${w}+${l}×${h}+${w}×${h}) × 2 = ${r.area}`, r.area / 2] : ["体积", r.volume, `${l} × ${w} × ${h} = ${r.volume}`, r.edge];
      return { kind: "fill", params: { l, w, h, q: lv }, prompt: `一个长方体长 ${l} 厘米、宽 ${w} 厘米、高 ${h} 厘米，它的${ask}是（　）${lv === 1 ? "厘米" : lv === 2 ? "平方厘米" : "立方厘米"}。`, answer: String(ans), steps: [tip], traps: trap !== ans ? { [String(trap)]: lv === 1 ? "棱长总和要乘 4。" : lv === 2 ? "6 个面，相对的面相同，要乘 2。" : "体积 = 长 × 宽 × 高。" } : {} };
    }
    case "fraction-add": {
      for (let t = 0; ; t++) {
        const d1 = rng.int(2, 10), d2 = lv === 1 ? d1 : rng.int(2, 10);
        if (lv > 1 && d1 === d2 && t < 50) continue;
        const n1 = rng.int(1, d1 - 1), n2 = rng.int(1, d2 - 1), op = lv === 3 ? 1 : 0;
        const p = normalizeParams("fraction-add", { op, n1, d1, n2, d2 }), r = fractionAdd(p);
        if ((r.rn <= 0 || r.rn > r.l) && t < 50) continue;
        return { kind: "fill", params: { ...p, q: lv }, prompt: `${p.n1}/${p.d1} ${r.sign} ${p.n2}/${p.d2} = （　）（结果写成最简分数）`, answer: r.result, steps: r.same ? [`分母不变，分子${p.op ? "相减" : "相加"}：${r.rn}/${r.l}`, `= ${r.result}`] : [`通分：${r.m1}/${r.l} ${r.sign} ${r.m2}/${r.l} = ${r.rn}/${r.l}`, `= ${r.result}`], traps: { [`${p.op ? Math.abs(p.n1 - p.n2) : p.n1 + p.n2}/${p.op ? Math.abs(p.d1 - p.d2) || p.d1 : p.d1 + p.d2}`]: "分母不能相加减；先通分，再把分子相加减。" } };
      }
    }
    case "fraction-div": {
      if (lv === 1) { const d = rng.int(2, 9), n = pick(rng, Array.from({ length: d - 1 }, (_, i) => i + 1).filter((x) => gcd(x, d) === 1)); return { kind: "fill", params: { n, d, q: 1 }, prompt: `${n}/${d} 的倒数是（　）。`, answer: fracText(d, n), steps: ["分子、分母交换位置。"], traps: {} }; }
      const mode = lv === 2 ? 0 : 2;
      const p = normalizeParams("fraction-div", { mode, n1: rng.int(1, 8), d1: rng.int(2, 9), k: rng.int(2, 6), n2: rng.int(1, 8), d2: rng.int(2, 9) }), r = fractionDiv(p);
      return { kind: "fill", params: { ...p, q: lv }, prompt: `${r.expr} = （　）（结果写成最简分数或整数）`, answer: r.result, steps: [`除以一个数等于乘它的倒数：${r.mul} = ${r.result}`], traps: {} };
    }
    case "combos": {
      if (lv === 1) { const a = rng.int(2, 5), b = rng.int(2, 4); return { kind: "fill", params: { mode: 0, a, b, q: 1 }, prompt: `有 ${a} 件上衣、${b} 条裤子，一件上衣配一条裤子，一共有（　）种穿法。`, answer: String(a * b), steps: [`${a} × ${b} = ${a * b}`], traps: { [String(a + b)]: "每件上衣都可以配每一条裤子，用乘法。" } }; }
      if (lv === 2) { const a = rng.int(3, 4), ds = Array.from({ length: a }, (_, i) => i + 1).join("、"); return { kind: "fill", params: { mode: 1, a, q: 2 }, prompt: `用 ${ds} 组成十位和个位不同的两位数，一共能组成（　）个。`, answer: String(a * (a - 1)), steps: [`十位有 ${a} 种，个位有 ${a - 1} 种：${a} × ${a - 1} = ${a * (a - 1)}`], traps: { [String((a * (a - 1)) / 2)]: "12 和 21 是不同的两位数，都要算。" } }; }
      const a = rng.int(3, 6);
      return { kind: "fill", params: { mode: 2, a, q: 3 }, prompt: `${a} 个小朋友，每两人握一次手，一共要握（　）次。`, answer: String((a * (a - 1)) / 2), steps: [`${a} × ${a - 1} ÷ 2 = ${(a * (a - 1)) / 2}`], traps: { [String(a * (a - 1))]: "甲和乙握手，与乙和甲握手是同一次，要除以 2。" } };
    }
    case "chicken-rabbit": {
      const heads = lv === 1 ? rng.int(4, 8) : lv === 2 ? rng.int(8, 15) : rng.int(15, 35), rabbits = rng.int(1, heads - 1), r = chickenRabbit({ heads, rabbits });
      const askR = lv !== 2;
      return { kind: "fill", params: { heads, legs: r.legs, ask: askR ? 1 : 0 }, prompt: `鸡和兔共 ${heads} 只，有 ${r.legs} 只脚。${askR ? "兔" : "鸡"}有（　）只。`, answer: String(askR ? rabbits : r.chickens), steps: [`假设全是鸡：${heads} × 2 = ${r.allChicken}`, `兔：(${r.legs} − ${r.allChicken}) ÷ 2 = ${rabbits}`, `鸡：${heads} − ${rabbits} = ${r.chickens}`], traps: { [String(askR ? r.chickens : rabbits)]: askR ? "求的是兔：多出来的脚 ÷ 2 得到的是兔的只数。" : "假设全是鸡时，算出来的是兔，鸡还要用总数减去兔。" } };
    }
    case "tree-plant": {
      const ends = lv === 1 ? 0 : lv === 2 ? pick(rng, [1, 2]) : 3, gap = rng.int(2, 10), seg = rng.int(3, 10), r = treePlant({ ends, len: seg * gap, gap });
      return { kind: "fill", params: { ends, len: seg * gap, gap }, prompt: ends === 3 ? `圆形花坛周长 ${seg * gap} 米，沿边每隔 ${gap} 米种一棵树，一共种（　）棵。` : `在 ${seg * gap} 米长的小路一边，每隔 ${gap} 米种一棵树，${ENDS[ends]}，一共种（　）棵。`, answer: String(r.trees), steps: [`间隔数：${seg * gap} ÷ ${gap} = ${seg}`, r.rule], traps: ends === 0 ? { [String(seg)]: "两端都种，棵数比间隔数多 1。" } : ends === 2 ? { [String(seg)]: "两端都不种，棵数比间隔数少 1。" } : ends === 3 ? { [String(seg + 1)]: "围成一圈，首尾重合，棵数 = 间隔数。" } : {} };
    }
    case "odd-one": {
      const n = lv === 1 ? rng.int(2, 3) : lv === 2 ? rng.int(4, 9) : rng.int(10, 27), r = oddOne({ n });
      return { kind: "fill", params: { n }, prompt: `${n} 个零件中有 1 个次品（略轻），用天平最少称（　）次能保证找出次品。`, answer: String(r.k), steps: [`平均分成 3 份：${r.groups.join("、")}。`, `最少 ${r.k} 次。`], traps: {} };
    }
    case "venn": {
      const both = rng.int(1, 6), a = both + rng.int(1, 10), b = both + rng.int(1, 10), total = a + b - both;
      if (lv === 1) return { kind: "fill", params: { a, b, both, q: 1 }, prompt: `参加跳绳的有 ${a} 人，其中 ${both} 人也参加了踢毽。只参加跳绳的有（　）人。`, answer: String(a - both), steps: [`${a} − ${both} = ${a - both}`], traps: {} };
      if (lv === 2) return { kind: "fill", params: { a, b, both, q: 2 }, prompt: `参加跳绳的有 ${a} 人，参加踢毽的有 ${b} 人，两项都参加的有 ${both} 人。一共有（　）人。`, answer: String(total), steps: [`${a} + ${b} − ${both} = ${total}`], traps: { [String(a + b)]: "两项都参加的人被数了两次，要减去一次。" } };
      return { kind: "fill", params: { a, b, total, q: 3 }, prompt: `参加跳绳的有 ${a} 人，参加踢毽的有 ${b} 人，参加活动的一共 ${total} 人。两项都参加的有（　）人。`, answer: String(both), steps: [`${a} + ${b} − ${total} = ${both}`], traps: {} };
    }
    case "id-code": {
      if (lv === 1) { const i = rng.int(0, 1), ask = [["第 7 到 14 位", "出生日期"], ["前 6 位", "地址"]][i]; return { kind: "choice", params: { i, q: 1 }, prompt: `身份证号码的${ask[0]}表示什么？`, answer: ask[1], choices: [...ID_PARTS], steps: ["前 6 位地址码，7—14 位出生日期码，15—17 位顺序码，最后一位校验码。"], traps: {} }; }
      if (lv === 2) { const g = rng.int(0, 9); return { kind: "choice", params: { g, q: 2 }, prompt: `某人身份证号码的第 17 位是 ${g}，这个人是（　）。`, answer: g % 2 ? "男性" : "女性", choices: ["男性", "女性"], steps: ["第 17 位单数表示男性，双数表示女性（0 也是双数）。"], traps: {} }; }
      const year = pick(rng, [2008, 2012, 2014, 2016, 2018, 2019, 2020]), leap = calendar({ year, month: 2 }).leap;
      return { kind: "judge", params: { year, q: 3 }, prompt: `判断：出生日期码可以是“${year}0229”。`, answer: J(leap), choices: ["对", "错"], steps: [`${year} 年是${leap ? "闰年，2 月有 29 日" : "平年，2 月只有 28 天"}。`], traps: {} };
    }
    case "square-numbers": {
      if (lv === 3) { const n = rng.int(2, 6), d = 2 ** n; return { kind: "fill", params: { mode: 1, n, q: 3 }, prompt: `${Array.from({ length: n }, (_, i) => `1/${2 ** (i + 1)}`).join(" + ")} = （　）`, answer: fracText(d - 1, d), steps: [`1 − 1/${d} = ${d - 1}/${d}`], traps: {} }; }
      const n = lv === 1 ? rng.int(3, 6) : rng.int(7, 12);
      return { kind: "fill", params: { mode: 0, n, q: lv }, prompt: `1 + 3 + 5 + … + ${2 * n - 1} = （　）`, answer: String(n * n), steps: [`一共 ${n} 个连续奇数，和是 ${n} × ${n} = ${n * n}`], traps: { [String(2 * n - 1)]: `从 1 到 ${2 * n - 1} 一共有 ${n} 个奇数，和是 ${n} × ${n}。` } };
    }
    case "optimize": {
      const cakes = lv === 1 ? 2 : lv === 2 ? 3 : rng.int(4, 9), r = optimize({ cakes });
      return { kind: "fill", params: { cakes }, prompt: `一口锅每次最多烙 2 张饼，每面烙 3 分钟。烙 ${cakes} 张饼，最少需要（　）分钟。`, answer: String(r.time), steps: [`${cakes} 张饼共 ${r.sides} 个面，每次烙 2 个面，要 ${r.rounds} 次：${r.rounds} × 3 = ${r.time}`], traps: cakes % 2 ? { [String((cakes + 1) * 3)]: "让锅每次都放满 2 个面，可以少烙一次。" } : {} };
    }
    case "pattern": {
      if (lv === 3) { const step = rng.int(1, 5), r = pattern({ kind: 2, step }); return { kind: "fill", params: { kind: 2, step, q: 3 }, prompt: `找规律填数：${r.seq.join("、")}、（　）`, answer: r.next, steps: [`每次加 ${step}。`], traps: {} }; }
      const kind = lv === 1 ? 0 : 1, r = pattern({ kind, step: 1 });
      return { kind: "choice", params: { kind, step: 1, q: lv }, prompt: `找规律：${r.seq.join("、")}、（　）`, answer: r.next, choices: [...new Set(PATTERN_KINDS[kind].group)], steps: [`一组是“${r.group}”，重复出现。`], traps: {} };
    }
    case "logic": {
      const puzzle = rng.int(0, 2), who = rng.int(0, 2), z = PUZZLES[puzzle];
      return { kind: "choice", params: { puzzle, who }, prompt: `小明、小红、小军各拿了${z.items.join("、")}中的一样。${z.clues.join("")}${PEOPLE[who]}拿的是（　）。`, answer: z.items[z.answer[who]], choices: [...z.items], steps: ["先用最确定的线索，再排除。", logic({ puzzle }).pairs.join("，")], traps: {} };
    }
  }
}

export function plusPractice(demo: PlusId, grade: Grade, lv: number, rng: Rng, base: Base): PracticeQ {
  return { ...base, ...build(demo, grade, lv, rng) } as PracticeQ;
}

/** 独立重算随堂练习的答案（只用题目里保存的参数）。 */
export function plusVerify(q: PracticeQ): string {
  const p = q.params;
  switch (q.demo as PlusId) {
    case "sticks": return p.q === 1 ? String(p.tens * 10 + p.ones) : p.q === 2 ? String(p.tens) : String(Math.max(p.a, p.b));
    case "abacus": return p.q === 1 ? readNum(p.n) : p.q === 2 ? String(Math.floor(p.n / 10 ** p.place) % 10) : String(p.n);
    case "column-add": return String(p.op ? p.a - p.b : p.a + p.b);
    case "column-mul": return String(p.a * p.b);
    case "long-div": return p.q === 3 ? String(p.a % p.b) : String(Math.floor(p.a / p.b));
    case "mixed-ops": { const [a, b, c] = [p.a, p.b, p.c]; if (p.q === 3) return [`${a} − ${b}`, `${b} × ${c}`, `${a} + ${b}`, `${a} − ${b}`][p.form]; return String([a - b + c, a + b * c, (a + b) * c, (a - b) / c][p.form]); }
    case "bar-model": return p.mode === 1 ? String(p.a + p.b) : p.mode === 0 ? String(p.a - p.b) : p.ask ? String(p.k) : String(p.a * p.k);
    case "units": { const rate = UNIT_KINDS[p.kind].pairs[p.pair][2] as number; return String(p.q === 1 ? rate : p.q === 2 ? p.v * rate : p.v); }
    case "calendar": { const leap = (p.year % 4 === 0 && p.year % 100 !== 0) || p.year % 400 === 0; return p.q === 2 ? (leap ? "闰年" : "平年") : String(p.month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(p.month) ? 30 : 31); }
    case "views": { const cubes = VIEW_SHAPES[p.shape].cubes; const proj = p.q === 1 ? cubes.map(([x, , z]) => `${x},${z}`) : p.q === 2 ? cubes.map(([x, y]) => `${x},${y}`) : cubes.map(([, y, z]) => `${y},${z}`); return String(new Set(proj).size); }
    case "position": if ("i" in p) return DIRECTION_LOW[p.i][1]; if (p.q === 2) return (p.dx > 0 ? "东" : "西") + (p.dy > 0 ? "北" : "南"); return `(${p.x + p.n},${p.y})`;
    case "transform": return p.q === 1 ? J(TRANSFORM_JUDGE[p.i][1]) : p.q === 2 ? String(p.c + p.n) : SYMMETRY[p.i][1];
    case "triangle": { if (p.q === 3) return J(TRIANGLE_JUDGE[p.i][1]); const c = 180 - p.a - p.b, m = Math.max(p.a, p.b, c); return p.q === 1 ? String(c) : m === 90 ? "直角三角形" : m > 90 ? "钝角三角形" : "锐角三角形"; }
    case "decimal": return p.q === 1 ? fmtScaled(p.k, 1) : fmtScaled(p.op ? p.a - p.b : p.a + p.b, p.s);
    case "tally": return p.q === 1 ? String(p.f * 5 + p.r) : p.q === 2 ? String(p.c0 + p.c1 + p.c2) : String([p.c0, p.c1, p.c2][p.x] - [p.c0, p.c1, p.c2][p.y]);
    case "line-chart": { if (p.q === 3) return "折线统计图"; const v = [p.v0, p.v1, p.v2, p.v3, p.v4]; return p.q === 1 ? WEEKDAYS[v.indexOf(Math.max(...v))] : String(Math.abs(v[p.i + 1] - v[p.i])); }
    case "factors": { if (p.q === 3) return String(gcd(p.a, p.b)); let c = 0; for (let i = 1; i <= p.n; i++) if (p.n % i === 0) c++; return p.q === 1 ? String(c) : c === 2 ? "质数" : "合数"; }
    case "cuboid": return String(p.q === 1 ? 4 * (p.l + p.w + p.h) : p.q === 2 ? 2 * (p.l * p.w + p.l * p.h + p.w * p.h) : p.l * p.w * p.h);
    case "fraction-add": { const d = p.d1 * p.d2, n = p.op ? p.n1 * p.d2 - p.n2 * p.d1 : p.n1 * p.d2 + p.n2 * p.d1; return fracText(n, d); }
    case "fraction-div": { if (p.q === 1) return fracText(p.d, p.n); const [an, ad] = p.mode === 1 ? [p.k, 1] : [p.n1, p.d1], [bn, bd] = p.mode === 0 ? [p.k, 1] : [p.n2, p.d2]; return fracText(an * bd, ad * bn); }
    case "combos": return String(p.mode === 0 ? p.a * p.b : p.mode === 1 ? p.a * (p.a - 1) : (p.a * (p.a - 1)) / 2);
    case "chicken-rabbit": { const r = (p.legs - 2 * p.heads) / 2; return String(p.ask ? r : p.heads - r); }
    case "tree-plant": { const s = p.len / p.gap; return String([s + 1, s, s - 1, s][p.ends]); }
    case "odd-one": { let k = 0, m = 1; while (m < p.n) { m *= 3; k++; } return String(k); }
    case "venn": return String(p.q === 1 ? p.a - p.both : p.q === 2 ? p.a + p.b - p.both : p.a + p.b - p.total);
    case "id-code": return p.q === 1 ? ["出生日期", "地址"][p.i] : p.q === 2 ? (p.g % 2 ? "男性" : "女性") : J((p.year % 4 === 0 && p.year % 100 !== 0) || p.year % 400 === 0);
    case "square-numbers": return p.mode === 0 ? String(p.n * p.n) : fracText(2 ** p.n - 1, 2 ** p.n);
    case "optimize": return String(p.cakes === 1 ? 6 : p.cakes * 3);
    case "pattern": return p.kind === 2 ? String(2 + 5 * p.step) : PATTERN_KINDS[p.kind].group[6 % PATTERN_KINDS[p.kind].group.length];
    case "logic": return PUZZLES[p.puzzle].items[PUZZLES[p.puzzle].answer[p.who]];
  }
}

export const PLUS_LIFE: Record<PlusId, string> = {
  sticks: "买鸡蛋时 10 个装一盒，3 盒零 4 个就是 34 个。",
  abacus: "我国人口约十四亿，写作 1400000000。",
  "column-add": "买一个 35 元的书包和一个 27 元的文具盒，一共 62 元。",
  "column-mul": "每箱 24 瓶牛奶，买 12 箱，一共 288 瓶。",
  "long-div": "156 个苹果平均装进 4 个筐，每筐 39 个。",
  "mixed-ops": "买 3 支 4 元的笔和一本 6 元的本子：6 + 3 × 4 = 18（元）。",
  "bar-model": "哥哥有 12 张卡片，弟弟有 7 张，画线段图一眼看出哥哥多 5 张。",
  units: "从家到学校 1 千米，就是 1000 米。",
  calendar: "2028 年 2 月有 29 天，因为 2028 年是闰年。",
  views: "从正面、侧面和上面给玩具拍照，三张照片不一样。",
  position: "电影票上写着 5 排 8 座，就是用两个数确定位置。",
  transform: "推拉窗是平移，旋转门是旋转，蝴蝶的翅膀是轴对称。",
  triangle: "三角尺上三个角的和也是 180°。",
  decimal: "一支铅笔 1.5 元，就是 1 元 5 角。",
  tally: "班级选班长唱票时，用画“正”字的方法记票数。",
  "line-chart": "医院用折线图记录病人的体温变化。",
  factors: "24 个同学排队，每排人数一样多，可以排 1、2、3、4、6、8、12、24 人一排。",
  cuboid: "粉刷房间的四壁和屋顶，算的是表面积的一部分。",
  "fraction-add": "一块饼，哥哥吃了 1/2，弟弟吃了 1/3，一共吃了 5/6。",
  "fraction-div": "3/4 千克糖平均分给 3 个人，每人 1/4 千克。",
  combos: "3 种主食配 2 种汤，一共有 6 种午餐搭配。",
  "chicken-rabbit": "《孙子算经》里就有：今有雉兔同笼，上有三十五头，下有九十四足。",
  "tree-plant": "马路一边每隔 10 米装一盏路灯，两头都装，就是植树问题。",
  "odd-one": "工厂用天平找出重量不合格的零件。",
  venn: "既参加合唱又参加画画的同学，在统计总人数时只能算一次。",
  "id-code": "邮政编码、车牌号、学号，都是有规律的编码。",
  "square-numbers": "1 + 3 = 4，1 + 3 + 5 = 9，正好是正方形的点阵。",
  optimize: "沏茶时一边烧水一边洗茶杯，节省时间。",
  pattern: "红绿灯按“红、绿、黄”的顺序重复亮。",
  logic: "猜谜游戏里，根据提示一步步排除，就能找到答案。",
};
