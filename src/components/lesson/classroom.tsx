import { useEffect, useMemo, useReducer, useRef, useState, type ComponentType } from "react";
import { ArrowLeft, BookOpen, FlaskConical, Hand, MessageCircle, Presentation, ShieldAlert } from "lucide-react";
import { DEMOS, defaultParams, displayParam, lessonScript, normalizeParams, type DemoId, type Params, type Subject } from "@/lib/lesson/demos";
import { EDITIONS, SUBJECT_LABEL, editionsFor, unitsOf, type Term } from "@/lib/lesson/curriculum";
import { gradeStyle } from "@/lib/lesson/grade-style";
import { initialPlayer, reducePlayer, sceneAt, type PlayerAction } from "@/lib/lesson/timeline";
import { TUTOR_ACTIONS, initialTutor, tutorRespond, type TutorIntent } from "@/lib/lesson/tutor";
import { GRADE_LABEL } from "@/lib/math/chapters";
import type { Grade } from "@/lib/math/types";
import { useMath } from "@/store/math";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/math/shell";
import { Board, PlayerControls } from "./board";
import { Quiz, type QuizRecord } from "./quiz";
import { AddSubStage, AngleStage, BalanceStage, CircleStage, CylinderStage, DecimalMulStage, FractionStage, GroupShareStage, LawStage, PerimeterAreaStage, type StageProps } from "./stages-math";
import { CircuitStage, MagnetStage, PendulumStage, ShadowStage } from "./stages-science";

const STAGES: Record<DemoId, ComponentType<StageProps>> = {
  "add-sub": AddSubStage, "group-share": GroupShareStage, fraction: FractionStage, "perimeter-area": PerimeterAreaStage, angle: AngleStage, law: LawStage,
  "decimal-mul": DecimalMulStage, balance: BalanceStage, circle: CircleStage, cylinder: CylinderStage,
  magnet: MagnetStage, shadow: ShadowStage, circuit: CircuitStage, pendulum: PendulumStage,
};

const MOTION_KEY = "kaiqiao-reduce-motion";

function useReduceMotion(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return false;
    try { const saved = localStorage.getItem(MOTION_KEY); if (saved !== null) return saved === "1"; } catch { /* 隐私模式下忽略 */ }
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });
  const set = (v: boolean) => { setValue(v); try { localStorage.setItem(MOTION_KEY, v ? "1" : "0"); } catch { /* 忽略 */ } };
  return [value, set];
}

export function Classroom() {
  const storeGrade = useMath((s) => s.selectedGrade);
  const [grade, setGrade] = useState<Grade>(storeGrade);
  const [term, setTerm] = useState<Term>("上");
  const [subject, setSubject] = useState<Subject>("math");
  const [editionId, setEditionId] = useState("pep-math");
  const [open, setOpen] = useState<{ demo: DemoId; unit: string } | null>(null);
  const editions = editionsFor(subject);
  const edition = EDITIONS.find((e) => e.id === editionId && e.subject === subject) ?? editions[0];
  const units = unitsOf(edition, grade, term);
  const style = gradeStyle(grade);
  const go = useMath((s) => s.go);
  const setStoreGrade = useMath((s) => s.setGrade);

  if (open) return <LessonView demo={open.demo} grade={grade} unitTitle={open.unit} onBack={() => { setOpen(null); window.scrollTo({ top: 0, behavior: "instant" }); }} />;

  const chooseSubject = (s: Subject) => { setSubject(s); setEditionId(editionsFor(s)[0].id); };
  return <div className="page-enter classroom">
    <PageHeading eyebrow="看见知识 · 动手操作 · 讲给自己听" title="互动课堂" description="选年级、学期和教材，打开带动画板书的课。每节课都能暂停、回放，也能自己动手试。" />
    <section className="class-picker" aria-label="选择课程">
      <div className="class-row" role="group" aria-label="年级">{([1, 2, 3, 4, 5, 6] as Grade[]).map((g) => <button key={g} type="button" aria-pressed={grade === g} onClick={() => setGrade(g)}>{GRADE_LABEL[g]}</button>)}</div>
      <div className="class-row">
        <div role="group" aria-label="学期" className="class-seg">{(["上", "下"] as Term[]).map((t) => <button key={t} type="button" aria-pressed={term === t} onClick={() => setTerm(t)}>{`${t}册`}</button>)}</div>
        <div role="group" aria-label="学科" className="class-seg">{(["math", "science"] as Subject[]).map((s) => <button key={s} type="button" aria-pressed={subject === s} onClick={() => chooseSubject(s)}>{SUBJECT_LABEL[s]}</button>)}</div>
        <label className="class-edition">教材<select value={edition.id} onChange={(e) => setEditionId(e.target.value)}>{editions.map((e) => <option key={e.id} value={e.id}>{e.name}{e.ready ? "" : "（暂未录入）"}</option>)}</select></label>
      </div>
      <p className="class-note">{style.label}：{style.tone}</p>
    </section>
    <p className="class-source">{edition.note}</p>
    {!edition.ready ? <div className="class-empty"><BookOpen size={22} /><p>{edition.name}目录还没有录入。为避免把不同版本的内容混在一起，这里暂不显示课程。</p></div>
      : units.length === 0 ? <div className="class-empty"><FlaskConical size={22} /><p>{GRADE_LABEL[grade]}{term}册的{SUBJECT_LABEL[subject]}暂时没有互动实验。{subject === "science" ? "可以换个学期看看。" : ""}</p></div>
      : <ol className="class-units">{units.map((u, i) => <li key={u.id} className={cn("class-unit", u.demos?.length && "has-demo")}>
          <span className="class-unit-no">{i + 1}</span>
          <div><strong>{u.title}</strong>{u.demos?.length ? <small>{u.demos.map((d) => DEMOS[d].title).join("、")}</small> : <small>{subject === "math" ? "暂无互动课，可去题库练习" : ""}</small>}</div>
          {u.demos?.length ? <div className="class-unit-actions">{u.demos.map((d) => <button key={d} type="button" className="class-open" onClick={() => { setOpen({ demo: d, unit: u.title }); window.scrollTo({ top: 0, behavior: "instant" }); }}><Presentation size={16} />上课</button>)}</div>
            : subject === "math" ? <button type="button" className="class-practice" onClick={() => { setStoreGrade(grade); go("map"); }}>去题库</button> : null}
        </li>)}</ol>}
  </div>;
}

