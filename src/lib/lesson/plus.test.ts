import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readNum, calendar, longDiv, columnAdd, columnMul, views, mixedOps, fractionAdd, fractionDiv, treePlant, oddOne, chickenRabbit, position, factors } from "./plus.ts";
import { normalizeParams } from "./demo-defs.ts";

describe("v0.16 新课的计算", () => {
  it("整数读法：中间的 0 只读一个零，末尾的 0 不读", () => {
    const cases: [number, string][] = [[10, "十"], [13, "十三"], [110, "一百一十"], [3050, "三千零五十"], [3005, "三千零五"], [1010, "一千零一十"], [120000, "十二万"],
      [30500, "三万零五百"], [300050, "三十万零五十"], [30205000, "三千零二十万五千"], [100000005, "一亿零五"], [99999999, "九千九百九十九万九千九百九十九"], [20030000, "二千零三万"]];
    for (const [n, text] of cases) assert.equal(readNum(n), text, String(n));
  });
  it("平年闰年与每月天数", () => {
    assert.equal(calendar({ year: 2024, month: 2 }).days, 29);
    assert.equal(calendar({ year: 1900, month: 2 }).days, 28);
    assert.equal(calendar({ year: 2000, month: 2 }).days, 29);
    assert.equal(calendar({ year: 2026, month: 9 }).days, 30);
    assert.equal(calendar({ year: 2026, month: 10 }).first, 4, "2026 年 10 月 1 日是星期四");
  });
  it("竖式计算与商中间的 0", () => {
    assert.deepEqual([longDiv({ a: 812, b: 4 }).q, longDiv({ a: 812, b: 4 }).zeroInside], [203, true]);
    assert.equal(longDiv({ a: 156, b: 4 }).steps.length, 2);
    assert.equal(longDiv({ a: 828, b: 36 }).text, "23");
    assert.equal(columnAdd({ op: 1, a: 1000, b: 1 }).result, 999);
    assert.ok(columnAdd({ op: 0, a: 368, b: 257 }).regroup);
    assert.equal(columnMul({ a: 145, b: 12 }).product, 1740);
  });
  it("三视图的正方形个数", () => {
    const r = views({ shape: 4 });
    assert.deepEqual([r.front.length, r.top.length, r.left.length], [3, 4, 3]);
  });
  it("混合运算按顺序", () => {
    assert.equal(mixedOps(normalizeParams("mixed-ops", { form: 1, a: 30, b: 6, c: 4 })).result, 54);
    const p = normalizeParams("mixed-ops", { form: 3, a: 31, b: 6, c: 4 });
    assert.equal((p.a - p.b) % p.c, 0, "除法能整除");
  });
  it("分数、植树、找次品、鸡兔同笼、方向、因数", () => {
    assert.equal(fractionAdd({ op: 0, n1: 1, d1: 2, n2: 1, d2: 3 }).result, "5/6");
    assert.equal(fractionAdd({ op: 1, n1: 3, d1: 4, n2: 1, d2: 4 }).result, "1/2");
    assert.equal(fractionDiv({ mode: 2, n1: 3, d1: 4, k: 2, n2: 1, d2: 2 }).result, "3/2");
    assert.deepEqual([0, 1, 2, 3].map((ends) => treePlant({ ends, len: 20, gap: 5 }).trees), [5, 4, 3, 4]);
    assert.deepEqual([2, 3, 4, 9, 10, 27].map((n) => oddOne({ n }).k), [1, 1, 2, 2, 3, 3]);
    assert.equal(chickenRabbit({ heads: 35, rabbits: 12 }).legs, 94);
    assert.equal(position({ mode: 1, x: 6, y: 5 }).dir, "东北");
    assert.equal(position({ mode: 1, x: 2, y: 1 }).dir, "西南");
    assert.deepEqual(factors({ n: 12 }).list, [1, 2, 3, 4, 6, 12]);
    assert.ok(factors({ n: 13 }).prime);
  });
});
