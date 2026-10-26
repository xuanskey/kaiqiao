import assert from "node:assert/strict";
import { it } from "node:test";
import { makeLevelSet, makeQuestion, makeSimilar, PROMPT_COOLDOWN } from "./generate.ts";
import { mulberry32, type Rng } from "./rng.ts";
import { emptyPersist, exportBackup, importBackup, parseSave } from "./save.ts";
import { attemptSummary } from "./skills.ts";

it("同章节连续组卷共享最近 12 题冷却", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = mulberry32(seed);
    const qs = [...makeLevelSet("warmup", 3, 40, rng), ...makeLevelSet("warmup", 3, 40, rng)];
    qs.forEach((q, i) => assert.ok(!qs.slice(Math.max(0, i - PROMPT_COOLDOWN), i).some(p => p.prompt === q.prompt)));
  }
});
it("同类加练避开原题与已有题", () => {
  const rng = mulberry32(31);
  const qs = makeLevelSet("warmup", 3, 12, rng);
  const q = makeSimilar(qs[11], rng, qs);
  assert.equal(q.skill, qs[11].skill);
  assert.ok(!qs.some(p => p.prompt === q.prompt));
});
it("固定随机源或极小题池达到上限后允许重复并终止", () => {
  const rng: Rng = { int: min => min, chance: () => true, pick: xs => xs[0]!, shuffle: xs => [...xs] };
  const a = makeQuestion("dir", 4, rng);
  assert.equal(makeQuestion("dir", 4, rng).prompt, a.prompt);
});
it("旧统计不倒推首答或巩固，新计数可备份且拒绝非法计数", () => {
  const old = { ...emptyPersist(), skillStats: { add: { seen: 10, correct: 7, sumMs: 1000 } } };
  const stat = parseSave(old).skillStats.add;
  assert.equal(stat.firstSeen, 0); assert.equal(stat.retrySeen, 0);
  assert.match(attemptSummary(stat), /首答正确率 暂无.*巩固正确率 暂无/);
  const data = { ...old, skillStats: { add: { ...stat, firstSeen: 2, firstCorrect: 1, retrySeen: 1, retryCorrect: 1 } } };
  assert.deepEqual(importBackup(exportBackup(data)), data);
  assert.throws(() => parseSave({ ...old, skillStats: { add: { ...stat, firstSeen: 1, firstCorrect: 2 } } }));
});
