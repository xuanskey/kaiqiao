import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classSummary, dateLabel, dayIndex, greeting, todayPicks, requestLesson, peekLesson, clearLesson } from "./today.ts";
import { decodeXml, kindOf, pdfItemsToLines, slideOrder, slideXmlToText, tidyOcr, unsupportedReason } from "./file-extract.ts";
const GRADES = [1, 2, 3, 4, 5, 6] as const;

describe("首页今日板块", () => {
  it("问候语与日期", () => {
    assert.equal(greeting(7), "早上好"); assert.equal(greeting(15), "下午好"); assert.equal(greeting(21), "晚上好"); assert.equal(greeting(2), "夜深了");
    assert.equal(dateLabel(new Date(2026, 9, 20)), "10月20日 · 星期二");
  });
  it("每个年级每天都有一节数学课和一个科学实验，且年级适用", () => {
    for (const g of GRADES) for (let i = 0; i < 30; i++) {
      const d = new Date(2026, 9, 1 + i);
      const p = todayPicks(g, d);
      assert.ok(p.math && p.math.grades.includes(g), `数学 ${g}`);
      assert.ok(p.science && p.science.subject === "science", `科学 ${g}`);
    }
  });
  it("同一天推荐不变，第二天会换", () => {
    const a = todayPicks(6, new Date(2026, 9, 20, 8)), b = todayPicks(6, new Date(2026, 9, 20, 22));
    assert.equal(a.math!.id, b.math!.id);
    const ids = new Set(Array.from({ length: 7 }, (_, i) => todayPicks(6, new Date(2026, 9, 20 + i)).math!.id));
    assert.ok(ids.size > 1);
    assert.equal(dayIndex(new Date(2026, 9, 21)) - dayIndex(new Date(2026, 9, 20)), 1);
  });
  it("课堂记录汇总：今天是否上过课", () => {
    const now = new Date(2026, 9, 20, 20);
    const s = classSummary({ lever: { attempts: 3, correct: 2, lastAt: new Date(2026, 9, 20, 9).getTime() }, magnet: { attempts: 2, correct: 2, lastAt: new Date(2026, 9, 19).getTime() } }, now);
    assert.deepEqual([s.today, s.attempts, s.correct, s.lastDemo], [true, 5, 4, "lever"]);
    assert.equal(classSummary({ magnet: { attempts: 1, correct: 1, lastAt: new Date(2026, 9, 19).getTime() } }, now).today, false);
    assert.equal(classSummary({}, now).today, false);
  });
  it("首页跳转课堂的交接只在内存中，读后可清除", () => {
    requestLesson("plant", 4); assert.equal(peekLesson()?.demo, "plant"); clearLesson(); assert.equal(peekLesson(), null);
  });
});

describe("文件文字提取（纯函数部分）", () => {
  it("按扩展名识别文件类型，旧格式给出转换提示", () => {
    assert.equal(kindOf("a.PDF"), "pdf"); assert.equal(kindOf("b.docx"), "docx"); assert.equal(kindOf("c.pptx"), "pptx"); assert.equal(kindOf("d.jpg"), "image"); assert.equal(kindOf("x", "image/png"), "image"); assert.equal(kindOf("e.md"), "text");
    assert.equal(kindOf("f.doc"), null); assert.ok(unsupportedReason("f.doc").includes(".docx")); assert.ok(unsupportedReason("g.ppt").includes(".pptx"));
  });
  it("幻灯片 XML：段落成行、实体解码、不执行任何标签", () => {
    const xml = '<p:sld><a:p><a:r><a:t>小数</a:t></a:r><a:r><a:t>乘法</a:t></a:r></a:p><a:p><a:r><a:t xml:space="preserve">1.2×0.5=</a:t></a:r></a:p><a:p><a:r><a:t>&lt;script&gt; &amp; &#x4E00;</a:t></a:r></a:p></p:sld>';
    assert.equal(slideXmlToText(xml), "小数乘法\n1.2×0.5=\n<script> & 一");
    assert.equal(decodeXml("&quot;a&quot;&apos;"), "\"a\"'");
  });
  it("幻灯片按页码数字排序", () => {
    assert.deepEqual(slideOrder(["ppt/slides/slide10.xml", "ppt/slides/slide2.xml", "ppt/slides/_rels/slide1.xml.rels", "ppt/slides/slide1.xml"]), ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml", "ppt/slides/slide10.xml"]);
  });
  it("PDF 文本片段按行合并、行内按横坐标排序", () => {
    const lines = pdfItemsToLines([{ str: "0.5=", x: 60, y: 700 }, { str: "1.2×", x: 20, y: 701 }, { str: "下一行", x: 20, y: 680 }, { str: " ", x: 0, y: 650 }]);
    assert.deepEqual(lines, ["1.2×0.5=", "下一行"]);
  });
  it("OCR 结果去掉汉字间的空格", () => {
    assert.equal(tidyOcr("一 件 衣 服 打 八 折 ，\n\n\n\n12 + 3 ="), "一件衣服打八折，\n\n12 + 3 =");
  });
});
