import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decimalDiv, fractionMul, lessonScript, lifeExample, normalizeParams } from "./demos.ts";
import { analyzeText } from "./importer.ts";
import { makePractice, verifyPractice, checkAnswer } from "./practice.ts";
import { PEP_MATH, PEP_MATH_2012 } from "./curriculum.ts";
import { lessonFromSearch } from "./today.ts";
import { mulberry32 } from "../math/rng.ts";

describe("v0.12 小数除法", () => {
  it("除数是小数：同时 ×10，商不变", () => {
    const r = decimalDiv({ a: 72, b: 4 });
    assert.equal(r.expr, "7.2 ÷ 0.4"); assert.equal(r.newA, "72"); assert.equal(r.newB, "4"); assert.equal(r.exact, "18"); assert.equal(r.intDivisor, false);
    assert.equal(decimalDiv({ a: 50, b: 25 }).exact, "2"); assert.equal(decimalDiv({ a: 50, b: 25 }).padZero, true);
    assert.equal(decimalDiv({ a: 200, b: 25 }).exact, "8");
  });
  it("除数是整数：商的小数点对齐，不够商 1 商 0，添 0 继续除", () => {
    assert.equal(decimalDiv({ a: 224, b: 40 }).exact, "5.6");
    assert.equal(decimalDiv({ a: 24, b: 40 }).exact, "0.6");
    const r = decimalDiv({ a: 210, b: 60 }); // 21 ÷ 6 = 3.5
    assert.equal(r.exact, "3.5"); assert.ok(r.addedZero);
  });
  it("除不尽：循环小数和保留两位小数", () => {
    const r = decimalDiv({ a: 100, b: 30 }); // 10 ÷ 3
    assert.equal(r.recurring, true); assert.equal(r.cycle, "3"); assert.equal(r.approx2, "3.33");
    assert.equal(decimalDiv({ a: 20, b: 30 }).approx2, "0.67");
    assert.equal(decimalDiv({ a: 10, b: 70 }).approx2, "0.14");
    assert.equal(decimalDiv({ a: 109, b: 30 }).approx2, "3.63");
  });
  it("讲解脚本按情况分支", () => {
    assert.ok(lessonScript("decimal-div", { a: 72, b: 4 }, 5).some((s) => s.say.includes("同时乘 10")));
    assert.ok(lessonScript("decimal-div", { a: 224, b: 40 }, 5).some((s) => s.say.includes("对齐")));
    assert.ok(lessonScript("decimal-div", { a: 100, b: 30 }, 5).some((s) => s.say.includes("循环小数")));
    for (const v of [0, 1, 2]) assert.ok(lessonScript("decimal-div", { a: 72, b: 4 }, 5, v).length >= 4);
    assert.ok(lifeExample("decimal-div", 5).includes("2.5"));
  });
});

describe("v0.12 分数乘法", () => {
  it("分数乘整数、分数乘分数，结果约成最简", () => {
    assert.equal(fractionMul({ mode: 0, n1: 2, d1: 9, k: 3, n2: 1, d2: 2 }).simplest, "2/3");
    assert.equal(fractionMul({ mode: 0, n1: 3, d1: 4, k: 4, n2: 1, d2: 2 }).simplest, "3");
    assert.equal(fractionMul({ mode: 0, n1: 3, d1: 4, k: 3, n2: 1, d2: 2 }).mixed, "2又1/4");
    const r = fractionMul({ mode: 1, n1: 3, d1: 4, k: 2, n2: 2, d2: 3 });
    assert.deepEqual([r.raw, r.simplest, r.cross], ["6/12", "1/2", true]);
    assert.equal(fractionMul({ mode: 1, n1: 2, d1: 5, k: 2, n2: 1, d2: 3 }).simplest, "2/15");
    assert.deepEqual(normalizeParams("fraction-mul", { mode: 1, n1: 7, d1: 4, n2: 9, d2: 3 }), { mode: 1, n1: 3, d1: 4, k: 3, n2: 2, d2: 3 });
  });
  it("讲解脚本：面积模型和几个相同分数相加", () => {
    assert.ok(lessonScript("fraction-mul", { mode: 1, n1: 3, d1: 4, n2: 2, d2: 3 }, 6).some((s) => s.say.includes("分子乘分子")));
    assert.ok(lessonScript("fraction-mul", { mode: 0, n1: 2, d1: 9, k: 3 }, 6).some((s) => s.say.includes("3 个 2/9 相加")));
  });
});

describe("v0.12 随堂练习、目录、导入与直达链接", () => {
  it("随堂练习答案都能独立核对", () => {
    const rng = mulberry32(20261021);
    for (const demo of ["decimal-div", "fraction-mul"] as const) for (const lv of [1, 2, 3]) for (let i = 0; i < 60; i++) {
      const q = makePractice(demo, demo === "decimal-div" ? 5 : 6, lv, rng, i);
      assert.deepEqual(verifyPractice(q), [], `${demo} L${lv}: ${q.prompt}`);
      assert.ok(checkAnswer(q, q.answer).ok);
    }
  });
  it("接入人教版目录（新版和 2012 版）", () => {
    const has = (e: typeof PEP_MATH, key: "5上" | "6上", demo: string, title: string) => assert.ok(e.catalog[key]!.some((u) => u.title.includes(title) && u.demos?.includes(demo as never)), `${e.id} ${key} ${title}`);
    has(PEP_MATH, "5上", "decimal-div", "小数除法"); has(PEP_MATH_2012, "5上", "decimal-div", "小数除法");
    has(PEP_MATH, "6上", "fraction-mul", "分数乘法"); has(PEP_MATH_2012, "6上", "fraction-mul", "分数乘法");
  });
  it("导入资料能匹配到新课", () => {
    const r = analyzeText("除数是小数的除法怎么算？\n7.2÷0.4=\n求 60 的 3/4 是多少？\n分数乘分数：2/3 × 3/4 等于多少？", 6);
    const demos = r.items.map((x) => x.demo);
    assert.equal(demos[0], "decimal-div"); assert.equal(demos[1], "decimal-div"); assert.equal(demos[3], "fraction-mul");
    const five = analyzeText("分数乘分数：2/3 × 3/4 等于多少？", 5).items[0];
    assert.equal(five.status, "above-grade");
  });
  it("直达链接", () => {
    assert.deepEqual(lessonFromSearch("?lesson=decimal-div&grade=5"), { demo: "decimal-div", grade: 5 });
    assert.deepEqual(lessonFromSearch("?lesson=fraction-mul&grade=3"), { demo: "fraction-mul", grade: 6 });
    assert.equal(lessonFromSearch("?lesson=nope"), null); assert.equal(lessonFromSearch(""), null);
  });
});
