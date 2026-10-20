import { useEffect, useMemo, useReducer, useRef, useState, type ComponentType } from "react";
import { ArrowLeft, BarChart3, BookOpen, FlaskConical, Hand, MessageCircle, Presentation, ShieldAlert } from "lucide-react";
import { DEMOS, defaultParams, displayParam, lessonScript, normalizeParams, type DemoId, type Params, type Subject } from "@/lib/lesson/demos";
import { EDITIONS, SUBJECT_LABEL, editionsFor, resolveUnits, type Term } from "@/lib/lesson/curriculum";
import { gradeStyle } from "@/lib/lesson/grade-style";
import { initialPlayer, reducePlayer, sceneAt, type PlayerAction } from "@/lib/lesson/timeline";
import { TUTOR_ACTIONS, initialTutor, tutorRespond, type TutorIntent } from "@/lib/lesson/tutor";
import { GRADE_LABEL } from "@/lib/math/chapters";
import type { Grade } from "@/lib/math/types";
import { useMath } from "@/store/math";
import { hushSpeak, speakPrompt } from "@/lib/math/speak";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/math/shell";
import { Board, PlayerControls } from "./board";
import { ImportPanel } from "./import-panel";
import { AiPanel, useAiConfig } from "./ai-panel";
import { clearClassLog, loadClassLog, masteryOf, recordAnswer, type ClassLog } from "@/lib/lesson/class-log";
import { boardAt } from "@/lib/lesson/timeline";
import { clearLesson, peekLesson } from "@/lib/lesson/today";
import { Quiz, type QuizRecord } from "./quiz";
import { AddSubStage, AngleStage, BalanceStage, CircleStage, CylinderStage, DecimalMulStage, FractionStage, GroupShareStage, LawStage, PerimeterAreaStage, type StageProps } from "./stages-math";
import { CircuitStage, MagnetStage, PendulumStage, ShadowStage } from "./stages-science";
import { EarthStage, FrictionStage, LeverStage, PlantStage, SlopeStage, SoundStage } from "./stages-lab";
import { ChanceStage, ClockStage, NumberLineStage, ParallelStage, PercentStage, PigeonholeStage, RmbStage, RulerStage, ScaleStage, ShapesStage, WaterStage } from "./stages-more";

const STAGES: Record<DemoId, ComponentType<StageProps>> = {
  "add-sub": AddSubStage, "group-share": GroupShareStage, fraction: FractionStage, "perimeter-area": PerimeterAreaStage, angle: AngleStage, law: LawStage,
  "decimal-mul": DecimalMulStage, balance: BalanceStage, circle: CircleStage, cylinder: CylinderStage,
  shapes: ShapesStage, rmb: RmbStage, ruler: RulerStage, clock: ClockStage, parallel: ParallelStage, chance: ChanceStage, "number-line": NumberLineStage, percent: PercentStage, pigeonhole: PigeonholeStage, scale: ScaleStage,
  magnet: MagnetStage, shadow: ShadowStage, circuit: CircuitStage, pendulum: PendulumStage, water: WaterStage,
  lever: LeverStage, slope: SlopeStage, sound: SoundStage, earth: EarthStage, friction: FrictionStage, plant: PlantStage,
};

const MOTION_KEY = "kaiqiao-reduce-motion";
const NARRATE_KEY = "kaiqiao-narrate";
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

function useNarrate(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => { try { return canSpeak() && localStorage.getItem(NARRATE_KEY) === "1"; } catch { return false; } });
  const set = (v: boolean) => { setValue(v); try { localStorage.setItem(NARRATE_KEY, v ? "1" : "0"); } catch { /* 忽略 */ } };
  return [value, set];
}

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
  const [open, setOpen] = useState<{ demo: DemoId; unit: string; grade?: Grade; preset?: Params } | null>(() => peekLesson());
  useEffect(() => { clearLesson(); }, []);
  const editions = editionsFor(subject);
  const edition = EDITIONS.find((e) => e.id === editionId && e.subject === subject) ?? editions[0];
  const { units, fallbackNote } = resolveUnits(edition, grade, term);
  const style = gradeStyle(grade);
  const go = useMath((s) => s.go);
  const setStoreGrade = useMath((s) => s.setGrade);

  const [log, setLog] = useState<ClassLog>({});
  useEffect(() => { setLog(loadClassLog(typeof window === "undefined" ? undefined : window.localStorage)); }, [open]);

  if (open) return <LessonView demo={open.demo} grade={open.grade ?? grade} unitTitle={open.unit} preset={open.preset} onBack={() => { setOpen(null); window.scrollTo({ top: 0, behavior: "instant" }); }} />;

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
    {fallbackNote ? <p className="class-fallback" role="note">{fallbackNote}</p> : null}
    {!edition.ready ? <div className="class-empty"><BookOpen size={22} /><p>{edition.name}目录还没有录入。为避免把不同版本的内容混在一起，这里暂不显示课程。</p></div>
      : units.length === 0 ? <div className="class-empty"><FlaskConical size={22} /><p>{GRADE_LABEL[grade]}{term}册的{SUBJECT_LABEL[subject]}暂时没有互动实验。{subject === "science" ? "可以换个学期看看。" : ""}</p></div>
      : <ol className="class-units">{units.map((u, i) => <li key={u.id} className={cn("class-unit", u.demos?.length && "has-demo")}>
          <span className="class-unit-no">{i + 1}</span>
          <div><strong>{u.title}</strong>{u.demos?.length ? <small>{u.demos.map((d) => DEMOS[d].title).join("、")}</small> : <small>{subject === "math" ? "暂无互动课，可去题库练习" : ""}</small>}</div>
          {u.demos?.length ? <div className="class-unit-actions">{u.demos.map((d) => <button key={d} type="button" className="class-open" onClick={() => { setOpen({ demo: d, unit: u.title, preset: u.preset }); window.scrollTo({ top: 0, behavior: "instant" }); }}><Presentation size={16} />上课</button>)}</div>
            : subject === "math" ? <button type="button" className="class-practice" onClick={() => { setStoreGrade(grade); go("map"); }}>去题库</button> : null}
        </li>)}</ol>}
    <ClassLogCard log={log} onClear={() => { clearClassLog(window.localStorage); setLog({}); }} />
    <ImportPanel grade={grade} onOpen={(demo) => { const g = DEMOS[demo].grades.includes(grade) ? grade : DEMOS[demo].grades[0]; setOpen({ demo, unit: "导入资料", grade: g }); window.scrollTo({ top: 0, behavior: "instant" }); }} />
  </div>;
}

