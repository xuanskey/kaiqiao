/**
 * v0.13 数据保护回归：旧版本存档升级、损坏/异常数据容错读取、写入前另存原始数据。
 * 原则：页面不能崩溃；任何情况下都不能把用户原有的数据直接覆盖丢弃。
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { useMath } from "./math.ts";
import { SAVE_KEY, SAVE_VERSION, UNREADABLE_KEY, emptyPersist, exportBackup, importBackup, parseSave, readBackup, salvageSave } from "../lib/math/save.ts";
import { CLASS_LOG_KEY, loadClassLog, recordAnswer } from "../lib/lesson/class-log.ts";
import { ACTIVITY_KEY, loadActivity, recordActivity } from "../lib/activity.ts";
import { todayStamp } from "../lib/math/progress.ts";
import { AI_STORAGE_KEY, loadAiConfig } from "../lib/lesson/ai.ts";

type Store = Map<string, string>;
let storage: Store;
let failWrites: (key: string) => boolean;
function kv(map: Store) {
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { if (failWrites(k)) throw new Error("QuotaExceededError"); map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
}
beforeEach(() => {
  storage = new Map();
  failWrites = () => false;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: kv(storage) });
  useMath.setState({ ...useMath.getInitialState(), ...emptyPersist() }, true);
});
const state = () => useMath.getState();

/** v0.2 时代（SAVE_VERSION 2）真实写入的存档形状：没有 selectedGrade、dailyByGrade、unitStats。 */
const v2Save = {
  version: 2, stars: { "warmup:1": 3, "warmup:2": 2 }, xp: 150, streak: 4, lastPlayDate: "2026-09-20", lastDaily: "2026-09-20",
  wrong: [{ prompt: "37 + 48 = ?", answer: "85", explain: "个位 7 + 8 = 15，向十位进 1。", chapterId: "warmup", given: "75", at: 1758300000000, mode: "keypad", keypad: "int" }],
  stats: { answered: 37, correct: 30 }, muted: false, skillStats: {}, sprintBest: 12,
};
/** v0.3 – v0.5（SAVE_VERSION 3）：多了年级和分年级每日记录。 */
const v3Save = { ...v2Save, version: 3, selectedGrade: 4, dailyByGrade: { "3": "2026-09-20", "4": "2026-09-21" } };

describe("旧版本存档升级", () => {
  for (const [name, save] of [["v2", v2Save], ["v3", v3Save]] as const) it(`${name} 存档打开后数据不丢，保存时升级为 v${SAVE_VERSION}`, () => {
    storage.set(SAVE_KEY, JSON.stringify(save));
    state().hydrate();
    assert.equal(state().storageBlocked, false); assert.equal(state().storageError, null); assert.equal(state().storageNotice, null);
    assert.equal(state().stats.answered, 37); assert.equal(state().xp, 150); assert.equal(state().wrong.length, 1); assert.equal(state().stars["warmup:2"], 2);
    state().persist();
    const saved = JSON.parse(storage.get(SAVE_KEY)!);
    assert.equal(saved.version, SAVE_VERSION);
    assert.deepEqual(saved.stats, { answered: 37, correct: 30 }); assert.equal(saved.wrong[0].prompt, "37 + 48 = ?"); assert.equal(saved.sprintBest, 12);
    if (name === "v3") { assert.equal(saved.selectedGrade, 4); assert.deepEqual(saved.dailyByGrade, v3Save.dailyByGrade); }
    assert.equal(storage.has(UNREADABLE_KEY), false, "正常存档不需要另存副本");
  });
  it("旧版导出的备份文件（v2、v3 数据）能导入", () => {
    for (const save of [v2Save, v3Save]) {
      const data = importBackup(JSON.stringify({ app: "kaiqiao", format: 1, exportedAt: "2026-09-21T00:00:00.000Z", data: save }));
      assert.equal(data.stats.answered, 37); assert.equal(data.version, SAVE_VERSION);
      assert.deepEqual(importBackup(exportBackup(data)), data);
    }
  });
});

