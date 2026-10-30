import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeText, computeExpr } from "./importer.ts";
import { askAi, buildMessages, loadAiConfig, sanitizeReply, saveAiConfig, validBaseUrl, DEFAULT_AI } from "./ai.ts";
import { clearClassLog, loadClassLog, masteryOf, recordAnswer, CLASS_LOG_KEY } from "./class-log.ts";
import { PEP_MATH, PEP_MATH_2012, resolveUnits, unitsOf } from "./curriculum.ts";
import { defaultParams, DEMOS, lessonScript } from "./demos.ts";

function memStore() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; }

describe("2026 秋人教版新教材目录", () => {
  it("六上：去掉比、扇形统计图、数与形，加入确定位置、生活中的负数、鸽巢问题", () => {
    const titles = unitsOf(PEP_MATH, 6, "上").map((u) => u.title).join("|");
    for (const t of ["确定位置", "生活中的负数", "鸽巢问题", "圆", "百分数"]) assert.ok(titles.includes(t), t);
    for (const t of ["比", "扇形统计图", "数与形"]) assert.ok(!unitsOf(PEP_MATH, 6, "上").some((u) => u.title.replace(/^[一二三四五六七八九十☆]+\s/, "") === t || u.title.includes(t === "比" ? "　比" : t)), t);
  });
  it("五上：没有解方程，改为用字母表示数和数量关系；位置单元已移出", () => {
    const titles = unitsOf(PEP_MATH, 5, "上").map((u) => u.title).join("|");
    assert.ok(titles.includes("用字母表示数和数量关系"));
    assert.ok(!/简易方程|解方程/.test(titles));
    assert.ok(!titles.includes("位置"));
    for (const t of ["观察简单组合体", "图形的运动", "有趣的密铺", "可能性"]) assert.ok(titles.includes(t), t);
    assert.ok(DEMOS.balance.title.includes("等式"), "天平演示改为等式的性质");
    assert.ok(lessonScript("balance", defaultParams("balance"), 5).some((s) => s.say.includes("初中")), "说明解方程到初中学");
  });
  it("四上：新单元加法模型和乘法模型、寻找宝藏；不再有公顷、除数是两位数的除法、优化", () => {
    const titles = unitsOf(PEP_MATH, 4, "上").map((u) => u.title).join("|");
    for (const t of ["万以上数的认识", "角的度量", "多位数乘两位数", "加法模型和乘法模型", "平行四边形和梯形", "条形统计图", "寻找宝藏"]) assert.ok(titles.includes(t), t);
    for (const t of ["公顷", "除数是两位数", "优化"]) assert.ok(!titles.includes(t), t);
  });
  it("新版四、五、六年级下册尚未出版：明确标注沿用旧版", () => {
    for (const g of [4, 5, 6] as const) {
      const r = resolveUnits(PEP_MATH, g, "下");
      assert.ok(r.units.length > 0 && r.fallbackNote && r.from.id === PEP_MATH_2012.id);
    }
    const r = resolveUnits(PEP_MATH, 3, "下");
    assert.equal(r.fallbackNote, undefined);
    assert.equal(r.from.id, PEP_MATH.id);
  });
});

