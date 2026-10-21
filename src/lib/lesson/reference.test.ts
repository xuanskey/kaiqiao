/**
 * v0.13 质量强化：五节互动课的数学正确性，用 reference.ts 里的独立算法（BigInt 有理数、
 * 数论求循环节、质因数约分、鞋带公式）全量或大样本核对，不复用出题和演示时的计算函数。
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { barChart, decimalDiv, fractionMul, lessonScript, makeTen, normalizeParams, polyArea, polyShapes, FRUITS, type Params } from "./demos.ts";
import { checkAnswer, makePractice, verifyPractice, normalizeAnswer } from "./practice.ts";
import { mulberry32 } from "../math/rng.ts";
import { div, eq, expand, fracText, lt, mixedText, mul, parseDecimal, parseFractionText, rat, reduce, roundHalfUp, shoelace2, terminating, truncate } from "./reference.ts";

const allText = (steps: ReturnType<typeof lessonScript>) => steps.map((s) => [s.say, ...s.board.map((b) => (b.kind === "column" ? b.lines.join("\n") : "text" in b ? b.text : ""))].join("\n")).join("\n");

describe("参考实现自检", () => {
  it("BigInt 有理数、小数展开、四舍五入", () => {
    assert.deepEqual(expand(rat(1, 7)), { int: 0n, pre: "", period: "142857" });
    assert.deepEqual(expand(rat(1, 6)), { int: 0n, pre: "1", period: "6" });
    assert.deepEqual(expand(rat(10, 3)), { int: 3n, pre: "", period: "3" });
    assert.equal(terminating(rat(1, 64)), "0.015625");
    assert.equal(terminating(rat(1, 3)), null);
    assert.equal(roundHalfUp(rat(1, 8), 2), "0.13");
    assert.equal(roundHalfUp(rat(2, 3), 2), "0.67");
    assert.equal(truncate(rat(2, 3), 2), "0.66");
    assert.equal(fracText(reduce(6n, 12n)), "1/2");
    assert.equal(mixedText(rat(9, 4)), "2又1/4");
    assert.ok(eq(parseDecimal("7.20"), rat(36, 5)));
    assert.ok(eq(parseFractionText("2又1/4")!, rat(9, 4)));
    assert.equal(shoelace2([[0, 0], [4, 0], [4, 3], [0, 3]]), 24);
  });
});

describe("小数除法：全部 999 × 99 组参数", () => {
  it("商、有限/循环判断、循环节、保留两位小数、扩倍后的算式都与参考实现一致", () => {
    const bad: string[] = [];
    for (let a = 1; a <= 999; a++) for (let b = 1; b <= 99; b++) {
      const r = decimalDiv({ a, b });
      const q = rat(a, b);
      const tag = `${a / 10} ÷ ${b / 10}`;
      if (!eq(parseDecimal(r.aText), rat(a, 10)) || !eq(parseDecimal(r.bText), rat(b, 10))) { bad.push(`${tag} 显示`); continue; }
      // 转化后的算式：除数必须是整数，商不变
      if (r.newB.includes(".") || !eq(div(parseDecimal(r.newA), parseDecimal(r.newB)), q)) bad.push(`${tag} 转化成 ${r.newA} ÷ ${r.newB}`);
      if (r.intDivisor !== (b % 10 === 0)) bad.push(`${tag} 除数是否整数`);
      const exact = terminating(q);
      if (r.exact !== exact) bad.push(`${tag} 精确商 ${r.exact} ≠ ${exact}`);
      if (r.recurring !== (exact === null)) bad.push(`${tag} 循环判断`);
      if (exact === null) {
        if (r.approx2 !== roundHalfUp(q, 2)) bad.push(`${tag} 保留两位 ${r.approx2} ≠ ${roundHalfUp(q, 2)}`);
        const e = expand(q);
        if (r.cycle !== e.period) bad.push(`${tag} 循环节 ${r.cycle} ≠ ${e.period}`);
        if (r.shown !== `${truncate(q, 4)}…`) bad.push(`${tag} 显示 ${r.shown}`);
        if (r.quotient !== r.approx2) bad.push(`${tag} quotient`);
      } else if (r.quotient !== exact) bad.push(`${tag} quotient`);
      // 竖式每一行：被除部分 = 商 × 除数 + 余数，余数小于除数
      for (const row of r.rows) if (row.cur !== row.q * r.D + row.rem || row.rem < 0 || row.rem >= r.D) { bad.push(`${tag} 竖式行 ${JSON.stringify(row)}`); break; }
      // 竖式各行的商连起来，必须就是商的数字（中间的 0 不能漏掉）
      const rowDigits = r.rows.map((x) => x.q).join("").replace(/^0+/, "");
      const want = (exact ?? truncate(q, 120)).replace(".", "").replace(/^0+/, "");
      if (exact !== null ? rowDigits !== want : !want.startsWith(rowDigits)) bad.push(`${tag} 竖式商的数字 ${rowDigits} 与 ${exact ?? truncate(q, 6)} 不一致`);
    }
    assert.deepEqual(bad.slice(0, 15), [], `共 ${bad.length} 处不一致`);
  });

  it("讲解板书里的结论与参考答案一致（每 7 组抽 1 组）", () => {
    const bad: string[] = [];
    let n = 0;
    for (let a = 1; a <= 999; a++) for (let b = 1; b <= 99; b++) {
      if ((a * 100 + b) % 7) continue;
      n++;
      const q = rat(a, b), exact = terminating(q);
      for (const v of [0, 1, 2]) {
        const steps = lessonScript("decimal-div", { a, b }, 5, v);
        const text = allText(steps);
        const formula = steps.flatMap((s) => s.board).find((x) => x.kind === "formula" && x.id === "f");
        const f = formula && "text" in formula ? formula.text : "";
        if (exact !== null ? !f.endsWith(`= ${exact}`) : !f.endsWith(`≈ ${roundHalfUp(q, 2)}`)) bad.push(`${a}/${b} v${v}: ${f}`);
        const period = expand(q).period;
        if (exact === null && !text.includes(period.length <= 6 ? `循环节是 ${period}` : `循环节有 ${period.length} 位（${period.slice(0, 6)}……）`)) bad.push(`${a}/${b} v${v} 缺少循环节`);
        if (b % 10 !== 0 && !text.includes("同时乘 10") && v !== 1) bad.push(`${a}/${b} v${v} 缺少扩倍说明`);
      }
    }
    assert.ok(n > 10000);
    assert.deepEqual(bad.slice(0, 10), [], `共 ${bad.length} 处`);
  });

  it("具体易错例子：商中间、末尾的 0", () => {
    const r = decimalDiv({ a: 408, b: 40 }); // 40.8 ÷ 4 = 10.2
    assert.equal(r.exact, "10.2");
    assert.deepEqual(r.rows.map((x) => x.q), [1, 0, 2]);
    assert.deepEqual(decimalDiv({ a: 204, b: 2 }).rows.map((x) => x.q), [1, 0, 2]); // 20.4 ÷ 0.2 = 102
    assert.deepEqual(decimalDiv({ a: 200, b: 1 }).rows.map((x) => x.q), [2, 0, 0]); // 20 ÷ 0.1 = 200
    assert.equal(decimalDiv({ a: 10, b: 17 }).cycle, "5882352941176470"); // 1 ÷ 1.7，循环节 16 位
  });
});

describe("分数乘法：全部参数组合与边界", () => {
  const all: Params[] = [];
  for (const mode of [0, 1]) for (let d1 = 2; d1 <= 9; d1++) for (let n1 = 1; n1 < d1; n1++) {
    if (mode === 0) for (let k = 2; k <= 9; k++) all.push({ mode, n1, d1, k, n2: 1, d2: 2 });
    else for (let d2 = 2; d2 <= 9; d2++) for (let n2 = 1; n2 < d2; n2++) all.push({ mode, n1, d1, k: 3, n2, d2 });
  }
  it(`最简结果、原始积、带分数、约分标记都与参考实现一致（${all.length} 组）`, () => {
    const bad: string[] = [];
    for (const p of all) {
      const r = fractionMul(p);
      const product = p.mode === 0 ? mul(rat(p.n1, p.d1), rat(p.k)) : mul(rat(p.n1, p.d1), rat(p.n2, p.d2));
      const tag = JSON.stringify(p);
      if (r.simplest !== fracText(product)) bad.push(`${tag} 最简 ${r.simplest} ≠ ${fracText(product)}`);
      if (r.mixed !== mixedText(product)) bad.push(`${tag} 带分数 ${r.mixed}`);
      const raw = p.mode === 0 ? `${p.n1 * p.k}/${p.d1}` : `${p.n1 * p.n2}/${p.d1 * p.d2}`;
      if (r.raw !== raw) bad.push(`${tag} 原始积 ${r.raw}`);
      if (r.reduced !== (raw !== `${product.n}/${product.d}`)) bad.push(`${tag} 约分标记`);
      const cross = p.mode === 0 ? reduce(BigInt(p.k), BigInt(p.d1)).d !== BigInt(p.d1) : reduce(BigInt(p.n1), BigInt(p.d2)).d !== BigInt(p.d2) || reduce(BigInt(p.n2), BigInt(p.d1)).d !== BigInt(p.d1);
      if (r.cross !== cross) bad.push(`${tag} 交叉约分标记`);
      if (p.mode === 1 && !lt(product, rat(p.n1, p.d1))) bad.push(`${tag} 乘真分数积应变小`);
      const text = allText(lessonScript("fraction-mul", p, 6));
      const shown = r.mixed ? `${fracText(product)}（${r.mixed}）` : fracText(product);
      if (!text.includes(`= ${shown}`)) bad.push(`${tag} 板书缺少结果 ${shown}`);
    }
    assert.deepEqual(bad.slice(0, 10), [], `共 ${bad.length} 处`);
  });

  it("边界参数：0、1、负数、非数字都会被规范到合法范围，且分数保持真分数", () => {
    const cases: Params[] = [
      { mode: 1, n1: 0, d1: 1, n2: 0, d2: 0 }, { mode: 0, n1: 1, d1: 2, k: 0 }, { mode: 0, n1: 1, d1: 2, k: 1 },
      { mode: 1, n1: -3, d1: -9, n2: 99, d2: 99 }, { mode: 1, n1: Number.NaN, d1: Number.POSITIVE_INFINITY, n2: 2.6, d2: 3.4 }, { mode: 7, n1: 9, d1: 9 },
    ];
    for (const c of cases) {
      const p = normalizeParams("fraction-mul", c);
      assert.ok(p.mode === 0 || p.mode === 1, JSON.stringify(c));
      for (const [n, d] of [[p.n1, p.d1], [p.n2, p.d2]]) assert.ok(Number.isInteger(n) && Number.isInteger(d) && n >= 1 && n < d && d >= 2 && d <= 9, `${JSON.stringify(c)} → ${JSON.stringify(p)}`);
      assert.ok(p.k >= 2 && p.k <= 9);
      const r = fractionMul(p);
      assert.ok(parseFractionText(r.simplest), r.simplest);
    }
    // 整数结果写整数，最大分母 9 × 9 = 81
    assert.equal(fractionMul({ mode: 0, n1: 1, d1: 3, k: 3, n2: 1, d2: 2 }).simplest, "1");
    assert.equal(fractionMul({ mode: 1, n1: 8, d1: 9, k: 3, n2: 8, d2: 9 }).simplest, "64/81");
    assert.equal(fractionMul({ mode: 1, n1: 8, d1: 9, k: 3, n2: 1, d2: 9 }).raw, "8/81");
  });
});

describe("凑十法：全部参数", () => {
  it("分法与和正确；正好 10 不说“不满十”；第一个数小时不把它叫作大数", () => {
    for (let a = 5; a <= 9; a++) for (let b = 2; b <= 9; b++) {
      const r = makeTen({ a, b });
      assert.equal(r.sum, a + b);
      assert.equal(r.carry, a + b > 10);
      if (r.carry) { assert.equal(a + r.need, 10); assert.equal(r.need + r.rest, b); assert.ok(r.rest >= 1 && r.need >= 1); }
      for (const v of [0, 1, 2]) {
        const text = allText(lessonScript("make-ten", { a, b }, 1, v));
        assert.ok(text.includes(String(a + b)), `${a}+${b}`);
        if (a + b === 10) assert.ok(!text.includes("不满十") && !text.includes("不满 10"), `${a}+${b} 正好是 10：${text}`);
        if (r.carry && a < b) {
          assert.ok(!text.includes(`看大数 ${a}`), `${a}+${b} 把较小的 ${a} 叫成大数`);
          assert.ok(text.includes(`${b} + ${10 - b} = 10`), `${a}+${b} 应提示看大数 ${b}`);
        }
      }
    }
  });
});

describe("条形统计图：全部票数组合", () => {
  it("最多、最少、相差、合计、格数", () => {
    for (let c0 = 0; c0 <= 12; c0++) for (let c1 = 0; c1 <= 12; c1++) for (let c2 = 0; c2 <= 12; c2 += 3) for (let c3 = 0; c3 <= 12; c3 += 2) for (const unit of [0, 1]) {
      const counts = [c0, c1, c2, c3];
      const r = barChart({ c0, c1, c2, c3, unit });
      const sorted = [...counts].sort((x, y) => x - y);
      assert.equal(r.max, sorted[3]); assert.equal(r.min, sorted[0]);
      assert.equal(r.total, c0 + c1 + c2 + c3); assert.equal(r.diff, sorted[3] - sorted[0]);
      assert.deepEqual(r.maxName.split("、"), FRUITS.filter((_, i) => counts[i] === sorted[3]));
      assert.deepEqual(r.cells, counts.map((c) => c / (unit ? 2 : 1)));
    }
  });
  it("票数都一样时不说“最多的比最少的多 0 票”", () => {
    const text = allText(lessonScript("bar-chart", { c0: 5, c1: 5, c2: 5, c3: 5, unit: 0 }, 4));
    assert.ok(!text.includes("多 0") && text.includes("一样多"), text);
  });
});

describe("多边形面积：全部参数，用鞋带公式核对画出来的图形", () => {
  it("公式结果 = 图形面积；拼成的平行四边形面积 = 2 倍；剪拼后的长方形面积不变", () => {
    for (const shape of [0, 1, 2]) for (let a = 2; a <= 12; a++) for (let b = 1; b <= 10; b++) for (let h = 2; h <= 7; h++) {
      const p = normalizeParams("poly-area", { shape, a, b, h });
      const r = polyArea(p);
      const twice = shape === 0 ? 2 * p.a * p.h : shape === 1 ? p.a * p.h : (p.a + p.b) * p.h;
      assert.ok(eq(parseDecimal(r.area), rat(twice, 2)), `${JSON.stringify(p)} ${r.area}`);
      const g = polyShapes(p);
      assert.equal(shoelace2(g.shape), twice, `图形 ${JSON.stringify(p)}`);
      if (g.copy) assert.equal(shoelace2(g.shape) + shoelace2(g.copy), shoelace2(g.whole), `拼图 ${JSON.stringify(p)}`);
      assert.equal(shoelace2(g.whole), shape === 0 ? twice : 2 * twice, `拼成的图形 ${JSON.stringify(p)}`);
      // 拼成的图形底 × 高
      assert.equal(shoelace2(g.whole), 2 * g.wholeBase * p.h);
      assert.equal(g.wholeBase, shape === 0 ? p.a : shape === 1 ? p.a : p.a + p.b);
      assert.ok(r.calc.endsWith(`= ${r.area}`));
    }
  });
});

describe("随堂练习：五节课的答案用参考实现独立重算", () => {
  const expect: Record<string, (p: Params) => string> = {
    "make-ten": (p) => String(p.q === 1 ? 10 - p.a : p.q === 2 ? p.a + p.b : p.b - (10 - p.a)),
    "bar-chart": (p) => {
      const c = [p.c0, p.c1, p.c2, p.c3];
      if (p.q === 1) { const m = Math.max(...c); assert.equal(c.filter((x) => x === m).length, 1, "最多的只能有一个"); return FRUITS[c.indexOf(m)]; }
      if (p.q === 2) return String(Math.max(...c) - Math.min(...c));
      const per = p.unit ? 2 : 1; assert.equal(c[p.i] % per, 0, "格数应为整数"); return String(c[p.i] / per);
    },
    "poly-area": (p) => terminating(rat(p.shape === 0 ? p.a * p.h : p.shape === 1 ? p.a * p.h : (p.a + p.b) * p.h, p.shape === 0 ? 1 : 2))!,
    "decimal-div": (p) => { const q = rat(p.a, p.b); if (p.q === 3) { assert.equal(terminating(q), null, "提高题应除不尽"); return roundHalfUp(q, 2); } const t = terminating(q); assert.ok(t, "基础题应能除尽"); return t!; },
    "fraction-mul": (p) => p.q === 3 ? fracText(mul(rat(p.N), rat(p.n, p.d))) : fracText(p.mode === 0 ? mul(rat(p.n1, p.d1), rat(p.k)) : mul(rat(p.n1, p.d1), rat(p.n2, p.d2))),
  };
  const grade = { "make-ten": 1, "bar-chart": 4, "poly-area": 5, "decimal-div": 5, "fraction-mul": 6 } as const;
  for (const demo of Object.keys(expect) as (keyof typeof grade)[]) it(demo, () => {
    const rng = mulberry32(13013);
    for (const lv of [1, 2, 3]) for (let i = 0; i < 400; i++) {
      const q = makePractice(demo, grade[demo], lv, rng, i);
      assert.equal(q.answer, expect[demo](q.params), `${demo} L${lv}: ${q.prompt}`);
      assert.deepEqual(verifyPractice(q), [], q.prompt);
      assert.ok(checkAnswer(q, q.answer).ok, q.prompt);
      for (const trap of Object.keys(q.traps)) assert.notEqual(normalizeAnswer(trap), normalizeAnswer(q.answer), `${q.prompt} 的易错提示不能等于正确答案`);
      if (demo === "fraction-mul") for (const m of q.prompt.replace(/（写成.*）/, "").matchAll(/(\d+)\/(\d+)/g)) assert.equal(fracText(rat(Number(m[1]), Number(m[2]))), `${m[1]}/${m[2]}`, `题目里的分数应是最简分数：${q.prompt}`);
      if (demo === "decimal-div") assert.ok(q.prompt.includes(`${q.params.a / 10} ÷ ${q.params.b / 10}`), q.prompt);
    }
  });
});

describe("答错时的针对性提示", () => {
  const find = (demo: Parameters<typeof makePractice>[0], g: 1 | 4 | 5 | 6, lv: number, ok: (q: ReturnType<typeof makePractice>) => boolean) => {
    const rng = mulberry32(99);
    for (let i = 0; i < 3000; i++) { const q = makePractice(demo, g, lv, rng, i); if (ok(q)) return q; }
    throw new Error("没有找到合适的题");
  };
  it("小数除法：商的小数点位置错了", () => {
    const q1 = find("decimal-div", 5, 1, () => true); // 例如 7.2 ÷ 4 = 1.8
    const digits = q1.answer.replace(".", "");
    assert.match(checkAnswer(q1, digits).hint ?? "", /小数点/);
    const shifted = String(Number(q1.answer) / 10);
    assert.match(checkAnswer(q1, shifted).hint ?? "", /小数点/);
    const q2 = find("decimal-div", 5, 2, () => true);
    assert.match(checkAnswer(q2, String(Number(q2.answer) / 10)).hint ?? "", /10 倍|扩大/);
    const q3 = find("decimal-div", 5, 3, (q) => q.traps && Object.keys(q.traps).length > 0);
    assert.match(checkAnswer(q3, Object.keys(q3.traps)[0]).hint ?? "", /四舍五入/);
  });
  it("分数乘法：分母相加、没约分、带分数", () => {
    const q = find("fraction-mul", 6, 2, (x) => x.params.mode === 1);
    const { n1, d1, n2, d2 } = q.params;
    assert.match(checkAnswer(q, `${n1 + n2}/${d1 + d2}`).hint ?? "", /不是相加|相乘/);
    assert.match(checkAnswer(q, `${n1 * n2}/${d1 + d2}`).hint ?? "", /分母/);
    const qr = find("fraction-mul", 6, 2, (x) => x.answer.includes("/") && fracText(reduce(BigInt(x.params.n1 * x.params.n2), BigInt(x.params.d1 * x.params.d2))) === x.answer && x.params.n1 * x.params.n2 !== Number(x.answer.split("/")[0]));
    const [an, ad] = qr.answer.split("/").map(Number);
    const r = checkAnswer(qr, `${an * 2}/${ad * 2}`);
    assert.equal(r.ok, false); assert.match(r.hint ?? "", /约分|最简/);
    const qm = find("fraction-mul", 6, 1, (x) => { const v = parseFractionText(x.answer); return !!v && v.d !== 1n && v.n > v.d; });
    const v = parseFractionText(qm.answer)!;
    assert.ok(checkAnswer(qm, mixedText(v)).ok, `带分数 ${mixedText(v)} 也应判对`);
  });
});