export function LessonView({ demo, grade, unitTitle, onBack }: { demo: DemoId; grade: Grade; unitTitle: string; onBack: () => void }) {
  const def = DEMOS[demo];
  const [params, setParams] = useState<Params>(() => defaultParams(demo));
  const [tutor, setTutor] = useState(initialTutor);
  const [interactive, setInteractive] = useState(false);
  const [reduceMotion, setReduceMotion] = useReduceMotion();
  const [message, setMessage] = useState<string>(gradeStyle(grade).band === "low" ? "我们一起来看看吧！" : "先看老师讲一遍，再自己动手试试。");
  const [quizNonce, setQuizNonce] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [lastWrong, setLastWrong] = useState<QuizRecord | undefined>();
  const steps = useMemo(() => lessonScript(demo, params, grade, tutor.variant), [demo, params, grade, tutor.variant]);
  const [player, rawDispatch] = useReducer((s: ReturnType<typeof initialPlayer>, a: PlayerAction) => reducePlayer(steps, s, a), undefined, initialPlayer);
  const dispatch = (a: PlayerAction) => { if (a.type === "play" || a.type === "toggle" || a.type === "restart") setInteractive(false); rawDispatch(a); };
  const quizRef = useRef<HTMLDivElement>(null);

  // 步骤数变化（换讲法、改参数）时，保证当前步骤仍然有效
  useEffect(() => { if (player.index > steps.length - 1) rawDispatch({ type: "seek", index: steps.length - 1 }); }, [steps.length, player.index]);

  // 播放循环：只在播放时运行，暂停或离开页面时清理
  useEffect(() => {
    if (!player.playing) return;
    let raf = 0, last = performance.now();
    const loop = (t: number) => { rawDispatch({ type: "tick", dtMs: Math.min(250, t - last) }); last = t; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const onHide = () => { if (document.visibilityState === "hidden") rawDispatch({ type: "pause" }); };
    document.addEventListener("visibilitychange", onHide);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onHide); };
  }, [player.playing]);

  const setParam = (key: string, value: number) => setParams((p) => normalizeParams(demo, { ...p, [key]: value }));
  const scene = sceneAt(steps, player.index);
  const Stage = STAGES[demo];

  const ask = (intent: TutorIntent) => {
    const reply = tutorRespond(intent, demo, grade, tutor, lastWrong);
    setTutor(reply.state);
    setMessage(reply.text);
    for (const e of reply.effects) {
      if (e.type === "restart") { setInteractive(false); rawDispatch({ type: "restart" }); }
      if (e.type === "speed") rawDispatch({ type: "speed", speed: e.speed as 0.5 | 0.75 | 1 });
      if (e.type === "interactive") { rawDispatch({ type: "pause" }); setInteractive(true); }
      if (e.type === "quiz") { setShowQuiz(true); setQuizNonce((n) => n + 1); setTimeout(() => quizRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }), 50); }
    }
  };

  return <div className={cn("page-enter lesson-view", reduceMotion && "reduce-motion")}>
    <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={17} />返回课程目录</button>
    <header className="lesson-head">
      <p className="eyebrow">{GRADE_LABEL[grade]} · {def.subject === "math" ? "数学" : "科学"} · {unitTitle}</p>
      <h1>{def.title}</h1>
      <p>{def.summary}</p>
    </header>
    <div className="lesson-layout">
      <div className="lesson-main">
        <div className={cn("stage-wrap", interactive && "is-interactive")}>
          <div className="stage-mode">{interactive ? <><Hand size={15} />动手模式：拖一拖、点一点、调参数</> : <><Presentation size={15} />老师演示</>}
            <button type="button" onClick={() => { if (interactive) setInteractive(false); else { rawDispatch({ type: "pause" }); setInteractive(true); } }}>{interactive ? "回到演示" : "让我自己试试"}</button></div>
          <Stage params={params} scene={scene} interactive={interactive} setParam={setParam} reduceMotion={reduceMotion} />
        </div>
        <PlayerControls steps={steps} player={player} dispatch={dispatch} />
        <Board steps={steps} player={player} grade={grade} />
      </div>
      <aside className="lesson-side">
        <section className="param-panel" aria-label="调节参数">
          <header><strong>调节参数</strong><small>结果由真实计算得出</small></header>
          {def.params.filter((p) => !(demo === "group-share" && ((params.mode === 0 && p.key === "total") || (params.mode === 1 && p.key === "each")))).map((spec) => spec.options
            ? <div key={spec.key} className="param-options" role="group" aria-label={spec.label}><span>{spec.label}</span><div>{spec.options.map((o, i) => <button key={o} type="button" aria-pressed={params[spec.key] === i} onClick={() => setParam(spec.key, i)} disabled={demo === "circuit" && spec.key === "broken" && i > params.bulbs}>{o}</button>)}</div></div>
            : <label key={spec.key} className="param-range"><span>{spec.label}<b>{displayParam(spec, params[spec.key])}</b></span>
              <input type="range" min={spec.min} max={demo === "fraction" && spec.key === "shaded" ? params.parts : spec.max} step={demo === "circle" && spec.key === "n" ? 2 : 1} value={params[spec.key]} onChange={(e) => setParam(spec.key, Number(e.target.value))} aria-label={spec.label} /></label>)}
        </section>
        <section className="tutor" aria-label="老师">
          <div className="tutor-bubble"><MessageCircle size={17} /><p aria-live="polite">{message}</p></div>
          <div className="tutor-actions">{TUTOR_ACTIONS.map((a) => <button key={a.intent} type="button" onClick={() => ask(a.intent)}>{a.label}</button>)}</div>
          <p className="tutor-note"><ShieldAlert size={13} />离线规则老师：按年级和你的反馈调整讲法，不联网、不调用大模型。</p>
        </section>
        <label className="motion-toggle"><input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />减少动态效果</label>
      </aside>
    </div>
    {def.experiment ? <section className="experiment" aria-label="实验说明">
      <h2>实验记录卡</h2>
      <dl>
        <div><dt>实验目的</dt><dd>{def.experiment.goal}</dd></div>
        <div><dt>所需器材</dt><dd>{def.experiment.tools.join("、")}</dd></div>
        <div><dt>实验步骤</dt><dd><ol>{def.experiment.steps.map((s) => <li key={s}>{s}</li>)}</ol></dd></div>
        <div><dt>可调参数</dt><dd>{def.params.map((p) => p.label).join("、")}</dd></div>
        <div><dt>观察结果</dt><dd>{def.experiment.observe}</dd></div>
        <div><dt>结果解释</dt><dd>{def.experiment.explain}</dd></div>
        {def.experiment.safety ? <div className="is-safety"><dt>安全提醒</dt><dd>{def.experiment.safety}</dd></div> : null}
        <div><dt>想一想</dt><dd>{def.experiment.think}</dd></div>
      </dl>
      <p className="experiment-note">{def.experiment.virtualNote}</p>
    </section> : null}
    <div ref={quizRef}>{showQuiz ? <Quiz demo={demo} grade={grade} level={tutor.level} setLevel={(level) => setTutor((t) => ({ ...t, level }))} nonce={quizNonce} onRecord={(r) => { if (!r.ok) setLastWrong(r); }} />
      : <button type="button" className="quiz-start" onClick={() => ask("quiz")}>开始随堂练习</button>}</div>
  </div>;
}
