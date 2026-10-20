import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEMO_LIST, DEMOS, defaultParams, lessonScript, addSub, groupShare, fraction, perimeterArea, angleKind, law, decimalMul, balance, circle, cylinder, shadow, circuit, pendulum, magnet, normalizeParams } from "./demos.ts";
import { boardAt, initialPlayer, reducePlayer, sceneAt, type PlayerState } from "./timeline.ts";
import { parseScene, validateScene } from "./scene.ts";
import { makePractice, verifyPractice, checkAnswer, normalizeAnswer } from "./practice.ts";
import { adaptLevel, initialTutor, tutorRespond, TUTOR_ACTIONS } from "./tutor.ts";
import { EDITIONS, PEP_MATH, editionsFor, unitsOf } from "./curriculum.ts";
import { bandOf, gradeStyle, splitForGrade, stepDurationMs } from "./grade-style.ts";
import { fmtScaled, roundTo } from "./num.ts";
import { mulberry32 } from "../math/rng.ts";
import type { Grade } from "../math/types.ts";

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];

describe("课堂时间轴", () => {
  const steps = lessonScript("circle", { r: 3, n: 8 }, 6);
  it("暂停后状态不再前进，继续后从原位置接着播", () => {
    let s: PlayerState = reducePlayer(steps, initialPlayer(), { type: "play" });
    s = reducePlayer(steps, s, { type: "tick", dtMs: steps[0].durationMs * 0.5 });
    assert.equal(s.index, 0);
    assert.ok(Math.abs(s.progress - 0.5) < 1e-9);
    const paused = reducePlayer(steps, s, { type: "pause" });
    const still = reducePlayer(steps, paused, { type: "tick", dtMs: 99999 });
    assert.deepEqual(still, paused);
    const resumed = reducePlayer(steps, still, { type: "play" });
    const moved = reducePlayer(steps, resumed, { type: "tick", dtMs: steps[0].durationMs * 0.6 });
    assert.equal(moved.index, 1);
  });
  it("跳转、上一步、下一步、重新开始和倍速都正确", () => {
    let s = reducePlayer(steps, initialPlayer(), { type: "seek", index: 3 });
    assert.equal(s.index, 3);
    s = reducePlayer(steps, s, { type: "prev" }); assert.equal(s.index, 2);
    s = reducePlayer(steps, s, { type: "next" }); assert.equal(s.index, 3);
    s = reducePlayer(steps, s, { type: "seek", index: 999 }); assert.equal(s.index, steps.length - 1);
    s = reducePlayer(steps, s, { type: "seek", index: -5 }); assert.equal(s.index, 0);
    s = reducePlayer(steps, s, { type: "speed", speed: 2 }); assert.equal(s.speed, 2);
    s = reducePlayer(steps, { ...s, playing: true }, { type: "tick", dtMs: steps[0].durationMs / 2 });
    assert.equal(s.index, 1, "2 倍速下半个时长就走完一步");
    s = reducePlayer(steps, s, { type: "restart" });
    assert.equal(s.index, 0); assert.equal(s.playing, true);
  });
  it("播放到结尾自动停止，再按播放会从头开始", () => {
    let s = reducePlayer(steps, initialPlayer(), { type: "play" });
    s = reducePlayer(steps, s, { type: "tick", dtMs: 1e9 });
    assert.equal(s.ended, true); assert.equal(s.playing, false); assert.equal(s.index, steps.length - 1);
    s = reducePlayer(steps, s, { type: "play" });
    assert.equal(s.index, 0); assert.equal(s.ended, false);
  });
  it("板书保留之前写下的内容，跳转后与逐步播放一致", () => {
    const direct = boardAt(steps, 4).map((v) => v.item.id);
    const viaSteps: string[] = [];
    for (let i = 0; i <= 4; i++) for (const b of steps[i].board) if (!viaSteps.includes(b.id)) viaSteps.push(b.id);
    assert.deepEqual(direct, viaSteps);
    assert.ok(boardAt(steps, 4).some((v) => v.highlighted));
    assert.equal(sceneAt(steps, 2).cut, 1);
    assert.equal(sceneAt(steps, 0).cut, 0);
  });
  it("非法 tick 不改变状态", () => {
    const s = reducePlayer(steps, { ...initialPlayer(), playing: true }, { type: "tick", dtMs: Number.NaN });
    assert.equal(s.index, 0); assert.equal(s.progress, 0);
  });
});