describe("损坏或异常的存档", () => {
  it("非法 JSON：不崩溃、只读保护；继续练习也不覆盖原存档", () => {
    storage.set(SAVE_KEY, "{\"version\":4, \"xp\": 1");
    assert.doesNotThrow(() => state().hydrate());
    assert.equal(state().storageBlocked, true);
    assert.match(state().storageError ?? "", /保护原数据/);
    state().startDaily();
    const s = state().session!; state().submit(s.questions[0].answer); state().persist();
    assert.equal(storage.get(SAVE_KEY), "{\"version\":4, \"xp\": 1");
  });
  for (const raw of ["null", "42", "\"文本\"", "[1,2,3]", JSON.stringify({ ...v3Save, version: 99 })]) it(`不是存档对象或来自更新版本（${raw.slice(0, 20)}）：只读保护`, () => {
    storage.set(SAVE_KEY, raw);
    assert.doesNotThrow(() => state().hydrate());
    assert.equal(state().storageBlocked, true);
    state().persist();
    assert.equal(storage.get(SAVE_KEY), raw);
  });
  it("个别记录损坏：保留能识别的部分，原始存档另存一份，之后正常保存", () => {
    const broken = { ...v3Save, version: 4, xp: "很多", stars: { "warmup:1": 3, "nope:1": 2, "warmup:9": 1 },
      wrong: [...v3Save.wrong, { prompt: "", answer: 1 }, null, { ...v3Save.wrong[0], chapterId: "已删除的章节" }],
      skillStats: { add: { seen: 2, correct: 5, sumMs: 1 } }, unitStats: "坏了", dailyByGrade: { "3": "2026-13-40", "4": "2026-09-21" } };
    const raw = JSON.stringify(broken);
    storage.set(SAVE_KEY, raw);
    state().hydrate();
    assert.equal(state().storageBlocked, false);
    assert.match(state().storageNotice ?? "", /无法识别/);
    assert.equal(storage.get(UNREADABLE_KEY), raw, "原始存档另存");
    assert.equal(state().stats.answered, 37); assert.equal(state().xp, 0); assert.deepEqual(state().stars, { "warmup:1": 3 });
    assert.equal(state().wrong.length, 1); assert.equal(state().selectedGrade, 4); assert.deepEqual(state().dailyByGrade, { "4": "2026-09-21" });
    state().persist();
    assert.doesNotThrow(() => parseSave(JSON.parse(storage.get(SAVE_KEY)!)));
    assert.equal(storage.get(UNREADABLE_KEY), raw, "写回后副本仍在");
    // 再次打开不会再提示，也不会重复另存
    state().hydrate();
    assert.equal(state().storageNotice, null); assert.equal([...storage.keys()].filter((k) => k.startsWith(UNREADABLE_KEY)).length, 1);
  });
  it("另存副本失败（存储已满）时不使用容错数据，保持只读保护", () => {
    const raw = JSON.stringify({ ...v3Save, version: 4, xp: -1 });
    storage.set(SAVE_KEY, raw);
    failWrites = (k) => k.startsWith(UNREADABLE_KEY);
    state().hydrate();
    assert.equal(state().storageBlocked, true);
    failWrites = () => false;
    state().persist();
    assert.equal(storage.get(SAVE_KEY), raw);
  });
  it("已有另一份副本时用新键另存，不覆盖旧副本", () => {
    storage.set(UNREADABLE_KEY, "更早的副本");
    const raw = JSON.stringify({ ...v3Save, version: 4, streak: "x" });
    storage.set(SAVE_KEY, raw);
    state().hydrate();
    assert.equal(storage.get(UNREADABLE_KEY), "更早的副本");
    assert.ok([...storage.entries()].some(([k, v]) => k.startsWith(`${UNREADABLE_KEY}-`) && v === raw));
  });
  it("浏览器禁止读取存储时不崩溃", () => {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); } } });
    assert.doesNotThrow(() => state().hydrate());
    assert.equal(state().storageBlocked, true);
    assert.doesNotThrow(() => state().persist());
  });
  it("salvageSave 对各种类型错误都不抛异常", () => {
    for (const v of [{}, { version: "4" }, { stats: null, stars: [], wrong: {}, skillStats: 3 }, { wrong: Array(60).fill(v2Save.wrong[0]) }]) {
      const r = salvageSave(v);
      assert.ok(r === null || r.data.wrong.length <= 40);
    }
    assert.equal(salvageSave({ wrong: Array(60).fill(v2Save.wrong[0]) })!.data.wrong.length, 40);
  });
});

