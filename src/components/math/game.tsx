import { Learning } from "./learning";
import { Classroom } from "@/components/lesson/classroom";
import { unitById } from "@/lib/math/units";
import { lessonFromSearch, requestLesson } from "@/lib/lesson/today";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { shouldPublishTimer } from "@/lib/math/timer";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Lightbulb, Star, Timer, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnMath } from "./column";
import { DUEL_SECONDS, SPRINT_SECONDS, chapterById } from "@/lib/math/chapters";
import { parseColumn } from "@/lib/math/column";
import { unlockAudio, playBad, playCombo, playOk, playWin } from "@/lib/math/audio";
import { nextCampaign } from "@/lib/math/progress";
import { SKILL_HINT, SKILL_LABEL, isSkillId } from "@/lib/math/skills";
import { hushSpeak, speakPrompt } from "@/lib/math/speak";
import { cn } from "@/lib/utils";
import { useMath } from "@/store/math";
import type { Question } from "@/lib/math/types";
import { Keypad } from "./keypad";
import { LogoMark, Mascot, type Mood } from "./mascot";
import { AppShell, Meter, Metric } from "./shell";
import { Home, Map, Report, Review } from "./pages";

export function Game() {
  const screen = useMath((s) => s.screen);
  const hydrate = useMath((s) => s.hydrate);
  const persist = useMath((s) => s.persist);
  useEffect(() => {
    hydrate();
    // 主站或分享链接可以直达某节课：?lesson=fraction-mul&grade=6
    const link = lessonFromSearch(window.location.search);
    if (link) {
      requestLesson(link.demo, link.grade, "推荐课");
      useMath.getState().go("class");
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
  }, [hydrate]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") persist(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [persist]);
  useEffect(() => () => hushSpeak(), []);
  return <AppShell screen={screen}>
    {screen === "home" ? <Home /> : null}
    {screen === "class" ? <Classroom /> : null}
    {screen === "learn" ? <Learning /> : null}
    {screen === "map" ? <Map /> : null}
    {screen === "play" ? <Play /> : null}
    {screen === "duel" ? <Duel /> : null}
    {screen === "result" ? <Result /> : null}
    {screen === "review" ? <Review /> : null}
    {screen === "report" ? <Report /> : null}
  </AppShell>;
}

/** 限时只在秒数变化时写入状态。页面隐藏时暂停，避免切回来把离开的时间一次扣完。 */
function useCoarseClock(active: boolean, tick: (dt: number) => void, remain: () => number) {
  const remainRef = useRef(remain);
  remainRef.current = remain;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let stopped = false;
    const frame = (t: number) => {
      if (stopped || document.visibilityState === "hidden") return;
      const dt = Math.min(1, Math.max(0, (t - last) / 1000));
      last = t;
      carry += dt;
      if (shouldPublishTimer(remainRef.current(), carry)) {
        const step = carry;
        carry = 0;
        tick(step);
      }
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      carry = 0;
      last = performance.now();
      if (!stopped && document.visibilityState !== "hidden") raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);
    if (document.visibilityState !== "hidden") raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); };
  }, [active, tick]);
}

function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="back-button"><ChevronLeft size={18} />{label}</button>;
}

function playTitle(kind: string, chapterId?: string, level?: number, skill?: string): string {
  if (kind === "topic") return `${chapterById(chapterId ?? "warmup").name} · 专项练习`;
  if (kind === "daily") return "每日一练";
  if (kind === "review") return "错题回炉";
  if (kind === "sprint") return "本年级限时练习";
  if (kind === "drill") return skill && isSkillId(skill) ? `对症 · ${SKILL_LABEL[skill]}` : "对症练";
  return `${chapterById(chapterId ?? "warmup").name} · ${level ?? 1} 关`;
}

