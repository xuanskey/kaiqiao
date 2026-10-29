import { track } from "@/lib/telemetry";
import { useReducer, useRef } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { initialQuiz, reduceQuiz, type QuizRecord } from "@/lib/lesson/quiz-state";
import { adaptLevel } from "@/lib/lesson/tutor";
import type { DemoId } from "@/lib/lesson/demos";
import type { Grade } from "@/lib/math/types";

export type { QuizRecord } from "@/lib/lesson/quiz-state";

const LEVEL = ["", "简单", "标准", "提高"];

/** 会话历史独立于题目生命周期；换题原子地清空输入和反馈，学习记录只在提交事件写入。 */
export function Quiz({ demo, grade, nextLevel, setNextLevel, nonce, onRecord }: { demo: DemoId; grade: Grade; nextLevel: number; setNextLevel: (n: number) => void; nonce: number; onRecord: (r: QuizRecord) => void }) {
  const [state, dispatch] = useReducer(reduceQuiz, undefined, () => initialQuiz({ demo, grade, nonce }, nextLevel, Math.floor(Math.random() * 1e9)));
  // 在同一组件的渲染中协调显式请求；React 会先重渲染，再提交子树。
  // 不在 effect 中清理，避免新 props 与旧输入共存一个可交互的提交窗口。
  if (state.source.demo !== demo || state.source.grade !== grade || state.source.nonce !== nonce) {
    dispatch({ type: "replace", source: { demo, grade, nonce }, level: nextLevel });
  }
  const { question: shown, draft, result, history } = state;
  const questionLevel = shown.level;
  // DOM 禁用要等 React 提交后才生效；同步锁防止同批事件重复写入本地成绩。
  const submitted = useRef<string | null>(null);
  const submit = (given: string) => {
    if (submitted.current === shown.id) return;
    const action = { type: "submit" as const, questionId: shown.id, given };
    const next = reduceQuiz(state, action);
    if (next === state || !next.result) return;
    submitted.current = shown.id;
    dispatch(action);
    onRecord(next.result);
    track("quiz_complete", grade);
    const level = adaptLevel(nextLevel, next.history);
    if (level !== nextLevel) setNextLevel(level);
  };
  const nextQ = () => dispatch({ type: "next", level: nextLevel });
  const variant = () => dispatch({ type: "retry" });
  const correct = history.filter(Boolean).length;
  return <section className="quiz" aria-label="随堂练习">
    <header><strong>随堂练习</strong><span>难度：{LEVEL[questionLevel]} · 本次 {correct}/{history.length}</span></header>
    <p className="quiz-prompt">{shown.prompt}</p>
    {shown.choices ? <div className="quiz-choices">{shown.choices.map((c) => <button key={c} type="button" disabled={!!result} className={result ? (c === shown.answer ? "is-right" : c === result.given ? "is-wrong" : "") : ""} onClick={() => submit(c)}>{c}</button>)}</div>
      : <form className="quiz-fill" onSubmit={(e) => { e.preventDefault(); submit(draft); }}>
        <input value={draft} onChange={(e) => dispatch({ type: "draft", questionId: shown.id, value: e.target.value })} inputMode={/^[\d.]+$/.test(shown.answer) ? "decimal" : "text"} aria-label="填写答案" placeholder="写下答案" disabled={!!result} />
        <button type="submit" disabled={!draft.trim() || !!result}>提交</button>
      </form>}
    {result ? <div className={result.ok ? "quiz-feedback is-ok" : "quiz-feedback is-bad"} role="status">
      <p>{result.ok ? <><CheckCircle2 size={18} />答对了！</> : <><XCircle size={18} />还差一点。正确答案：{shown.answer}</>}</p>
      {!result.ok && result.hint ? <p className="quiz-hint">{result.hint}</p> : null}
      <ol>{shown.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {nextLevel !== questionLevel ? <p>下一题将{nextLevel > questionLevel ? "升级" : "降级"}为「{LEVEL[nextLevel]}」</p> : null}
      <div className="quiz-actions"><button type="button" onClick={nextQ}>下一题</button>{!result.ok ? <button type="button" onClick={variant}><RefreshCw size={15} />同类再练一道</button> : null}</div>
    </div> : null}
  </section>;
}
