import type { Grade } from "../math/types.ts";
import type { Rng } from "../math/rng.ts";
import { addSub, angleKind, balance, circle, cylinder, decimalMul, fraction, groupShare, law, magnet, pendulum, perimeterArea, shadow, circuit, type DemoId, type Params, normalizeParams } from "./demos.ts";

/**
 * 随堂练习：题目由参数生成，答案由同一套计算函数得出，
 * 并保存生成参数，verifyPractice 会独立重算一遍核对。
 */
export type PracticeKind = "choice" | "fill" | "judge";

export type PracticeQ = {
  id: string;
  demo: DemoId;
  level: number;
  kind: PracticeKind;
  prompt: string;
  answer: string;
  choices?: string[];
  /** 分步解析 */
  steps: string[];
  /** 常见错误答案 → 针对性提示 */
  traps: Record<string, string>;
  params: Params;
};

const J = (b: boolean) => (b ? "对" : "错");

function uniq(xs: string[]): string[] { return [...new Set(xs)]; }

function choices(answer: string, wrong: string[], rng: Rng): string[] {
  const list = uniq([answer, ...wrong.filter((w) => w !== answer)]).slice(0, 4);
  return rng.shuffle(list);
}

/** level：1 简单、2 标准、3 提高 */
export function makePractice(demo: DemoId, grade: Grade, level: number, rng: Rng, n = 0): PracticeQ {
  const lv = Math.max(1, Math.min(3, Math.round(level)));
  const id = `${demo}-${lv}-${n}-${rng.int(0, 1e6)}`;
  const base = { id, demo, level: lv, traps: {} as Record<string, string> };
  switch (demo) {
    case "add-sub": {
      const max = lv === 1 ? 5 : lv === 2 ? 10 : 20;
      const op = rng.int(0, 1);
      let a = rng.int(1, max), b = rng.int(0, Math.min(10, max));
      if (op === 0 && a + b > 20) b = 20 - a;
      if (op === 1 && b > a) [a, b] = [b, a];
      const p = normalizeParams(demo, { op, a: Math.min(a, 10), b: Math.min(b, 10) });
      const r = addSub(p);
      return { ...base, kind: "fill", params: p, prompt: p.op === 0 ? `${p.a} 个苹果和 ${p.b} 个苹果，合起来是几个？` : `有 ${p.a} 个苹果，拿走 ${p.b} 个，还剩几个？`, answer: String(r.result),
        steps: [p.op === 0 ? "合起来用加法。" : "拿走用减法。", r.expr], traps: { [String(p.op === 0 ? p.a - p.b : p.a + p.b)]: p.op === 0 ? "题目说“合起来”，要用加法哦。" : "题目说“拿走”，要用减法哦。", [String(r.result + 1)]: "再一个一个数一遍，别多数了。", [String(r.result - 1)]: "再一个一个数一遍，别漏数了。" } };
    }
    case "group-share": {
      const mode = lv === 1 ? 0 : rng.int(0, 1);
      if (mode === 0) {
        const p = normalizeParams(demo, { mode, groups: rng.int(2, 9), each: rng.int(2, 9) });
        const r = groupShare(p);
        return { ...base, kind: "fill", params: p, prompt: `${p.groups} 盘草莓，每盘 ${p.each} 个，一共几个？`, answer: String(r.product), steps: [`${p.groups} 个 ${p.each} 相加。`, r.expr], traps: { [String(p.groups + p.each)]: "这里是几个几，要用乘法，不是加法。" } };
      }
      const groups = rng.int(2, 9), q = rng.int(2, 9), rem = lv === 3 ? rng.int(0, groups - 1) : 0;
      const p = normalizeParams(demo, { mode, groups, total: Math.min(40, groups * q + rem) });
      const r = groupShare(p) as { quotient: number; remainder: number; expr: string };
      const ans = r.remainder ? `${r.quotient}……${r.remainder}` : String(r.quotient);
      return { ...base, kind: r.remainder ? "choice" : "fill", params: p, prompt: `${p.total} 块饼干平均分给 ${p.groups} 人，每人几块${r.remainder ? "，还剩几块" : ""}？`, answer: ans,
        choices: r.remainder ? choices(ans, [`${r.quotient + 1}……${r.remainder}`, `${r.quotient}……${r.remainder + p.groups}`, String(r.quotient)], rng) : undefined,
        steps: ["平均分用除法。", r.expr], traps: { [`${r.quotient}……${r.remainder + p.groups}`]: "余数必须比除数小，还能再分一次。" } };
    }
    case "fraction": {
      const parts = rng.int(lv === 1 ? 2 : 3, lv === 3 ? 12 : 8), shaded = rng.int(1, parts - 1);
      const p = normalizeParams(demo, { parts, shaded });
      const r = fraction(p);
      if (lv === 3) {
        const other = rng.int(2, 12);
        const correct = parts < other;
        return { ...base, kind: "judge", params: { ...p, other }, prompt: `判断：1/${parts} 比 1/${other} 大。`, answer: J(correct), choices: ["对", "错"], steps: ["同样大的整体，平均分的份数越多，每份越小。", `${parts} ${parts < other ? "<" : parts > other ? ">" : "="} ${other}，所以 1/${parts} ${parts < other ? ">" : parts > other ? "<" : "="} 1/${other}。`], traps: {} };
      }
      return { ...base, kind: "choice", params: p, prompt: `把一个长条平均分成 ${parts} 份，涂色 ${shaded} 份，涂色部分用分数表示是？`, answer: r.text,
        choices: choices(r.text, [`${parts}/${shaded}`, `${shaded}/${parts - shaded}`, `1/${parts}`], rng), steps: [`平均分成 ${parts} 份，分母是 ${parts}。`, `涂了 ${shaded} 份，分子是 ${shaded}。`], traps: { [`${parts}/${shaded}`]: "分母写平均分的份数，分子写取的份数，别写反了。", [`${shaded}/${parts - shaded}`]: "分母是一共平均分的份数，不是没涂的份数。" } };
    }
    case "perimeter-area": {
      const p = normalizeParams(demo, { l: rng.int(2, lv === 1 ? 6 : 12), w: rng.int(1, lv === 1 ? 4 : 8) });
      const r = perimeterArea(p);
      const askArea = lv >= 2 && rng.chance(0.5);
      return { ...base, kind: "fill", params: { ...p, askArea: askArea ? 1 : 0 }, prompt: `长方形长 ${p.l} 厘米、宽 ${p.w} 厘米，它的${askArea ? "面积是多少平方厘米" : "周长是多少厘米"}？`, answer: String(askArea ? r.area : r.perimeter),
        steps: askArea ? ["面积 = 长 × 宽", `${p.l}×${p.w} = ${r.area}`] : ["周长 = (长 + 宽) × 2", `(${p.l}+${p.w})×2 = ${r.perimeter}`], traps: askArea ? { [String(r.perimeter)]: "这是周长。面积是铺满的方格数，用长乘宽。" } : { [String(p.l + p.w)]: "只算了一条长和一条宽，还要乘 2。", [String(r.area)]: "这是面积。周长是一圈的长度。" } };
    }
    case "angle": {
      const deg = lv === 1 ? rng.pick([30, 45, 60, 90, 120, 150]) : rng.int(5, 175);
      const k = angleKind(deg);
      if (lv === 3) {
        const shown = 180 - deg;
        return { ...base, kind: "choice", params: { deg }, prompt: `小明用量角器量角，内圈读数是 ${deg}°，外圈读数是 ${shown}°。角的一条边对着内圈的 0°，这个角是多少度？`, answer: `${deg}°`, choices: choices(`${deg}°`, [`${shown}°`, "90°", "180°"], rng), steps: ["看和角的一条边重合的 0° 在哪一圈。", `0° 在内圈，就读内圈：${deg}°。`], traps: { [`${shown}°`]: "读错圈了：要读和 0° 同一圈的刻度。" } };
      }
      return { ...base, kind: "choice", params: { deg }, prompt: `${deg}° 的角是什么角？`, answer: k, choices: choices(k, ["锐角", "直角", "钝角", "平角"], rng), steps: ["锐角 < 90°，直角 = 90°，90° < 钝角 < 180°。", `${deg}° 是${k}。`], traps: {} };
    }
    case "law": {
      const p = normalizeParams(demo, { a: rng.int(2, 9), b: rng.int(1, 9), c: rng.int(1, 9) });
      const r = law(p);
      if (lv === 1) return { ...base, kind: "fill", params: p, prompt: `${p.a}×(${p.b}+${p.c}) = ${p.a}×${p.b} + ${p.a}×□，□ 里填几？`, answer: String(p.c), steps: ["乘法分配律：a×(b+c) = a×b + a×c。", `□ = ${p.c}`], traps: { [String(p.a)]: `括号里的两个数都要和 ${p.a} 相乘。` } };
      return { ...base, kind: "fill", params: p, prompt: `用简便方法计算：${p.a}×${p.b} + ${p.a}×${p.c}`, answer: String(r.right), steps: [`= ${p.a}×(${p.b}+${p.c})`, `= ${p.a}×${p.b + p.c}`, `= ${r.right}`], traps: { [String(p.a * p.b + p.c)]: `${p.c} 也要乘 ${p.a}。` } };
    }
    case "decimal-mul": {
      const a = rng.int(lv === 1 ? 2 : 11, lv === 1 ? 9 : 99), b = rng.int(2, lv === 3 ? 99 : 9);
      const p = normalizeParams(demo, { a, b });
      const r = decimalMul(p);
      const wrongShift = String(r.intProduct / 10);
      return { ...base, kind: "fill", params: p, prompt: `${r.aText} × ${r.bText} = ?`, answer: r.product, steps: [`按整数算：${p.a}×${p.b} = ${r.intProduct}`, "两个因数一共有两位小数，积也有两位小数。", `${r.aText}×${r.bText} = ${r.product}`], traps: { [wrongShift]: "小数位数数少了：两个因数一共有 2 位小数。", [String(r.intProduct)]: "还没点小数点哦。" } };
    }
    case "balance": {
      const p = normalizeParams(demo, { a: rng.int(lv === 1 ? 1 : 2, lv === 3 ? 6 : 4), b: rng.int(1, lv === 1 ? 9 : 20), x: rng.int(1, 12) });
      const r = balance(p);
      return { ...base, kind: "fill", params: p, prompt: `解方程：${r.eq}，x = ?`, answer: String(r.x), steps: [`两边同时减 ${p.b}：${p.a === 1 ? "" : p.a}x = ${r.afterSub}`, ...(p.a > 1 ? [`两边同时除以 ${p.a}：x = ${r.x}`] : []), "代入检验。"], traps: { [String(r.c + p.b)]: `等号左边是加 ${p.b}，两边要同时减 ${p.b}。`, [String(r.afterSub)]: `还要两边同时除以 ${p.a}。` } };
    }
    case "circle": {
      const p = normalizeParams(demo, { r: rng.int(1, 10), n: 8 });
      const r = circle(p);
      const askArea = lv >= 2 && rng.chance(0.5);
      const wrong = askArea ? fmt2(628 * p.r) : fmt2(314 * p.r * p.r);
      return { ...base, kind: "fill", params: { ...p, askArea: askArea ? 1 : 0 }, prompt: `圆的半径是 ${p.r} 厘米，${askArea ? "面积是多少平方厘米" : "周长是多少厘米"}？（π 取 3.14）`, answer: askArea ? r.area : r.perimeter,
        steps: askArea ? ["S = πr²", `3.14×${p.r}×${p.r} = ${r.area}`] : ["C = 2πr", `2×3.14×${p.r} = ${r.perimeter}`], traps: { [wrong]: askArea ? "这是周长的算法，面积要用 πr²。" : "这是面积的算法，周长用 2πr。", [askArea ? fmt2(628 * p.r * p.r) : fmt2(314 * p.r)]: askArea ? "r² 是 r×r，不是 2×r。" : "直径是半径的 2 倍，别漏了 2。" } };
    }
    case "cylinder": {
      const p = normalizeParams(demo, { r: rng.int(1, 5), h: rng.int(2, 10) });
      const r = cylinder(p);
      if (lv === 3) return { ...base, kind: "judge", params: p, prompt: "判断：圆锥的体积一定是圆柱体积的 1/3。", answer: "错", choices: ["对", "错"], steps: ["必须是等底等高的圆柱和圆锥，才有这个关系。"], traps: { "对": "少了条件：要“等底等高”。" } };
      return { ...base, kind: "fill", params: p, prompt: `圆柱底面半径 ${p.r} 厘米，高 ${p.h} 厘米，体积是多少立方厘米？（π 取 3.14）`, answer: r.volume, steps: ["V = 底面积 × 高", `底面积 = 3.14×${p.r}×${p.r} = ${r.base}`, `${r.base}×${p.h} = ${r.volume}`], traps: { [r.side]: "这是侧面积。体积要用底面积乘高。" } };
    }
    case "magnet": {
      const it = rng.pick(magnet({ dist: 1, power: 3 }).items);
      return { ...base, kind: "judge", params: {}, prompt: `判断：磁铁能吸住${it.name}。`, answer: J(it.iron), choices: ["对", "错"], steps: [it.iron ? `${it.name}是铁做的，磁铁能吸住。` : `${it.name}不是铁做的，磁铁吸不住。`], traps: {} };
    }
    case "shadow": {
      const a = rng.int(20, 50), b = a + rng.int(10, 30);
      return { ...base, kind: "choice", params: { a, b }, prompt: `太阳高度从 ${a}° 升到 ${b}°，木棍的影子会怎样？`, answer: "变短", choices: choices("变短", ["变长", "不变", "消失"], rng), steps: ["太阳越高，影子越短。", `影长约从 ${shadow({ sun: a, h: 50 }).length} 厘米变为 ${shadow({ sun: b, h: 50 }).length} 厘米（木棍 50 厘米）。`], traps: { "变长": "反了：太阳升高，影子变短。" } };
    }
    case "circuit": {
      const parallel = rng.int(0, 1);
      const bulbs = 3;
      const r = circuit({ bulbs, parallel, closed: 1, broken: 2 });
      const lit = r.bulbs.filter((b) => b.lit).length;
      return { ...base, kind: "choice", params: { parallel }, prompt: `3 个灯泡${parallel ? "并联" : "串联"}，开关闭合，第 2 个灯泡坏了，还有几个灯泡亮？`, answer: `${lit} 个`, choices: choices(`${lit} 个`, ["0 个", "2 个", "3 个"], rng), steps: [parallel ? "并联各走各的路，坏一个不影响其他。" : "串联只有一条路，坏一个整条路断开。"], traps: { [parallel ? "0 个" : "2 个"]: parallel ? "并联时其他灯泡仍然连通。" : "串联时一个断开，所有灯都不亮。" } };
    }
    case "pendulum": {
      const l1 = rng.pick([20, 30, 40]), l2 = l1 + rng.pick([30, 40, 50]);
      return { ...base, kind: "choice", params: { l1, l2 }, prompt: `摆长 ${l1} 厘米和 ${l2} 厘米的两个摆，哪个摆得快（摆动一次时间短）？`, answer: `${l1} 厘米`, choices: choices(`${l1} 厘米`, [`${l2} 厘米`, "一样快"], rng), steps: ["摆长越短，摆得越快。", `${l1} 厘米：约 ${pendulum({ len: l1 }).period} 秒；${l2} 厘米：约 ${pendulum({ len: l2 }).period} 秒。`], traps: { "一样快": "摆长不同，快慢就不同。" } };
    }
  }
}

