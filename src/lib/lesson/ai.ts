import type { Grade } from "../math/types.ts";
import { bandOf, gradeStyle } from "./grade-style.ts";
import { DEMOS, type DemoId, type Params, displayParam } from "./demos.ts";
import { redactPII } from "../../../workers/help/pii.js";

/**
 * 可选的 AI 老师：家长自备 OpenAI 兼容接口（如 DeepSeek）的地址、模型和密钥。
 * 密钥只保存在本浏览器，只发送给家长填写的地址。
 * AI 的回复只当作纯文本显示：去掉 HTML、代码块和链接，限制长度，绝不执行。
 * 课堂里的数字由程序计算后作为“事实”提供给 AI，并要求它不得改动。
 */
export type AiConfig = { enabled: boolean; baseUrl: string; model: string; apiKey: string };

export const AI_STORAGE_KEY = "kaiqiao-ai";
export const DEFAULT_AI: AiConfig = { enabled: false, baseUrl: "https://api.deepseek.com", model: "deepseek-chat", apiKey: "" };

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

export function loadAiConfig(store: KV | undefined): AiConfig {
  try {
    const raw = store?.getItem(AI_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI };
    const v = JSON.parse(raw);
    return { enabled: v.enabled === true, baseUrl: typeof v.baseUrl === "string" ? v.baseUrl : DEFAULT_AI.baseUrl, model: typeof v.model === "string" ? v.model : DEFAULT_AI.model, apiKey: typeof v.apiKey === "string" ? v.apiKey : "" };
  } catch { return { ...DEFAULT_AI }; }
}

export function saveAiConfig(store: KV | undefined, cfg: AiConfig) {
  try { if (cfg.apiKey || cfg.enabled) store?.setItem(AI_STORAGE_KEY, JSON.stringify(cfg)); else store?.removeItem(AI_STORAGE_KEY); } catch { /* 存储不可用时忽略 */ }
}

/** 只允许 https（或本机调试用的 http://localhost） */
export function validBaseUrl(url: string): boolean {
  try { const u = new URL(url); return u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")); } catch { return false; }
}

export type AiContext = { grade: Grade; demo: DemoId; params: Params; facts: string[]; studentAsk: string; lastWrong?: { prompt: string; given: string; answer: string } };

export function buildMessages(ctx: AiContext): { role: "system" | "user"; content: string }[] {
  const style = gradeStyle(ctx.grade);
  const band = bandOf(ctx.grade);
  const def = DEMOS[ctx.demo];
  const paramText = def.params.map((p) => `${p.label}：${displayParam(p, ctx.params[p.key] ?? p.default)}`).join("；");
  const system = [
    `你是中国小学 ${ctx.grade} 年级学生的数学和科学老师，使用简体中文。`,
    `讲解要求：${style.tone}每句话不超过 ${style.maxSentence} 个字，整段回答不超过 ${band === "low" ? 80 : band === "mid" ? 140 : 200} 个字。`,
    band === "low" ? "不要出现公式和字母，多用实物和生活例子。" : band === "high" ? "可以用公式，但要说明为什么；先引导学生想，再给答案。" : "讲清每一步的理由，把图形和算式联系起来。",
    "绝不批评、嘲笑学生。学生答错时先鼓励，再指出具体哪一步不对。",
    "只输出纯文本，不要输出代码、HTML、链接或表格。",
    "下面的“课堂事实”由程序计算得出，是正确的。不要改动其中的数字；如果你算出的结果和它不同，以课堂事实为准。",
    "不要讲超出小学的内容；如果学生问到，就说明“这是初中会学的内容”。",
  ].join("\n");
  const user = [
    `课题：${def.title}`,
    `当前参数：${paramText}`,
    `课堂事实：${ctx.facts.join("；") || "无"}`,
    ctx.lastWrong ? `学生刚才做错的题：${ctx.lastWrong.prompt}；学生答：${redactPII(ctx.lastWrong.given)}；正确答案：${ctx.lastWrong.answer}` : "",
    // 与网站客服同一套规则：发往家长自备接口前先在本机隐去电话、姓名、学校、住址等。
    `学生说：${redactPII(ctx.studentAsk.slice(0, 200))}`,
  ].filter(Boolean).join("\n");
  return [{ role: "system", content: system }, { role: "user", content: user }];
}

/** 与 Worker sanitizeText 保持一致；结果仍须以文本渲染，不当作 HTML。 */
export function sanitizeReply(text: unknown, maxLen = 400): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/[*#<>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export type AiResult = { ok: true; text: string } | { ok: false; error: string; cancelled?: boolean };

/** 每节课一个请求域。离线操作先同步失效旧请求，异步回复再检查身份。 */
export function createAiRequests() {
  let current: AbortController | null = null;
  const cancel = () => { const old = current; current = null; old?.abort(); };
  return {
    cancel,
    begin: () => { cancel(); current = new AbortController(); return current; },
    isCurrent: (request: AbortController) => current === request && !request.signal.aborted,
  };
}
export type AiRequests = ReturnType<typeof createAiRequests>;

export async function askAi(cfg: AiConfig, ctx: AiContext, fetchImpl: typeof fetch = fetch, timeoutMs = 20000, signal?: AbortSignal): Promise<AiResult> {
  if (!cfg.enabled || !cfg.apiKey) return { ok: false, error: "还没有开启 AI 老师" };
  if (!validBaseUrl(cfg.baseUrl)) return { ok: false, error: "服务地址必须以 https:// 开头" };
  if (signal?.aborted) return { ok: false, error: "请求已取消", cancelled: true };
  const ctrl = new AbortController();
  let timedOut = false;
  const cancel = () => ctrl.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  let onAbort: () => void;
  const aborted = new Promise<AiResult>((resolve) => {
    onAbort = () => resolve(timedOut
      ? { ok: false, error: "等待太久，已取消" }
      : { ok: false, error: "请求已取消", cancelled: true });
    ctrl.signal.addEventListener("abort", onAbort, { once: true });
  });
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs);
  const request = async (): Promise<AiResult> => {
    const res = await fetchImpl(`${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, messages: buildMessages(ctx), temperature: 0.4, max_tokens: 400 }),
      signal: ctrl.signal,
    });
    if (res.status === 401 || res.status === 403) return { ok: false, error: "密钥无效或没有权限" };
    if (!res.ok) return { ok: false, error: `服务暂时不可用（${res.status}）` };
    const data = await res.json();
    const text = sanitizeReply(data?.choices?.[0]?.message?.content);
    return text ? { ok: true, text } : { ok: false, error: "没有收到有效回答" };
  };
  try {
    // 覆盖 fetch 和响应体读取；即使传输层不响应 abort，界面也按时结束等待。
    return await Promise.race([request(), aborted]);
  } catch {
    return { ok: false, error: "网络连接失败" };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    ctrl.signal.removeEventListener("abort", onAbort!);
  }
}
