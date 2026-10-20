import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEMOS, earth, friction, lever, lessonScript, plant, slope, sound } from "./demos.ts";
import { JK_SCIENCE, unitsOf } from "./curriculum.ts";
import { analyzeText } from "./importer.ts";

describe("v0.9 科学实验的计算", () => {
  it("杠杆：平衡条件与省力判断", () => {
    assert.deepEqual([lever({ load: 3, ld: 2, ed: 6 }).effort, lever({ load: 3, ld: 2, ed: 6 }).kind], ["1", "省力"]);
    assert.equal(lever({ load: 2, ld: 4, ed: 2 }).kind, "费力");
    assert.equal(lever({ load: 2, ld: 3, ed: 3 }).kind, "不省力也不费力");
    assert.equal(lever({ load: 5, ld: 3, ed: 4 }).effort, "3.8");
  });
  it("斜面：高度相同，越长越省力", () => {
    assert.equal(slope({ g: 6, h: 30, len: 90 }).force, "2");
    assert.ok(slope({ g: 6, h: 30, len: 150 }).forceNum < slope({ g: 6, h: 30, len: 60 }).forceNum);
  });
  it("声音：长度决定音高，力度决定强弱", () => {
    assert.equal(sound({ force: 2, len: 6 }).pitch, "高");
    assert.equal(sound({ force: 2, len: 18 }).pitch, "低");
    assert.ok(sound({ force: 4, len: 10 }).amp > sound({ force: 0, len: 10 }).amp);
    assert.equal(sound({ force: 4, len: 10 }).pitch, sound({ force: 0, len: 10 }).pitch, "力度不改变音高");
  });
  it("昼夜：春分前后 6—18 时为白天，正午太阳在南方", () => {
    assert.equal(earth({ hour: 5 }).day, false);
    assert.equal(earth({ hour: 6 }).day, true);
    assert.equal(earth({ hour: 12 }).dir, "南方");
    assert.equal(earth({ hour: 18 }).day, false);
    assert.equal(earth({ hour: 12 }).angle, 180, "正午时北京正对太阳");
  });
  it("摩擦力：越粗糙、越重越大，用整数计算没有浮点误差", () => {
    assert.equal(friction({ surf: 0, n: 2 }).force, "0.6");
    assert.equal(friction({ surf: 2, n: 4 }).force, "3.5");
    assert.ok(friction({ surf: 2, n: 1 }).tenths > friction({ surf: 1, n: 1 }).tenths);
  });
  it("绿豆：缺水、缺空气不发芽；暗处发黄", () => {
    assert.equal(plant({ water: 0, light: 1, day: 10 }).sprout, false);
    assert.equal(plant({ water: 2, light: 1, day: 10 }).reason, "缺空气");
    assert.equal(plant({ water: 1, light: 0, day: 8 }).leaf, "发黄");
    assert.equal(plant({ water: 1, light: 1, day: 8 }).leaf, "绿色");
    assert.ok(plant({ water: 1, light: 0, day: 8 }).mm > plant({ water: 1, light: 1, day: 8 }).mm, "暗处更细长");
  });
});

describe("v0.9 科学课程与资料", () => {
  it("每个新实验都有完整的实验记录卡和安全提醒", () => {
    for (const id of ["lever", "slope", "sound", "earth", "friction", "plant"] as const) {
      const e = DEMOS[id].experiment!;
      assert.ok(e.goal && e.tools.length && e.steps.length && e.observe && e.explain && e.safety && e.think && e.virtualNote, id);
    }
  });
  it("教科版科学目录收录新单元", () => {
    assert.ok(unitsOf(JK_SCIENCE, 6, "上").some((u) => u.demos?.includes("lever")));
    assert.ok(unitsOf(JK_SCIENCE, 4, "上").some((u) => u.demos?.includes("sound")));
    assert.ok(unitsOf(JK_SCIENCE, 4, "上").some((u) => u.demos?.includes("friction")));
  });
  it("参数变化后讲解里的数字随之更新", () => {
    const a = lessonScript("lever", { load: 3, ld: 2, ed: 6 }, 6).map((s) => s.say).join("");
    const b = lessonScript("lever", { load: 3, ld: 2, ed: 1 }, 6).map((s) => s.say).join("");
    assert.ok(a.includes("省力杠杆") && b.includes("费力杠杆"));
  });
  it("导入资料能识别新主题", () => {
    const r = analyzeText("杠杆的支点在哪里？\n摩擦力和什么有关？", 6);
    assert.ok(r.items.some((i) => i.demo === "lever") && r.items.some((i) => i.demo === "friction"));
  });
});
