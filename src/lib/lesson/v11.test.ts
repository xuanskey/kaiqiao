import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { barChart, lessonScript, makeTen, normalizeParams, polyArea } from "./demos.ts";
import { analyzeText } from "./importer.ts";
import { lastSevenDays, loadActivity, prune, recordActivity, weekSummary, ACTIVITY_KEY } from "../activity.ts";

describe("v0.11 新增数学演示", () => {
  it("凑十法：把第二个加数分成凑十的和剩下的", () => {
    for (let a = 5; a <= 9; a++) for (let b = 2; b <= 9; b++) {
      const r = makeTen({ a, b });
      assert.equal(r.sum, a + b);
      if (a + b > 10) { assert.equal(a + r.need, 10); assert.equal(r.need + r.rest, b); assert.equal(10 + r.rest, a + b); }
      else assert.equal(r.carry, false);
    }
    assert.ok(lessonScript("make-ten", { a: 9, b: 4 }, 1).some((s) => s.say.includes("10 加 3 等于 13")));
  });
  it("条形统计图：最多、最少、相差、合计，每格 2 票时格数减半", () => {
    const r = barChart({ c0: 8, c1: 5, c2: 10, c3: 3, unit: 0 });
    assert.deepEqual([r.maxName, r.minName, r.diff, r.total], ["橙子", "葡萄", 7, 26]);
    assert.deepEqual(barChart({ c0: 8, c1: 5, c2: 10, c3: 3, unit: 1 }).cells, [4, 2.5, 5, 1.5]);
    assert.equal(barChart({ c0: 6, c1: 6, c2: 1, c3: 2, unit: 0 }).maxName, "苹果、香蕉");
  });
  it("多边形面积：公式正确，.5 精确显示", () => {
    assert.equal(polyArea({ shape: 0, a: 8, b: 4, h: 5 }).area, "40");
    assert.equal(polyArea({ shape: 1, a: 7, b: 4, h: 5 }).area, "17.5");
    assert.equal(polyArea({ shape: 2, a: 8, b: 4, h: 5 }).area, "30");
    assert.equal(polyArea({ shape: 2, a: 9, b: 4, h: 3 }).area, "19.5");
    assert.equal(normalizeParams("poly-area", { shape: 2, a: 5, b: 9, h: 3 }).b, 4, "上底小于下底");
  });
  it("导入资料能匹配到新演示", () => {
    const r = analyzeText("梯形上底 4 厘米，下底 8 厘米，高 5 厘米，面积是多少？\n9+4 用凑十法怎么算？\n看条形统计图，苹果比葡萄多几票？", 5);
    const demos = r.items.map((x) => x.demo);
    assert.ok(demos.includes("poly-area")); assert.ok(demos.includes("make-ten")); assert.ok(demos.includes("bar-chart"));
  });
});

describe("最近 7 天学习记录", () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };
  it("按天累计题数和答对数，只保留 60 天", () => {
    const s = mem();
    recordActivity(s, true, new Date(2026, 9, 20, 9)); recordActivity(s, false, new Date(2026, 9, 20, 10)); recordActivity(s, true, new Date(2026, 9, 18));
    const a = loadActivity(s);
    assert.deepEqual(a["2026-10-20"], { n: 2, ok: 1 }); assert.deepEqual(a["2026-10-18"], { n: 1, ok: 1 });
    assert.deepEqual(Object.keys(prune({ "2026-08-01": { n: 1, ok: 1 }, "2026-10-20": { n: 1, ok: 0 } }, "2026-10-20")), ["2026-10-20"]);
    const w = weekSummary(a, new Date(2026, 9, 20, 20));
    assert.deepEqual([w.n, w.ok, w.activeDays, w.rate], [3, 2, 2, 67]);
    const days = lastSevenDays(a, new Date(2026, 9, 20));
    assert.equal(days.length, 7); assert.equal(days[6].label, "今天"); assert.equal(days[0].stamp, "2026-10-14"); assert.equal(days[0].label, "周三");
  });
  it("坏数据被忽略，不会让页面出错", () => {
    const s = mem(); s.setItem(ACTIVITY_KEY, '{"2026-10-20":{"n":1,"ok":5},"x":{"n":1,"ok":1},"2026-10-19":{"n":2,"ok":1}}');
    assert.deepEqual(loadActivity(s), { "2026-10-19": { n: 2, ok: 1 } });
    s.setItem(ACTIVITY_KEY, "not json"); assert.deepEqual(loadActivity(s), {});
  });
});