function Play() {
  const session = useMath((s) => s.session);
  const submit = useMath((s) => s.submit);
  const advance = useMath((s) => s.advance);
  const go = useMath((s) => s.go);
  const muted = useMath((s) => s.muted);
  const sprintRemain = useMath((s) => s.sprintRemain);
  const tickSprint = useMath((s) => s.tickSprint);
  const [draft, setDraft] = useState("");
  const [countIn, setCountIn] = useState(3);

  const q = session?.questions[session.index];
  const feedback = session?.feedback ?? null;
  const isSprint = session?.kind === "sprint";
  useCoarseClock(isSprint && countIn === 0, tickSprint, () => useMath.getState().sprintRemain);

  useEffect(() => {
    setCountIn(isSprint ? 0 : 3);
  }, [session?.startedAt, isSprint]);

  useEffect(() => {
    if (countIn <= 0) return;
    const t = window.setTimeout(() => setCountIn((n) => n - 1), 650);
    return () => window.clearTimeout(t);
  }, [countIn]);

  useEffect(() => {
    if (countIn !== 0) return;
    const cur = useMath.getState().session;
    if (cur && cur.index === 0 && !cur.feedback) {
      useMath.setState({ session: { ...cur, shownAt: performance.now() } });
    }
  }, [countIn]);

  useEffect(() => {
    setDraft("");
    hushSpeak();
  }, [session?.index, session?.questions]);

  useEffect(() => {
    if (!feedback || !isSprint) return;
    const wait = feedback.ok ? 900 : 2200;
    const t = window.setTimeout(() => advance(), wait);
    return () => window.clearTimeout(t);
  }, [feedback, advance, isSprint]);

  if (!session || !q) return null;

  if (countIn > 0) {
    return (
      <div className="countdown page-enter">
        <Mascot mood="idle" />
        <p className="eyebrow">准备 · 先读题，再作答</p>
        <p className="countdown-number">{countIn}</p>
        <Back onClick={() => go("home")} label="返回练习" />
      </div>
    );
  }

  const onSubmit = (given: string) => {
    unlockAudio();
    const ok = submit(given);
    if (muted) return;
    if (ok) {
      const combo = useMath.getState().session?.combo ?? 0;
      if (combo >= 3) playCombo(combo);
      else playOk();
    } else playBad();
  };

  const mood: Mood = feedback ? (feedback.ok ? "happy" : "sad") : "think";
  const total = session.questions.length;
  const remain = Math.ceil(sprintRemain);

  return (
    <AskShell
      mood={mood}
      title={`${session.dueReview ? "今日到期复习 · " : ""}${session.retried ? "巩固加练 · " : ""}${session.kind === "unit" ? `${unitById(session.unitId ?? "")?.title ?? "单元练习"} · ${session.assessment ? "自测" : "练习"}` : playTitle(session.kind, session.chapterId, session.level, session.skill)}`}
      onBack={() => {
        if (window.confirm("结束本轮？已提交的答案会保留，未完成的练习不计通关或打卡。")) go("home");
      }}
      progress={isSprint ? `${remain}s` : `${session.index + 1} / ${total}`}
      completed={session.index}
      total={isSprint ? undefined : total}
      combo={session.combo}
      qPrompt={q.prompt}
      feedback={feedback}
      explain={q.explain}
      answer={q.answer}
      trap={q.trap}
      skill={q.skill}
      fromWrong={q.fromWrong}
      onSkip={advance}
      extra={
        isSprint ? (
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-secondary" aria-hidden>
            <div
              className="h-full bg-accent"
              style={{ width: `${(sprintRemain / SPRINT_SECONDS) * 100}%` }}
            />
          </div>
        ) : null
      }
    >
      <QuestionInput question={q} value={draft} disabled={!!feedback} onChange={setDraft} onSubmit={onSubmit} />
    </AskShell>
  );
}

