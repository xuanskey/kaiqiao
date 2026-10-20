import { useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { makePractice, checkAnswer, type PracticeQ } from "@/lib/lesson/practice";
import { adaptLevel } from "@/lib/lesson/tutor";
import type { DemoId } from "@/lib/lesson/demos";
import { mulberry32 } from "@/lib/math/rng";
import type { Grade } from "@/lib/math/types";

export type QuizRecord = { q: PracticeQ; given: string; ok: boolean; hint?: string };

const LEVEL = ["", "简单", "标准", "提高"];

/** 随堂练习：答错会给出针对性提示和分步解析，可做同类变式；难度随答题情况调整。本次记录只保存在当前页面。 */
export function Quiz({ demo, grade, level, setLevel, nonce, onRecord }: { demo: DemoId; grade: Grade; level: number; setLevel: (n: number) => void; nonce: number; onRecord: (r: QuizRecord) => void }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [count, setCount] = useState(0);
  const q = useMemo(() => makePractice(demo, grade, level, mulberry32(seed + count * 7919 + nonce), count), [demo, grade, level, seed, count, nonce]);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<QuizRecord | null>(null);
  const [history, setHistory] = useState<boolean[]>([]);
  const submit = (given: string) => {
    if (!given.trim() || result) return;
    const r = checkAnswer(q, given);
    const rec = { q, given: given.trim(), ok: r.ok, hint: r.hint };
    setResult(rec);
    onRecord(rec);
    const h = [...history, r.ok];
    setHistory(h);
    const next = adaptLevel(level, h);
    if (next !== level) setLevel(next);
  };
  const nextQ = () => { setResult(null); setDraft(""); setCount((c) => c + 1); };
  const variant = () => { setResult(null); setDraft(""); setSeed((s) => s + 1); };
  const correct = history.filter(Boolean).length;
  return <section className="quiz" aria-label="随堂练习">
    <header><strong>随堂练习</strong><span>难度：{LEVEL[level]} · 本次 {correct}/{history.length}</span></header>
    <p className="quiz-prompt">{q.prompt}</p>
    {q.choices ? <div className="quiz-choices">{q.choices.map((c) => <button key={c} type="button" disabled={!!result} className={result ? (c === q.answer ? "is-right" : c === result.given ? "is-wrong" : "") : ""} onClick={() => submit(c)}>{c}</button>)}</div>
      : <form className="quiz-fill" onSubmit={(e) => { e.preventDefault(); submit(draft); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} inputMode={/^[\d.]+$/.test(q.answer) ? "decimal" : "text"} aria-label="填写答案" placeholder="写下答案" disabled={!!result} />
        <button type="submit" disabled={!draft.trim() || !!result}>提交</button>
      </form>}
    {result ? <div className={result.ok ? "quiz-feedback is-ok" : "quiz-feedback is-bad"} role="status">
      <p>{result.ok ? <><CheckCircle2 size={18} />答对了！</> : <><XCircle size={18} />还差一点。正确答案：{q.answer}</>}</p>
      {!result.ok && result.hint ? <p className="quiz-hint">{result.hint}</p> : null}
      <ol>{q.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <div className="quiz-actions"><button type="button" onClick={nextQ}>下一题</button>{!result.ok ? <button type="button" onClick={variant}><RefreshCw size={15} />同类再练一道</button> : null}</div>
    </div> : null}
  </section>;
}