describe("文本资料导入", () => {
  it("算式自动计算并核对，保留原文行号", () => {
    const r = analyzeText("# 第一单元 小数乘法\n\n1.2×0.5=\n7+8=？\n23÷4=\n0.3+0.6=", 5);
    const exprs = r.items.filter((i) => i.kind === "expression");
    assert.deepEqual(exprs.map((e) => [e.line, e.answer]), [[3, "0.6"], [4, "15"], [5, "5……3"], [6, "0.9"]]);
    assert.equal(r.items[0].kind, "heading");
  });
  it("精确计算", () => {
    assert.equal(computeExpr("0.1", "+", "0.2")?.answer, "0.3");
    assert.equal(computeExpr("2.5", "×", "0.4")?.answer, "1");
    assert.equal(computeExpr("8", "÷", "0")?.answer, "除数不能为 0");
    assert.equal(computeExpr("10", "−", "3")?.answer, "7");
  });
  it("超出年级和超出小学的内容会被标出", () => {
    const r = analyzeText("解方程：3x+4=19，求 x。\n求函数 y=x² 的导数。\n一件衣服打八折，现价多少？", 5);
    assert.equal(r.items[0].status, "above-grade");
    assert.ok(r.items[0].reason?.includes("初中"));
    assert.equal(r.items[1].status, "beyond-primary");
    assert.equal(r.items[2].status, "above-grade");
    assert.equal(analyzeText("一件衣服打八折，现价多少？", 6).items[0].status, "ok");
  });
  it("识别不清的数字需要家长确认，不直接给答案", () => {
    const r = analyzeText("1O+5=\n(3+2=", 2);
    for (const it of r.items) { assert.equal(it.status, "needs-confirm"); assert.equal(it.answer, undefined); }
  });
  it("推荐的互动课不超过所选年级；HTML 和脚本只当文字", () => {
    const r = analyzeText("圆的面积怎么算？\n<script>alert(1)</script>分数是什么？", 3);
    assert.equal(r.items[0].demo, undefined, "三年级不推荐六年级的圆");
    assert.equal(r.items[1].demo, "fraction");
    assert.ok(!JSON.stringify(r).includes("alert(1)") || r.items[1].source.includes("<script>"), "原文保留用于核对");
  });
});