describe("参数联动的真实计算", () => {
  it("一年级加减法", () => {
    assert.equal(addSub({ op: 0, a: 7, b: 8 }).result, 15);
    assert.equal(addSub({ op: 1, a: 9, b: 4 }).result, 5);
    assert.equal(normalizeParams("add-sub", { op: 1, a: 3, b: 7 }).b, 3, "减数不超过被减数");
  });
  it("二年级乘法与平均分", () => {
    assert.equal(groupShare({ mode: 0, groups: 3, each: 4 }).product, 12);
    const r = groupShare({ mode: 1, groups: 4, total: 23 }) as { quotient: number; remainder: number };
    assert.equal(r.quotient, 5); assert.equal(r.remainder, 3);
  });
  it("三年级分数、周长和面积", () => {
    assert.equal(fraction({ parts: 8, shaded: 3 }).text, "3/8");
    assert.equal(fraction({ parts: 8, shaded: 4 }).simplest, "1/2");
    assert.equal(fraction({ parts: 6, shaded: 3 }).vsHalf, "等于");
    assert.equal(normalizeParams("fraction", { parts: 4, shaded: 9 }).shaded, 4);
    assert.deepEqual(perimeterArea({ l: 5, w: 3 }), { perimeter: 16, area: 15 });
  });
  it("四年级角和运算定律", () => {
    assert.equal(angleKind(45), "锐角"); assert.equal(angleKind(90), "直角"); assert.equal(angleKind(135), "钝角"); assert.equal(angleKind(180), "平角");
    for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) for (let c = 1; c <= 9; c++) assert.ok(law({ a, b, c }).equal);
  });
  it("五年级小数乘法和方程", () => {
    assert.equal(decimalMul({ a: 12, b: 5 }).product, "0.6");
    assert.equal(decimalMul({ a: 12, b: 5 }).raw, "0.60");
    assert.equal(decimalMul({ a: 25, b: 32 }).product, "8");
    assert.equal(decimalMul({ a: 13, b: 7 }).product, "0.91");
    for (let a = 1; a <= 6; a++) for (let x = 1; x <= 12; x++) assert.equal(balance({ a, b: 4, x }).x, x);
  });
  it("六年级圆和圆柱（π 取 3.14，结果无浮点误差）", () => {
    assert.equal(circle({ r: 3 }).perimeter, "18.84");
    assert.equal(circle({ r: 3 }).area, "28.26");
    assert.equal(circle({ r: 10 }).area, "314");
    assert.equal(circle({ r: 7 }).area, "153.86");
    const c = cylinder({ r: 2, h: 5 });
    assert.equal(c.volume, "62.8"); assert.equal(c.side, "62.8"); assert.equal(c.surface, "87.92");
    assert.equal(cylinder({ r: 3, h: 3 }).cone, "28.26");
  });
  it("科学模型", () => {
    assert.equal(shadow({ sun: 45, h: 50 }).length, "50");
    assert.ok(shadow({ sun: 20, h: 50 }).lengthNum > shadow({ sun: 60, h: 50 }).lengthNum);
    assert.equal(circuit({ bulbs: 3, parallel: 0, closed: 1, broken: 2 }).anyLit, false);
    assert.equal(circuit({ bulbs: 3, parallel: 1, closed: 1, broken: 2 }).bulbs.filter((b) => b.lit).length, 2);
    assert.equal(circuit({ bulbs: 2, parallel: 1, closed: 0, broken: 0 }).anyLit, false);
    assert.equal(pendulum({ len: 100 }).period, "2.01");
    assert.ok(pendulum({ len: 25 }).periodNum < pendulum({ len: 81 }).periodNum);
    const m = magnet({ dist: 2, power: 1 });
    assert.deepEqual(m.items.filter((i) => i.pulled).map((i) => i.name), ["回形针", "铁钉"]);
    assert.equal(magnet({ dist: 10, power: 1 }).items.some((i) => i.pulled), false);
  });
  it("精确小数格式化", () => {
    assert.equal(fmtScaled(1884, 2), "18.84"); assert.equal(fmtScaled(60, 2), "0.6"); assert.equal(fmtScaled(5, 2), "0.05"); assert.equal(fmtScaled(-150, 2), "-1.5");
    assert.equal(roundTo(2.006, 2), "2.01");
  });
});