function fmt2(v: number): string {
  const int = Math.floor(v / 100), frac = String(v % 100).padStart(2, "0").replace(/0+$/, "");
  return frac ? `${int}.${frac}` : String(int);
}

/** 独立重算答案，确认题目条件完整、答案与解析一致。 */
export function verifyPractice(q: PracticeQ): string[] {
  const issues: string[] = [];
  const p = q.params;
  let expect: string | null = null;
  switch (q.demo) {
    case "add-sub": expect = String(addSub(p).result); break;
    case "group-share": { const r = groupShare(p) as unknown as Record<string, number>; expect = p.mode === 0 ? String(r.product) : r.remainder ? `${r.quotient}……${r.remainder}` : String(r.quotient); break; }
    case "fraction": expect = "other" in p ? J(p.parts < p.other) : fraction(p).text; break;
    case "perimeter-area": { const r = perimeterArea(p); expect = String(p.askArea ? r.area : r.perimeter); break; }
    case "angle": expect = q.level === 3 ? `${p.deg}°` : angleKind(p.deg); break;
    case "law": expect = q.level === 1 ? String(p.c) : String(law(p).right); break;
    case "decimal-mul": expect = decimalMul(p).product; break;
    case "balance": { const r = balance(p); expect = String(r.x); if (!Number.isInteger(r.x)) issues.push("方程解不是整数"); break; }
    case "circle": { const r = circle(p); expect = p.askArea ? r.area : r.perimeter; break; }
    case "cylinder": expect = q.level === 3 ? "错" : cylinder(p).volume; break;
    case "shadow": expect = "变短"; break;
    case "pendulum": expect = `${p.l1} 厘米`; break;
    default: expect = q.answer;
  }
  if (expect !== q.answer) issues.push(`答案不一致：期望 ${expect}，题目给出 ${q.answer}`);
  if (!q.prompt || q.prompt.length < 4) issues.push("题干不完整");
  if (q.steps.length === 0) issues.push("缺少解析");
  if (q.choices) {
    if (!q.choices.includes(q.answer)) issues.push("选项中没有正确答案");
    if (new Set(q.choices).size !== q.choices.length) issues.push("选项重复");
  }
  if (q.kind === "judge" && !["对", "错"].includes(q.answer)) issues.push("判断题答案只能是对或错");
  return issues;
}

/** 规范化学生输入，便于比较（全角转半角、去空格）。 */
export function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/。/g, ".").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function checkAnswer(q: PracticeQ, given: string): { ok: boolean; hint?: string } {
  const g = normalizeAnswer(given);
  const ok = g === normalizeAnswer(q.answer);
  return ok ? { ok } : { ok, hint: q.traps[g] ?? q.traps[given.trim()] };
}
