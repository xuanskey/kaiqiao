import assert from "node:assert/strict";
import { test } from "node:test";
import { entryGrade } from "../lib/math/entry-grade.ts";
import { applyEntryGrade, useMath } from "./math.ts";
import { emptyPersist, SAVE_KEY } from "../lib/math/save.ts";

for (const value of ["1", "2", "3", "4", "5", "6", "0", "7", "abc", "", "1.5", "5e0"]) {
  test(`入口 grade=${value}`, () => {
    const valid = /^[1-6]$/.test(value);
    assert.equal(entryGrade(`?grade=${value}`), valid ? Number(value) : null);
    assert.equal(entryGrade("", `#/class?grade=${value}`), valid ? Number(value) : null);
  });
}
test("缺省与 query 优先级", () => {
  assert.equal(entryGrade(""), null);
  assert.equal(entryGrade("?grade=5", "#grade=6"), 5);
  assert.equal(entryGrade("?grade=abc", "#grade=6"), null);
});
test("URL 覆盖已存年级并持久化；非法/缺省保留存档；手动切换不被拉回", () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  for (const search of ["?grade=5", "?grade=0", "?grade=7", "?grade=abc", "?grade=", ""]) {
    storage.set(SAVE_KEY, JSON.stringify({ ...emptyPersist(), selectedGrade: 2 }));
    useMath.getState().hydrate();
    applyEntryGrade(search);
    assert.equal(useMath.getState().selectedGrade, search === "?grade=5" ? 5 : 2);
  }
  applyEntryGrade("?grade=5");
  assert.equal(JSON.parse(storage.get(SAVE_KEY)!).selectedGrade, 5);
  useMath.getState().setGrade(4);
  assert.equal(useMath.getState().selectedGrade, 4);
  storage.clear();
  useMath.getState().hydrate();
  applyEntryGrade("");
  assert.equal(useMath.getState().selectedGrade, 3);
});