function Duel() {
  const session = useMath((s) => s.session);
  const duel = useMath((s) => s.duel);
  const submit = useMath((s) => s.submit);
  const advance = useMath((s) => s.advance);
  const tickDuel = useMath((s) => s.tickDuel);
  const go = useMath((s) => s.go);
  const muted = useMath((s) => s.muted);
  const [draft, setDraft] = useState("");
  useCoarseClock(!!duel, tickDuel, () => useMath.getState().duel?.remain ?? 0);

  const q = session?.questions[session.index];
  const feedback = session?.feedback ?? null;

  useEffect(() => {
    setDraft("");
  }, [session?.index]);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => advance(), feedback.ok ? 420 : 700);
    return () => window.clearTimeout(t);
  }, [feedback, advance]);

  if (!session || !q || !duel) return null;
  const you = session.logs.filter((l) => l.ok).length;
  const remain = Math.ceil(duel.remain);

  const onSubmit = (given: string) => {
    unlockAudio();
    const ok = submit(given);
    if (!muted) {
      if (ok) playOk();
      else playBad();
    }
  };

  return (
    <AskShell
      mood={feedback ? (feedback.ok ? "happy" : "sad") : "think"}
      title="和电脑练一练"
      onBack={() => { if (window.confirm("结束本轮对决？已提交的答案会保留。")) go("home"); }}
      progress={`${remain}s`}
      combo={session.combo}
      qPrompt={q.prompt}
      feedback={feedback}
      explain={q.explain}
      answer={q.answer}
      onSkip={advance}
      extra={
        <div><div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-secondary px-3 py-2">
            <div className="text-xs text-muted-foreground">你</div>
            <div className="font-display text-xl tabular-nums">{you}</div>
          </div>
          <div className="rounded-xl bg-secondary px-3 py-2 text-right">
            <div className="text-xs text-muted-foreground">窍窍（电脑）</div>
            <div className="font-display text-xl tabular-nums">{duel.npcScore}</div>
          </div>
        </div><div className="mt-4"><Meter value={duel.remain} max={DUEL_SECONDS} label="对决剩余时间" /></div></div>
      }
    >
      <QuestionInput question={q} value={draft} disabled={!!feedback} onChange={setDraft} onSubmit={onSubmit} />
    </AskShell>
  );
}

function QuestionInput({ question: q, value, disabled, onChange, onSubmit }: { question: Question; value: string; disabled: boolean; onChange: (value: string) => void; onSubmit: (value: string) => void }) {
  return q.mode === "choice" ? <div className="answer-area"><p className="answer-label">选出你认为正确的答案</p><div className={cn("choice-grid", (q.choices?.length ?? 0) <= 2 && "choice-grid--two")}>
    {(q.choices ?? []).map((choice, i) => <button key={choice} type="button" disabled={disabled} className="choice-button" onClick={() => onSubmit(choice)}><span>{String.fromCharCode(65 + i)}</span><strong>{choice}</strong></button>)}
  </div></div> : <div className="answer-area"><label className="answer-label" htmlFor="answer-display">你的答案</label><output id="answer-display" className="answer-display" aria-live="polite">{value || <span>点数字，写下答案</span>}{value ? <i aria-hidden="true" /> : null}</output><Keypad value={value} kind={q.keypad ?? "int"} disabled={disabled} onChange={onChange} onSubmit={() => onSubmit(value)} /><p className="keyboard-note">{q.keypad === "remainder" ? "数字键输入，R 输入余，Enter 确认" : "也可以用数字键输入，按 Enter 确认"}</p></div>;
}