describe("课堂记录、一周记录、AI 设置的容错", () => {
  it("课堂记录：各种坏数据都能读，写入时保留不认识的键", () => {
    const store = kv(storage);
    for (const raw of ["null", "[]", "1", "{\"make-ten\":null,\"bar-chart\":[1],\"poly-area\":{\"attempts\":\"3\"}}"]) { storage.set(CLASS_LOG_KEY, raw); assert.deepEqual(loadClassLog(store), {}); }
    storage.set(CLASS_LOG_KEY, JSON.stringify({ "make-ten": { attempts: 3, correct: 2, lastAt: 1 }, "future-demo": { attempts: 9, correct: 9, lastAt: 2 } }));
    recordAnswer(store, "make-ten", true, 5);
    const saved = JSON.parse(storage.get(CLASS_LOG_KEY)!);
    assert.deepEqual(saved["make-ten"], { attempts: 4, correct: 3, lastAt: 5 });
    assert.deepEqual(saved["future-demo"], { attempts: 9, correct: 9, lastAt: 2 }, "新版本或其他课的记录不能被删掉");
  });
  it("课堂记录：原始内容不是合法 JSON 时先另存再记录", () => {
    const store = kv(storage);
    storage.set(CLASS_LOG_KEY, "{坏了");
    recordAnswer(store, "fraction-mul", false, 7);
    assert.equal(storage.get(`${CLASS_LOG_KEY}.unreadable`), "{坏了");
    assert.deepEqual(loadClassLog(store), { "fraction-mul": { attempts: 1, correct: 0, lastAt: 7 } });
    // 另存失败时不覆盖
    storage.set(CLASS_LOG_KEY, "[坏了2");
    failWrites = (k) => k.includes(".unreadable");
    recordAnswer(store, "fraction-mul", true, 8);
    assert.equal(storage.get(CLASS_LOG_KEY), "[坏了2");
  });
  it("一周记录：坏数据可读；不是合法 JSON 时先另存再记录", () => {
    const store = kv(storage);
    for (const raw of ["null", "[]", "\"x\"", "{\"2026-10-20\":{\"n\":\"5\"},\"bad\":1}"]) { storage.set(ACTIVITY_KEY, raw); assert.deepEqual(loadActivity(store), {}); }
    storage.set(ACTIVITY_KEY, "{坏");
    recordActivity(store, true, new Date(2026, 9, 21));
    assert.equal(storage.get(`${ACTIVITY_KEY}.unreadable`), "{坏");
    assert.deepEqual(loadActivity(store), { "2026-10-21": { n: 1, ok: 1 } });
  });
  it("恢复新备份会替换课堂记录和每日题数；写入失败时全部回滚", () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...emptyPersist(), xp: 40 }));
    storage.set(CLASS_LOG_KEY, JSON.stringify({ "make-ten": { attempts: 2, correct: 1, lastAt: 1 } }));
    storage.set(ACTIVITY_KEY, JSON.stringify({ "2026-10-20": { n: 4, ok: 3 } }));
    const today = todayStamp();
    const file = exportBackup({ ...emptyPersist(), xp: 80, selectedGrade: 5 }, { classLog: { "fraction-mul": { attempts: 3, correct: 3, lastAt: 9 } }, activity: { [today]: { n: 1, ok: 1 }, "2000-01-01": { n: 8, ok: 8 } } });
    const bundle = readBackup(file);
    assert.equal(state().restore(bundle.data, bundle.extras), true);
    assert.equal(state().xp, 80);
    assert.equal(JSON.parse(storage.get(CLASS_LOG_KEY)!)["fraction-mul"].attempts, 3);
    assert.equal(JSON.parse(storage.get(CLASS_LOG_KEY)!)["make-ten"], undefined);
    assert.deepEqual(JSON.parse(storage.get(ACTIVITY_KEY)!), { [today]: { n: 1, ok: 1 } });
    assert.equal(state().restore(importBackup(JSON.stringify({ app: "kaiqiao", format: 1, data: { ...emptyPersist(), xp: 15 } }))), true);
    assert.equal(JSON.parse(storage.get(CLASS_LOG_KEY)! )["fraction-mul"].attempts, 3, "旧备份不清除课堂记录");
    const before = storage.get(SAVE_KEY);
    const beforeLog = storage.get(CLASS_LOG_KEY);
    failWrites = (k) => k === CLASS_LOG_KEY;
    const again = readBackup(file);
    assert.equal(state().restore(again.data, again.extras), false);
    assert.equal(storage.get(SAVE_KEY), before);
    assert.equal(storage.get(CLASS_LOG_KEY), beforeLog);
    assert.equal(state().xp, 15);
  });
  it("AI 设置：坏数据回到默认值", () => {
    const store = kv(storage);
    for (const raw of ["null", "[]", "{坏", "{\"enabled\":\"yes\",\"apiKey\":5}"]) { storage.set(AI_STORAGE_KEY, raw); assert.equal(loadAiConfig(store).enabled, false); }
  });
});
