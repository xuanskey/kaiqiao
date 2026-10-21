import { mulberry32 } from "../math/rng.ts";
import type { Grade } from "../math/types.ts";
import type { DemoId } from "./demos.ts";
import { checkAnswer, makePractice, type PracticeQ } from "./practice.ts";

export type QuizRecord = { q: PracticeQ; given: string; ok: boolean; hint?: string };
export type QuizSource = { demo: DemoId; grade: Grade; nonce: number };
export type QuizState = {
  source: QuizSource;
  seed: number;
  sequence: number;
  question: PracticeQ;
  draft: string;
  result: QuizRecord | null;
  history: boolean[];
};
export type QuizAction =
  | { type: "draft"; questionId: string; value: string }
  | { type: "submit"; questionId: string; given: string }
  | { type: "next"; level: number }
  | { type: "retry" }
  | { type: "replace"; source: QuizSource; level: number };

/** 同类再练保留题型及教学分支（例如除数是小数、分数乘整数、求面积）。 */
export function practiceFamily(q: PracticeQ): string {
  return JSON.stringify([q.demo, q.kind, ...["q", "mode", "askArea", "kind", "other"].map((key) => key === "other" ? key in q.params : q.params[key])]);
}

function createQuestion(source: QuizSource, level: number, seed: number, sequence: number, previous?: PracticeQ, retry = false): PracticeQ {
  const rng = mulberry32(seed + sequence * 7919 + source.nonce);
  let fallback: PracticeQ | undefined;
  // 只选择变式，不改题库计算。某些知识点只有一个固定题干，不能无限重抽。
  for (let i = 0; i < 128; i++) {
    const q = makePractice(source.demo, source.grade, level, rng, sequence);
    if (retry && previous && practiceFamily(q) !== practiceFamily(previous)) continue;
    fallback ??= q;
    if (q.prompt !== previous?.prompt) return q;
  }
  return fallback ?? { ...previous!, id: `${previous!.id}-retry-${sequence}` };
}

export function initialQuiz(source: QuizSource, level: number, seed: number): QuizState {
  return { source, seed, sequence: 0, question: createQuestion(source, level, seed, 0), draft: "", result: null, history: [] };
}

/** 题目是状态快照，只在显式换题事件创建；下一题难度变化不会重新计算当前题。 */
export function reduceQuiz(state: QuizState, action: QuizAction): QuizState {
  if (action.type === "draft") {
    if (state.result || action.questionId !== state.question.id) return state;
    return { ...state, draft: action.value };
  }
  if (action.type === "submit") {
    if (state.result || action.questionId !== state.question.id || !action.given.trim()) return state;
    const result = { q: state.question, given: action.given.trim(), ...checkAnswer(state.question, action.given) };
    return { ...state, result, history: [...state.history, result.ok] };
  }
  if ((action.type === "next" || action.type === "retry") && !state.result) return state;
  const source = action.type === "replace" ? action.source : state.source;
  const newLesson = source.demo !== state.source.demo || source.grade !== state.source.grade;
  const sequence = state.sequence + 1;
  const level = action.type === "retry" ? state.question.level : action.level;
  return {
    ...state, source, sequence,
    question: createQuestion(source, level, state.seed, sequence, newLesson ? undefined : state.question, action.type === "retry"),
    draft: "", result: null, history: newLesson ? [] : state.history,
  };
}
