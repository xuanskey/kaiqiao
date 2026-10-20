import type { Grade } from "../math/types.ts";

export type GradeBand = "low" | "mid" | "high";

export type GradeStyle = {
  band: GradeBand;
  /** 学段名称，用在界面上 */
  label: string;
  /** 一句讲解的建议最长字数 */
  maxSentence: number;
  /** 每个汉字的朗读/阅读时长（毫秒），低年级更慢 */
  msPerChar: number;
  /** 每一步至少停留的时长（毫秒） */
  minStepMs: number;
  /** 是否默认展示公式（低年级只展示实物和算式） */
  showFormula: boolean;
  /** 讲解口吻提示 */
  tone: string;
};

const STYLES: Record<GradeBand, GradeStyle> = {
  low: { band: "low", label: "低年级（1—2 年级）", maxSentence: 16, msPerChar: 260, minStepMs: 2600, showFormula: false, tone: "句子短，一次只讲一件事，多用实物和颜色。" },
  mid: { band: "mid", label: "中年级（3—4 年级）", maxSentence: 26, msPerChar: 200, minStepMs: 2200, showFormula: true, tone: "讲清过程和理由，把图形、表格和算式连起来。" },
  high: { band: "high", label: "高年级（5—6 年级）", maxSentence: 40, msPerChar: 170, minStepMs: 2000, showFormula: true, tone: "先让学生想，再逐步推导，重视公式来历和综合应用。" },
};

export function bandOf(grade: Grade): GradeBand {
  return grade <= 2 ? "low" : grade <= 4 ? "mid" : "high";
}

export function gradeStyle(grade: Grade): GradeStyle {
  return STYLES[bandOf(grade)];
}

/** 把一段讲解按句号/问号/感叹号切开，并把过长的句子在逗号处再切一次，适配所选年级的阅读长度。 */
export function splitForGrade(text: string, grade: Grade): string[] {
  const { maxSentence } = gradeStyle(grade);
  const sentences = text.split(/(?<=[。！？!?])/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxSentence) { out.push(sentence); continue; }
    let buf = "";
    for (const part of sentence.split(/(?<=[，、；])/)) {
      if (buf && (buf + part).length > maxSentence) { out.push(buf); buf = part; }
      else buf += part;
    }
    if (buf) out.push(buf);
  }
  return out;
}

/** 一步讲解在 1 倍速下需要停留的时长（毫秒）。 */
export function stepDurationMs(say: string, grade: Grade): number {
  const style = gradeStyle(grade);
  const chars = say.replace(/\s/g, "").length;
  return Math.max(style.minStepMs, chars * style.msPerChar);
}