describe("每个演示在所有适用年级都能生成讲解", () => {
  for (const demo of DEMO_LIST) {
    it(demo.title, () => {
      for (const g of demo.grades) for (const variant of [0, 1, 2]) {
        const steps = lessonScript(demo.id, defaultParams(demo.id), g, variant);
        assert.ok(steps.length >= 3, `${demo.id} 至少 3 步`);
        for (const s of steps) {
          assert.ok(s.say.length > 0 && s.durationMs > 0);
          assert.ok(!/[A-Za-z]{4,}/.test(s.say.replace(/[A-Za-z]{1,3}/g, "")), `讲解不应出现英文单词：${s.say}`);
        }
        const ids = steps.flatMap((s) => s.board.map((b) => b.id));
        for (const s of steps) for (const h of s.highlight ?? []) assert.ok(ids.includes(h), `高亮的 ${h} 必须存在`);
      }
      if (demo.subject === "science") {
        const e = demo.experiment!;
        assert.ok(e.goal && e.tools.length && e.steps.length && e.observe && e.explain && e.think && e.virtualNote);
      }
    });
  }
});

describe("场景协议校验（不执行任何代码）", () => {
  it("接受合法场景并保留参数", () => {
    const r = validateScene({ version: 1, demo: "circle", grade: 6, params: { r: 5 } });
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.scene.params.r, 5); assert.equal(r.scene.params.n, 8); }
  });
  it("拒绝代码、未知字段、越界和非整数", () => {
    const bad: unknown[] = [
      { version: 1, demo: "circle", grade: 6, params: { r: "alert(1)" } },
      { version: 1, demo: "circle", grade: 6, params: { r: 3 }, script: "fetch('x')" },
      { version: 1, demo: "circle", grade: 6, params: { r: 300 } },
      { version: 1, demo: "circle", grade: 6, params: { r: 2.5 } },
      { version: 1, demo: "circle", grade: 6, params: { onload: 1 } },
      { version: 1, demo: "eval", grade: 6, params: {} },
      { version: 2, demo: "circle", grade: 6, params: {} },
      { version: 1, demo: "circle", grade: 7, params: {} },
      [1, 2, 3], null, "circle",
    ];
    for (const b of bad) assert.equal(validateScene(b).ok, false, JSON.stringify(b));
    assert.equal(parseScene("{\"version\":1,\"demo\":\"circle\",\"grade\":6,\"params\":{}}; alert(1)").ok, false);
    assert.equal(parseScene("x".repeat(5000)).ok, false);
    assert.equal(parseScene("({__proto__:{}})").ok, false);
  });
  it("超出年级的内容必须标记为课外拓展", () => {
    assert.equal(validateScene({ version: 1, demo: "circle", grade: 1, params: {} }).ok, false);
    const r = validateScene({ version: 1, demo: "circle", grade: 1, params: {}, extension: true });
    assert.ok(r.ok && r.scene.extension && r.warnings.some((w) => w.includes("课外拓展")));
  });
  it("关联参数会被自动修正并给出提示", () => {
    const r = validateScene({ version: 1, demo: "fraction", grade: 3, params: { parts: 4, shaded: 7 } });
    assert.ok(r.ok && r.scene.params.shaded === 4 && r.warnings.length === 1);
  });
});

