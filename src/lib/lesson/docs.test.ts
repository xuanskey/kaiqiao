/** 文档与代码一致：演示数量、模块数量、版本号、使用指南序号、导航标签。防止文档里的数字再次和实际功能脱节。 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DEMO_LIST } from "./demos.ts";
import { CHAPTERS } from "../math/chapters.ts";
import { LEARNING_UNITS } from "../math/units.ts";

const read = (p: string) => readFileSync(new URL(`../../../${p}`, import.meta.url), "utf8");
const readme = read("README.md"), changelog = read("CHANGELOG.md"), usage = read("USAGE.md"), notes = read("public/使用说明.txt"), pkg = JSON.parse(read("package.json"));
const math = DEMO_LIST.filter((d) => d.subject === "math").length, science = DEMO_LIST.filter((d) => d.subject === "science").length;

describe("文档与实际功能一致", () => {
  it("数学演示、科学实验、出题模块、知识单元的数量", () => {
    assert.ok(readme.includes(`${math} 个数学演示、${science} 个科学实验`), "README 开头");
    assert.ok(readme.includes(`${CHAPTERS.length} 个出题模块、${LEARNING_UNITS.length} 个三年级原创知识单元`));
    assert.ok(usage.includes(`${math} 个数学演示和 ${science} 个科学实验`), "USAGE");
    assert.ok(notes.includes(`${math} 个数学演示和 ${science} 个科学实验`), "使用说明.txt");
  });
  it("版本号一致", () => {
    assert.ok(usage.startsWith(`# 开窍 v${pkg.version} 使用指南`));
    assert.ok(notes.startsWith(`开窍 v${pkg.version}`));
    assert.ok(readme.includes(`当前版本：**v${pkg.version}**`), "README 当前版本");
    assert.ok(changelog.includes(`## v${pkg.version} `), "CHANGELOG 有当前版本条目");
  });
  it("使用指南“互动课堂”的序号连续", () => {
    const section = usage.split("## 互动课堂")[1].split("\n## ")[0];
    const nums = [...section.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
    assert.deepEqual(nums, nums.map((_, i) => i + 1));
  });
  it("导航 5 个标签与说明一致", () => {
    const shell = read("src/components/math/shell.tsx");
    const labels = [...shell.split("const NAV")[1].split("];")[0].matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(labels, ["首页", "课堂", "题库", "错题本", "学情"]);
    for (const doc of [readme, usage, notes]) assert.ok(doc.includes(`${labels.length} 个标签：${labels.join("、")}`));
  });
});
