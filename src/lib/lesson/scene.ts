import type { Grade } from "../math/types.ts";
import { DEMOS, isDemoId, normalizeParams, type DemoId, type Params } from "./demos.ts";

/**
 * 统一的动画场景协议。AI 或外部资料只能提交这种 JSON 数据：
 * 只允许已登记的演示、已登记的参数和范围内的整数，不接受任何代码、HTML 或额外字段。
 */
export type SceneSpec = {
  version: 1;
  demo: DemoId;
  grade: Grade;
  params: Params;
  /** 超出该演示正常年级的内容，必须明确标为课外拓展 */
  extension?: boolean;
};

export type SceneResult = { ok: true; scene: SceneSpec; warnings: string[] } | { ok: false; errors: string[] };

const MAX_JSON = 4000;
const ALLOWED_TOP = new Set(["version", "demo", "grade", "params", "extension"]);

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
}

export function validateScene(input: unknown): SceneResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isPlainObject(input)) return { ok: false, errors: ["场景必须是一个 JSON 对象"] };
  for (const key of Object.keys(input)) if (!ALLOWED_TOP.has(key)) errors.push(`不允许的字段：${key}`);
  if (input.version !== 1) errors.push("version 必须是 1");
  if (!isDemoId(input.demo)) errors.push("未登记的演示类型");
  const grade = input.grade;
  if (typeof grade !== "number" || !Number.isInteger(grade) || grade < 1 || grade > 6) errors.push("grade 必须是 1—6 的整数");
  if (input.extension !== undefined && typeof input.extension !== "boolean") errors.push("extension 必须是 true 或 false");
  const rawParams = input.params ?? {};
  if (!isPlainObject(rawParams)) errors.push("params 必须是对象");
  if (errors.length) return { ok: false, errors };

  const demo = DEMOS[input.demo as DemoId];
  const params: Params = {};
  const specs = new Map(demo.params.map((p) => [p.key, p]));
  for (const [key, value] of Object.entries(rawParams as Record<string, unknown>)) {
    const spec = specs.get(key);
    if (!spec) { errors.push(`演示「${demo.title}」没有参数 ${key}`); continue; }
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) { errors.push(`${spec.label} 必须是整数`); continue; }
    if (value < spec.min || value > spec.max) { errors.push(`${spec.label} 超出范围 ${spec.min}—${spec.max}`); continue; }
    params[key] = value;
  }
  if (errors.length) return { ok: false, errors };

  const g = grade as Grade;
  const inGrade = demo.grades.includes(g);
  if (!inGrade && input.extension !== true) return { ok: false, errors: [`「${demo.title}」不属于 ${g} 年级的正常课程；如需使用，必须标记为课外拓展`] };
  if (!inGrade) warnings.push("课外拓展：超出本年级正常课程");

  const normalized = normalizeParams(demo.id, params);
  for (const key of Object.keys(params)) if (normalized[key] !== params[key]) warnings.push(`参数 ${key} 已自动调整为 ${normalized[key]}`);
  return { ok: true, scene: { version: 1, demo: demo.id, grade: g, params: normalized, ...(inGrade ? {} : { extension: true }) }, warnings };
}

/** 只用 JSON.parse 解析，绝不执行文本中的任何代码。 */
export function parseScene(text: string): SceneResult {
  if (typeof text !== "string" || text.length === 0) return { ok: false, errors: ["内容为空"] };
  if (text.length > MAX_JSON) return { ok: false, errors: ["场景数据过长"] };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, errors: ["不是合法的 JSON"] }; }
  return validateScene(data);
}