function AskShell({ mood, title, onBack, progress, completed = 0, total, combo, qPrompt, feedback, explain, answer, trap, skill, fromWrong, onSkip, extra, children }: {
  mood: Mood; title: string; onBack: () => void; progress: string; completed?: number; total?: number; combo: number; qPrompt: string;
  feedback: null | { ok: boolean; given: string }; explain: string; answer: string; trap?: string; skill?: string; fromWrong?: boolean;
  onSkip: () => void; extra?: ReactNode; children: ReactNode;
}) {
  const work = !feedback || feedback.ok ? null : parseColumn(qPrompt);
  const skillLabel = isSkillId(skill) ? SKILL_LABEL[skill] : null;
  const hint = isSkillId(skill) ? SKILL_HINT[skill] : null;
  return <div className="practice-page page-enter">
    <header className="practice-topbar"><div className="brand"><LogoMark /><strong>开窍</strong></div><button type="button" onClick={onBack} className="back-button"><X size={18} />结束练习</button></header>
    <div className="practice-heading"><div><p className="eyebrow">专心这一题，就很好</p><h1>{title}</h1></div><span className="question-counter">{!total ? <Timer size={17} /> : null}{progress}{total ? <small>题</small> : null}</span></div>
    {total ? <Meter value={completed + (feedback ? 1 : 0)} max={total} label="本轮答题进度" /> : null}
    {extra ? <div className="practice-extra">{extra}</div> : null}
    <div className={cn("practice-workspace", feedback && "has-feedback")}>
      <section className="question-card" aria-label="题目">
        <div className="question-card-top"><span className="soft-badge">{fromWrong ? "原题再练" : skillLabel ?? "想一想"}</span>{combo >= 2 ? <span className="combo-badge"><SparkleIcon />连对 {combo} 题</span> : null}<button type="button" className="icon-button ml-auto" onClick={() => speakPrompt(qPrompt)} aria-label="读题"><Volume2 size={19} /></button></div>
        <p className={cn("question-prompt", qPrompt.length > 28 && "question-prompt--long")}>{qPrompt}</p>
        {!feedback ? <div className="question-encouragement"><Mascot mood={mood} /><span>不着急，先想清楚。</span></div> : null}
        {feedback ? <div className={cn("feedback-box", !feedback.ok && "feedback-box--retry")} role="status">
          <div className="feedback-title">{feedback.ok ? <CheckCircle2 size={23} /> : <Lightbulb size={23} />}<strong>{feedback.ok ? "答对了，想得很棒！" : "没关系，一起弄明白。"}</strong></div>
          {!feedback.ok ? <div className="answer-comparison"><span>你的答案 <b>{feedback.given}</b></span><span>正确答案 <strong>{answer}</strong></span></div> : null}
          <p className="feedback-explain">{explain}</p>
          {!feedback.ok && (trap || hint) ? <p className="feedback-tip">小提醒 · {trap || hint}</p> : null}
          {work ? <ColumnMath work={work} wrong /> : null}
          <Button size="lg" className="mt-5 w-full" onClick={onSkip}>{feedback.ok ? "下一题" : "看懂了，继续"}<ArrowRight /></Button>
        </div> : null}
      </section>
      {!feedback ? children : null}
    </div>
    <p className="practice-footnote">{total ? "不限时，慢慢想。答完会有讲解，再点「下一题」。" : "限时模式会自动进入下一题，错题会留在错题本。"}</p>
  </div>;
}

function SparkleIcon() { return <Star size={13} fill="currentColor" />; }