describe("可选 AI 老师（自备密钥）", () => {
  const ctx = { grade: 1 as const, demo: "add-sub" as const, params: defaultParams("add-sub"), facts: ["3 + 2 = 5"], studentAsk: "我没听懂" };
  it("提示词包含年级要求、课堂事实，并禁止批评和代码", () => {
    const m = buildMessages(ctx);
    assert.ok(m[0].content.includes("1 年级") && m[0].content.includes("不要出现公式") && m[0].content.includes("绝不批评") && m[0].content.includes("纯文本"));
    assert.ok(m[1].content.includes("3 + 2 = 5"));
    assert.ok(buildMessages({ ...ctx, grade: 6, demo: "circle", params: defaultParams("circle") })[0].content.includes("可以用公式"));
  });
  it("学生的话和错答在发给家长自备接口前先隐去个人信息", () => {
    const m = buildMessages({ ...ctx, studentAsk: "我叫王小明，妈妈电话13812345678，我在阳光小学", lastWrong: { prompt: "3 + 2 = ?", given: "13912345678" } } as Parameters<typeof buildMessages>[0]);
    const text = m.map((x) => x.content).join("\n");
    assert.ok(!/王小明|13812345678|13912345678|阳光小学/.test(text), text);
    assert.ok(text.includes("[电话]") && text.includes("3 + 2 = ?"));
    assert.ok(buildMessages({ ...ctx, studentAsk: "3 + 5 等于几" })[1].content.includes("3 + 5 等于几"), "正常问题原样保留");
  });
  it("回复清理成纯文本", () => {
    const t = sanitizeReply("<img src=x onerror=alert(1)>你好```js\nalert(2)\n```看 https://evil.example 吧**加油**");
    assert.ok(!/[<>]|alert|https?:|\*\*/.test(t));
    assert.ok(t.includes("你好") && t.includes("加油"));
    assert.equal(sanitizeReply(42), "");
  });
  it("只允许 https 地址；未开启时不发请求", async () => {
    assert.ok(validBaseUrl("https://api.deepseek.com"));
    assert.ok(!validBaseUrl("http://evil.example"));
    assert.ok(!validBaseUrl("javascript:alert(1)"));
    let called = false;
    const r = await askAi({ ...DEFAULT_AI }, ctx, (async () => { called = true; return new Response("{}"); }) as typeof fetch);
    assert.equal(r.ok, false); assert.equal(called, false);
  });
  it("使用模拟接口：成功、密钥错误、网络失败都有中文结果", async () => {
    const cfg = { enabled: true, baseUrl: "https://api.example.com/v1/", model: "m", apiKey: "k" };
    let seen: { url: string; auth: string | null; body: { messages: unknown[] } } | null = null;
    const ok = await askAi(cfg, ctx, (async (url: string, init: RequestInit) => {
      seen = { url, auth: new Headers(init.headers).get("Authorization"), body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ choices: [{ message: { content: "我们再数一遍：3 个加 2 个，一共 5 个。" } }] }), { status: 200 });
    }) as unknown as typeof fetch);
    assert.deepEqual(ok, { ok: true, text: "我们再数一遍：3 个加 2 个，一共 5 个。" });
    assert.equal(seen!.url, "https://api.example.com/v1/chat/completions");
    assert.equal(seen!.auth, "Bearer k");
    assert.equal(seen!.body.messages.length, 2);
    assert.ok(!("thinking" in seen!.body), "非 DeepSeek 接口不发 thinking 参数");
    const bad = await askAi(cfg, ctx, (async () => new Response("no", { status: 401 })) as typeof fetch);
    assert.deepEqual(bad, { ok: false, error: "密钥无效或没有权限" });
    const down = await askAi(cfg, ctx, (async () => { throw new TypeError("fail"); }) as typeof fetch);
    assert.deepEqual(down, { ok: false, error: "网络连接失败" });
  });
  it("DeepSeek 默认用现行模型名并显式关闭思考模式", async () => {
    assert.equal(DEFAULT_AI.model, "deepseek-flash");
    let body: Record<string, unknown> | null = null;
    const r = await askAi({ ...DEFAULT_AI, enabled: true, apiKey: "k" }, ctx, (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: "好" } }] }), { status: 200 });
    }) as unknown as typeof fetch);
    assert.equal(r.ok, true);
    assert.equal(body!.model, "deepseek-flash");
    assert.deepEqual(body!.thinking, { type: "disabled" });
  });
  it("旧配置里已停用的 DeepSeek 模型名读取时换成现行名，其他接口原样保留", () => {
    const s = memStore();
    for (const model of ["deepseek-chat", "deepseek-reasoner", " deepseek-chat "]) {
      s.setItem("kaiqiao-ai", JSON.stringify({ enabled: true, baseUrl: "https://api.deepseek.com/", model, apiKey: "k" }));
      assert.equal(loadAiConfig(s).model, "deepseek-flash");
    }
    s.setItem("kaiqiao-ai", JSON.stringify({ enabled: true, baseUrl: "https://api.deepseek.com", model: "deepseek-v4-pro", apiKey: "k" }));
    assert.equal(loadAiConfig(s).model, "deepseek-v4-pro");
    s.setItem("kaiqiao-ai", JSON.stringify({ enabled: true, baseUrl: "https://proxy.example.com/v1", model: "deepseek-chat", apiKey: "k" }));
    assert.equal(loadAiConfig(s).model, "deepseek-chat");
  });
  it("配置只在开启或填写密钥后保存，关闭并清空后删除", () => {
    const s = memStore();
    saveAiConfig(s, { ...DEFAULT_AI });
    assert.equal(s.m.size, 0);
    saveAiConfig(s, { ...DEFAULT_AI, enabled: true, apiKey: "k" });
    assert.equal(loadAiConfig(s).apiKey, "k");
    saveAiConfig(s, { ...DEFAULT_AI });
    assert.equal(s.m.size, 0);
    s.setItem("kaiqiao-ai", "{bad json");
    assert.deepEqual(loadAiConfig(s), DEFAULT_AI);
  });
});

describe("课堂练习记录", () => {
  it("只记录次数，单独存放，可清除；损坏数据被忽略", () => {
    const s = memStore();
    recordAnswer(s, "circle", true, 1); recordAnswer(s, "circle", false, 2); recordAnswer(s, "circle", true, 3);
    const log = loadClassLog(s);
    assert.deepEqual(log.circle, { attempts: 3, correct: 2, lastAt: 3 });
    assert.equal(masteryOf(log.circle).label, "基本掌握");
    assert.equal(masteryOf({ attempts: 1, correct: 1 }).label, "再多做几题");
    assert.equal(masteryOf(undefined).label, "还没练习");
    s.setItem(CLASS_LOG_KEY, JSON.stringify({ circle: { attempts: 1, correct: 5 }, hack: { attempts: 1, correct: 1 } }));
    assert.deepEqual(loadClassLog(s), {});
    clearClassLog(s);
    assert.equal(s.getItem(CLASS_LOG_KEY), null);
  });
});