describe("随堂练习：每道题都独立核对", () => {
  it("每个演示 × 3 个难度 × 40 题全部通过校验", () => {
    const rng = mulberry32(20261020);
    for (const demo of DEMO_LIST) for (const level of [1, 2, 3]) for (let i = 0; i < 40; i++) {
      const q = makePractice(demo.id, demo.grades[0], level, rng, i);
      assert.deepEqual(verifyPractice(q), [], `${demo.id} L${level}: ${q.prompt}`);
      assert.ok(checkAnswer(q, q.answer).ok);
    }
  });
  it("常见错误给出针对性提示", () => {
    const rng = mulberry32(7);
    let q = makePractice("circle", 6, 1, rng);
    const wrong = Object.keys(q.traps)[0];
    const res = checkAnswer(q, wrong);
    assert.equal(res.ok, false); assert.ok(res.hint);
    q = makePractice("decimal-mul", 5, 2, rng);
    assert.ok(checkAnswer(q, q.answer + "0").ok || !q.answer.includes("."), "小数末尾补 0 也算对");
  });
  it("答案规范化", () => {
    assert.equal(normalizeAnswer(" １２ "), "12");
    assert.equal(normalizeAnswer("0.60"), "0.6");
    assert.equal(normalizeAnswer("3.0"), "3");
    assert.equal(normalizeAnswer("10"), "10");
  });
});

describe("规则老师", () => {
  it("提供全部中文快捷操作", () => {
    assert.equal(TUTOR_ACTIONS.length, 9);
    for (const a of TUTOR_ACTIONS) assert.ok(/[\u4e00-\u9fa5]/.test(a.label));
  });
  it("没听懂会放慢并降低难度；不羞辱学生", () => {
    let st = initialTutor();
    const r1 = tutorRespond("confused", "fraction", 3, st); st = r1.state;
    assert.equal(st.speed, 0.75); assert.equal(st.level, 1);
    const r2 = tutorRespond("confused", "fraction", 3, st);
    assert.equal(r2.state.speed, 0.5);
    for (const t of [r1.text, r2.text]) assert.ok(!/笨|蠢|怎么又|太差/.test(t));
  });
  it("再难一点/简单一点在 1—3 之间调整", () => {
    let st = initialTutor();
    for (let i = 0; i < 5; i++) st = tutorRespond("harder", "circle", 6, st).state;
    assert.equal(st.level, 3);
    for (let i = 0; i < 5; i++) st = tutorRespond("easier", "circle", 6, st).state;
    assert.equal(st.level, 1);
  });
  it("自适应难度", () => {
    assert.equal(adaptLevel(2, [true, true]), 3);
    assert.equal(adaptLevel(2, [false, false]), 1);
    assert.equal(adaptLevel(2, [true, false]), 2);
  });
});

describe("课程目录与年级适配", () => {
  it("人教版数学覆盖 1—6 年级上下册", () => {
    for (const g of GRADES) for (const t of ["上", "下"] as const) assert.ok(unitsOf(PEP_MATH, g, t).length >= 6, `${g}${t}`);
  });
  it("目录里的演示都在正常年级范围内", () => {
    for (const e of EDITIONS) for (const [key, units] of Object.entries(e.catalog)) {
      const g = Number(key[0]) as Grade;
      for (const u of units ?? []) for (const d of u.demos ?? []) assert.ok(DEMOS[d].grades.includes(g), `${e.name} ${key} ${u.title} → ${d}`);
    }
  });
  it("每个演示至少挂在一个教材单元下", () => {
    const used = new Set(EDITIONS.flatMap((e) => Object.values(e.catalog).flatMap((us) => (us ?? []).flatMap((u) => u.demos ?? []))));
    for (const d of DEMO_LIST) assert.ok(used.has(d.id), d.id);
  });
  it("未录入的版本不借用其他版本目录", () => {
    for (const e of editionsFor("math").filter((x) => !x.ready)) assert.equal(Object.keys(e.catalog).length, 0);
  });
  it("按年级调整表达", () => {
    assert.equal(bandOf(1), "low"); assert.equal(bandOf(4), "mid"); assert.equal(bandOf(6), "high");
    assert.equal(gradeStyle(1).showFormula, false);
    const text = "把一个圆平均切成很多份，再把这些小扇形一正一反地拼起来，就得到一个近似的长方形。";
    for (const part of splitForGrade(text, 1)) assert.ok(part.length <= gradeStyle(1).maxSentence + 12);
    assert.ok(splitForGrade(text, 1).length > splitForGrade(text, 6).length);
    assert.ok(stepDurationMs("一二三四五六七八九十一二三四五", 1) > stepDurationMs("一二三四五六七八九十一二三四五", 6));
  });
});
