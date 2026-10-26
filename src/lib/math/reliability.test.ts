import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHAPTERS } from "./chapters.ts";
import { makeDailySet, makeQuestion, makeReviewSet } from "./generate.ts";
import { isCorrect } from "./grade.ts";
import { currentStreak, isLevelUnlocked, nextCampaign, unlockedChapterIds } from "./progress.ts";
import { mulberry32 } from "./rng.ts";
import { activityForBackup } from "../activity.ts";
import { classLogForBackup } from "../lesson/class-log.ts";
import { todayStamp } from "./progress.ts";
import { emptyPersist, exportBackup, importBackup, parseSave, readBackup } from "./save.ts";
import type { Grade } from "./types.ts";

describe("出题回归", () => {
  it("所有模块的固定种子题中，选择题仅有一个可判对选项", () => {
    const rng = mulberry32(1013);
    for (const chapter of CHAPTERS) for (let level = 1; level <= 8; level++) {
      for (let i = 0; i < 100; i++) {
        const q = makeQuestion(chapter.id, level, rng);
        assert.ok(isCorrect(q, q.answer), q.prompt);
        if (q.mode !== "choice") continue;
        assert.ok(q.choices && q.choices.length >= 2, q.prompt);
        assert.equal(q.choices.filter((c) => isCorrect(q, c)).length, 1, JSON.stringify(q));
        assert.equal(new Set(q.choices).size, q.choices.length);
      }
    }
  });
  it("百分数的等值小数不会成为干扰项", () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = makeQuestion("g5pct", 2, mulberry32(seed));
      const percent = Number(q.prompt.match(/^(\d+)%/)![1]);
      assert.equal(Number(q.answer), percent / 100);
      assert.equal(q.choices!.filter((c) => Number(c) === percent / 100).length, 1);
    }
  });
  it("约分题确实可约分，答案最简且等值", () => {
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    const rng = mulberry32(20);
    for (let i = 0; i < 100; i++) {
      const q = makeQuestion("g5frac", 6, rng);
      const [, a, b] = q.prompt.match(/(\d+)\/(\d+)/)!;
      const [c, d] = q.answer.split("/").map(Number);
      assert.ok(gcd(Number(a), Number(b)) > 1);
      assert.equal(gcd(c, d), 1);
      assert.equal(Number(a) * d, Number(b) * c);
    }
  });
  it("所有年级每日题和回炉补题保持在本年级", () => {
    for (const grade of [1, 2, 3, 4, 5, 6] as Grade[]) {
      const ids = unlockedChapterIds({}, grade);
      const q = makeQuestion(ids[0], 1, mulberry32(grade));
      const wrong = [{ ...q, at: 1, given: "错" }];
      for (const question of [...makeDailySet(ids, wrong, 10, mulberry32(grade)), ...makeReviewSet(wrong, mulberry32(grade))]) {
        assert.equal(CHAPTERS.find((c) => c.id === question.chapterId)?.grade, grade);
      }
      assert.ok(ids.includes(nextCampaign({}, grade).chapterId));
    }
  });
  it("未知章节和越界关卡不能解锁", () => {
    assert.equal(isLevelUnlocked({}, "missing", 1), false);
    assert.equal(isLevelUnlocked({}, "warmup", 0), false);
    assert.equal(isLevelUnlocked({}, "warmup", 9), false);
  });
  it("断签不显示旧的连续天数", () => {
    assert.equal(currentStreak(7, "2026-10-10", "2026-10-12"), 0);
    assert.equal(currentStreak(7, "2026-10-11", "2026-10-12"), 7);
  });
});

describe("存档迁移与备份", () => {
  it("v2 旧存档保留已有进度并补齐新字段", () => {
    const { selectedGrade: _g, dailyByGrade: _d, ...old } = emptyPersist();
    const result = parseSave({ ...old, version: 2, stars: { "warmup:1": 3 }, stats: { answered: 9, correct: 7 } });
    assert.equal(result.selectedGrade, 3);
    assert.equal(result.version, 4);
    assert.equal(result.stars["warmup:1"], 3);
    assert.equal(result.stats.correct, 7);
  });
  it("含错题、年级、技能数据的备份完整往返", () => {
    const q = makeQuestion("g5pct", 1, mulberry32(1));
    const data = { ...emptyPersist(), selectedGrade: 5 as const, wrong: [{ ...q, at: 1, given: "0" }], dailyByGrade: { "5": "2026-10-12" }, skillStats: { pct: { seen: 4, correct: 2, sumMs: 2400.5 } } };
    assert.deepEqual(importBackup(exportBackup(data)), parseSave(data));
  });
  it("拒绝损坏、未来版本、异常计数和非开窍文件", () => {
    for (const patch of [{ version: 99 }, { stats: { answered: 2, correct: 3 } }, { wrong: null }, { stars: { "warmup:1": 99 } }, { selectedGrade: 9 }, { lastPlayDate: "2026-02-30" }, { skillStats: { add: { seen: 1, correct: 1, sumMs: -1 } } }]) {
      assert.throws(() => parseSave({ ...emptyPersist(), ...patch }));
    }
    assert.throws(() => importBackup("{"));
    assert.throws(() => importBackup('{"app":"other","format":1}'));
    assert.throws(() => importBackup("x".repeat(1_000_001)));
  });
  it("新备份带上课堂记录和每日题数，旧备份不包含这两项", () => {
    const data = { ...emptyPersist(), selectedGrade: 2 as const, xp: 12 };
    const today = todayStamp();
    const extras = {
      classLog: classLogForBackup({ "make-ten": { attempts: 4, correct: 3, lastAt: 5 }, "future-demo": { attempts: 2, correct: 2, lastAt: 6 }, "坏键": { attempts: 1, correct: 1, lastAt: 1 } }),
      activity: activityForBackup({ [today]: { n: 3, ok: 2 }, "2000-01-01": { n: 9, ok: 9 }, "2999-01-01": { n: 1, ok: 1 } }, today),
    };
    const bundle = readBackup(exportBackup(data, extras));
    assert.equal(bundle.data.xp, 12);
    assert.deepEqual(bundle.extras?.classLog["make-ten"], { attempts: 4, correct: 3, lastAt: 5 });
    assert.deepEqual(bundle.extras?.classLog["future-demo"], { attempts: 2, correct: 2, lastAt: 6 });
    assert.equal(bundle.extras?.classLog["坏键"], undefined);
    assert.deepEqual(bundle.extras?.activity, { [today]: { n: 3, ok: 2 } });
    const legacy = readBackup(JSON.stringify({ app: "kaiqiao", format: 1, data }));
    assert.equal(legacy.extras, null);
    assert.equal(legacy.data.xp, 12);
    assert.throws(() => readBackup(JSON.stringify({ app: "kaiqiao", format: 1, data, extras: { classLog: {} } })));
    assert.throws(() => readBackup(JSON.stringify({ app: "kaiqiao", format: 1, data, extras: { classLog: {}, activity: [] } })));
  });
});
