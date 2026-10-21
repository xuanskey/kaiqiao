import assert from "node:assert/strict";
import { test } from "node:test";
import { askAi, createAiRequests, DEFAULT_AI } from "./ai.ts";
import { defaultParams } from "./demos.ts";

const cfg = { ...DEFAULT_AI, enabled: true, apiKey: "test-only-key" };
const ctx = { demo: "decimal-div" as const, grade: 5 as const, params: defaultParams("decimal-div"), facts: ["7.2 ÷ 0.4 = 18"], studentAsk: "为什么？" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("请求域同步失效：后到的旧回复无写回资格，新请求仍有效", () => {
  const requests = createAiRequests();
  const a = requests.begin();
  requests.cancel();
  assert.equal(a.signal.aborted, true);
  assert.equal(requests.isCurrent(a), false);
  const b = requests.begin();
  assert.equal(requests.isCurrent(b), true);
  const c = requests.begin();
  assert.equal(b.signal.aborted, true);
  assert.equal(requests.isCurrent(b), false);
  assert.equal(requests.isCurrent(c), true);
});

test("已取消的请求不调用 fetch", async () => {
  const ctrl = new AbortController();
  ctrl.abort();
  const result = await askAi(cfg, ctx, async () => { throw new Error("不应请求"); }, 20000, ctrl.signal);
  assert.deepEqual(result, { ok: false, error: "请求已取消", cancelled: true });
});

test("外部取消即使 fetch 忽略 abort 也能结束，迟到响应不能改变结果", async () => {
  const ctrl = new AbortController();
  const response = deferred<Response>();
  let transportSignal: AbortSignal | undefined;
  const pending = askAi(cfg, ctx, async (_url, init) => { transportSignal = init?.signal ?? undefined; return response.promise; }, 20000, ctrl.signal);
  ctrl.abort();
  const result = await pending;
  assert.equal(transportSignal?.aborted, true);
  assert.deepEqual(result, { ok: false, error: "请求已取消", cancelled: true });
  response.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "过期回复" } }] })));
  assert.deepEqual(await pending, result);
});

test("超时覆盖响应体等待，不依赖传输层响应取消", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const body = deferred<object>(), reading = deferred<void>();
  let signal: AbortSignal | undefined;
  const pending = askAi(cfg, ctx, async (_url, init) => {
    signal = init?.signal ?? undefined;
    const res = new Response("{}");
    res.json = async () => { reading.resolve(); return body.promise; };
    return res;
  }, 20000);
  await reading.promise;
  t.mock.timers.tick(20000);
  assert.deepEqual(await pending, { ok: false, error: "等待太久，已取消" });
  assert.equal(signal?.aborted, true);
  body.resolve({ choices: [{ message: { content: "迟到的响应体" } }] });
});

test("请求完成清理取消监听及超时器，不会随后中止已完成请求", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const ctrl = new AbortController();
  let signal: AbortSignal | undefined;
  const result = await askAi(cfg, ctx, async (_url, init) => {
    signal = init?.signal ?? undefined;
    return new Response(JSON.stringify({ choices: [{ message: { content: "新回答" } }] }));
  }, 20000, ctrl.signal);
  assert.deepEqual(result, { ok: true, text: "新回答" });
  ctrl.abort();
  t.mock.timers.tick(20000);
  assert.equal(signal?.aborted, false);
});