function Result() {
  const session = useMath((s) => s.session);
  const lastStars = useMath((s) => s.lastStars);
  const duel = useMath((s) => s.duel);
  const go = useMath((s) => s.go);
  const startLevel = useMath((s) => s.startLevel);
  const startDaily = useMath((s) => s.startDaily);
  const startDuel = useMath((s) => s.startDuel);
  const startSprint = useMath((s) => s.startSprint);
  const startDrill = useMath((s) => s.startDrill);
  const muted = useMath((s) => s.muted);
  const stars = useMath((s) => s.stars);
  const sprintBest = useMath((s) => s.sprintBest);

  useEffect(() => {
    if (!muted) playWin();
  }, [muted]);

  const selectedGrade = useMath((s) => s.selectedGrade);
  const reviewData = useMath((s) => s.reviewData);

  if (!session) return null;
  const nextDates = Object.entries(reviewData.schedule).filter(([id]) => reviewData.content[id] && chapterById(reviewData.content[id].chapterId).grade === selectedGrade).map(([, state]) => state.dueAt);
  const nextDate = nextDates.length ? new Date(Math.min(...nextDates)).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '';
  const correct = session.logs.filter((l) => l.ok).length;
  const total = session.logs.length;
  const you = correct;
  const npc = duel?.npcScore ?? 0;
  const duelEnd = session.kind === "duel";
  const sprintEnd = session.kind === "sprint";
  const outcome = duelEnd ? (you > npc ? "你赢了" : you < npc ? "窍窍赢了" : "平手") : null;
  const next = nextCampaign(stars, selectedGrade);
  const headline = outcome
    ?? (sprintEnd ? (total >= session.questions.length ? "本轮完成" : "时间到")
    : session.kind !== "campaign" && total ? "本轮完成" : lastStars >= 2 ? "开窍了" : lastStars === 1 ? "过关" : total ? "再练一遍" : "时间到");

  const accuracy = total ? Math.round(correct / total * 100) : null;
  const retry = () => {
    if (session.kind === "campaign" && session.chapterId && session.level) return lastStars > 0 ? startLevel(next.chapterId, next.level) : startLevel(session.chapterId, session.level);
    if (session.kind === "topic" && session.chapterId) return useMath.getState().startTopic(session.chapterId, session.advanced);
    if (session.kind === "unit" && session.unitId) return useMath.getState().startUnit(session.unitId, session.assessment);
    if (session.kind === "daily") return startDaily();
    if (session.kind === "drill") return startDrill(session.skill);
    if (sprintEnd) return startSprint();
    if (duelEnd) return startDuel();
    return go("review");
  };
  return <div className="result-page page-enter">
    <Back onClick={() => go("home")} label="回到练习" />
    <section className="result-card">
      <span className="eyebrow">{total ? "每一次认真，都值得记录" : "准备好时，再试一次"}</span>
      <Mascot mood={!correct && total ? "think" : "happy"} />
      <h1>{headline}</h1>
      <p>{duelEnd ? `你答对 ${you} 题 · 窍窍（电脑）答对 ${npc} 题` : sprintEnd ? `本轮答对 ${correct} 题 · 最好成绩 ${sprintBest} 题` : correct === total && total > 0 ? "这一组，全都想明白了！" : "把不熟悉的题再想一遍，就会更稳。"}</p>
      {session.kind === "campaign" ? <div className="result-stars" aria-label={`本轮获得 ${lastStars} 颗星`} >{[1, 2, 3].map((n) => <Star key={n} size={34} className={cn(n <= lastStars && "is-earned")} />)}</div> : null}
      <div className="result-metrics"><Metric label="答对 / 已答" value={`${correct} / ${total}`} /><Metric label="本轮正确率" value={accuracy === null ? '—' : `${accuracy}%`} /><Metric label="最高连对" value={`${session.maxCombo} 题`} /></div>
      {session.kind === "unit" ? <p className="unit-result-note">这次记录已写入学情。看看家长建议，再挑一个需要巩固的知识点。</p> : null}
      {session.dueReview ? <p>本轮复习已完成。下次复习：{nextDate}（北京时间）。独立答对延后 3 天 / 7 天；答错、当天看过答案或关联题次日再来。</p> : null}
      <div className="result-actions"><Button size="lg" onClick={retry}>{session.kind === "campaign" ? lastStars > 0 ? "继续闯关" : "再练本关" : session.kind === "review" ? "回到错题本" : "再练一组"}<ArrowRight /></Button><Button variant="outline" size="lg" onClick={() => go("report")}>看看学习小结</Button></div>
      <button type="button" className="back-button mx-auto mt-4" onClick={() => go("home")}><ArrowLeft size={15} />今天先练到这里</button>
    </section>
  </div>;
}