function ClassLogCard({ log, onClear }: { log: ClassLog; onClear: () => void }) {
  const entries = (Object.entries(log) as [DemoId, NonNullable<ClassLog[DemoId]>][]).sort((a, b) => b[1].lastAt - a[1].lastAt);
  return <section className="class-log" aria-label="课堂练习记录">
    <header><BarChart3 size={18} /><strong>课堂练习记录</strong><small>只记录各课做了几题、对了几题，保存在本浏览器</small></header>
    {entries.length === 0 ? <p className="class-log-empty">还没有课堂练习记录。上完课做几道随堂练习，这里会显示掌握情况。</p>
      : <><ul>{entries.map(([id, e]) => { const m = masteryOf(e); return <li key={id}><span>{DEMOS[id].title}</span><div className="class-log-bar" aria-hidden="true"><i style={{ width: `${Math.round((m.rate ?? 0) * 100)}%` }} /></div><small>{e.correct}/{e.attempts} · {m.label}</small></li>; })}</ul>
        <button type="button" className="class-log-clear" onClick={() => { if (window.confirm("清除所有课堂练习记录？原来的练习和学情不受影响。")) onClear(); }}>清除课堂记录</button></>}
  </section>;
}

export function LessonView({ demo, grade, unitTitle, onBack, preset }: { demo: DemoId; grade: Grade; unitTitle: string; onBack: () => void; preset?: Params }) {
  const def = DEMOS[demo];
  const [params, setParams] = useState<Params>(() => normalizeParams(demo, { ...defaultParams(demo), ...(preset ?? {}) }));
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
  const [aiCfg, setAiCfg] = useAiConfig();

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
  // 语音朗读：换到新的一步时读出老师的话；暂停时停止朗读；离开课堂时停止
  const [narrate, setNarrate] = useNarrate();
  const said = useRef<{ index: number; playing: boolean; first: boolean }>({ index: -1, playing: false, first: true });
  useEffect(() => {
    const prev = said.current;
    said.current = { index: player.index, playing: player.playing, first: false };
    if (!narrate) { hushSpeak(); return; }
    if (prev.first) return;
    if (prev.index === player.index && prev.playing && !player.playing) { hushSpeak(); return; }
    if (prev.index === player.index && prev.playing === player.playing && prev.index !== -1) return;
    const say = steps[player.index]?.say;
    if (say) speakPrompt(say);
  }, [player.index, player.playing, narrate, steps]);
  useEffect(() => () => hushSpeak(), []);

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
          <AiPanel cfg={aiCfg} setCfg={setAiCfg} onReply={setMessage} context={() => ({ grade, demo, params, facts: boardAt(steps, steps.length - 1).map((v) => (v.item.kind === "column" ? v.item.lines.join(" ") : v.item.text)), lastWrong: lastWrong ? { prompt: lastWrong.q.prompt, given: lastWrong.given, answer: lastWrong.q.answer } : undefined })} />
          <p className="tutor-note"><ShieldAlert size={13} />{aiCfg.enabled && aiCfg.apiKey ? "快捷按钮由离线规则老师处理；输入框的问题交给你设置的 AI。" : "离线规则老师：按年级和你的反馈调整讲法，不联网。"}</p>
        </section>
        <label className="motion-toggle"><input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />减少动态效果</label>
        {canSpeak() ? <label className="motion-toggle"><input type="checkbox" checked={narrate} onChange={(e) => { setNarrate(e.target.checked); if (e.target.checked) speakPrompt(steps[player.index]?.say ?? ""); }} />语音朗读老师的话</label> : null}
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
    <div ref={quizRef}>{showQuiz ? <Quiz demo={demo} grade={grade} level={tutor.level} setLevel={(level) => setTutor((t) => ({ ...t, level }))} nonce={quizNonce} onRecord={(r) => { if (!r.ok) setLastWrong(r); recordAnswer(window.localStorage, demo, r.ok); }} />
      : <button type="button" className="quiz-start" onClick={() => ask("quiz")}>开始随堂练习</button>}</div>
  </div>;
}
