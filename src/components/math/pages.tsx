import { ConfirmAction } from "@/components/ui/confirm-action";
import { dueReviews, reviewId } from "@/lib/math/review";
import { useEffect, useState } from "react";
import { classSummary, dateLabel, greeting, requestLesson, todayPicks } from "@/lib/lesson/today";
import { loadClassLog, type ClassLog } from "@/lib/lesson/class-log";
import { loadActivity, weekSummary, type Activity } from "@/lib/activity";
import type { DemoId } from "@/lib/lesson/demos";
import { UnitProgress } from "./learning";
import { ArrowRight, BookOpen, FlaskConical, NotebookPen, Presentation, Check, ChevronRight, Download, Flame, Lightbulb, LockKeyhole, Map as MapIcon, RotateCcw, Search, Sparkles, Star, Target, Timer, Trophy, Zap, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAPTERS, GRADE_LABEL, LEVELS_PER_CHAPTER, chapterById, chaptersOfGrade } from "@/lib/math/chapters";
import { unlockAudio, playTap } from "@/lib/math/audio";
import { chapterStarSum, clearedLevels, currentStreak, isChapterUnlocked, isLevelUnlocked, nextCampaign, starKey, todayStamp, totalStars } from "@/lib/math/progress";
import { SKILL_LABEL, attemptSummary, skillRows, isSkillId, oralPace, weakSkills } from "@/lib/math/skills";
import { downloadText } from "@/lib/download";
import { cn } from "@/lib/utils";
import { useMath } from "@/store/math";
import { Mascot } from "./mascot";
import { Backup } from "./backup";
import { Meter, Metric, PageHeading } from "./shell";

export function Home() {
  const s = useMath();
  const now = useNow();
  const epoch = useMath((state) => state.archiveEpoch);
  const [log, setLog] = useState<ClassLog>({});
  useEffect(() => { setLog(loadClassLog(typeof window === "undefined" ? undefined : window.localStorage)); }, [epoch]);
  const next = nextCampaign(s.stars, s.selectedGrade);
  const chapter = chapterById(next.chapterId);
  const count = s.wrong.filter((w) => chapterById(w.chapterId).grade === s.selectedGrade).length;
  const dueCount = dueReviews(s.reviewData, s.selectedGrade, +now).length;
  const dailyDone = s.dailyByGrade[s.selectedGrade] === todayStamp();
  const done = chaptersOfGrade(s.selectedGrade).reduce((n, c) => n + clearedLevels(s.stars, c.id), 0);
  const all = chaptersOfGrade(s.selectedGrade).length * LEVELS_PER_CHAPTER;
  const picks = todayPicks(s.selectedGrade, now);
  const cls = classSummary(log, now);
  const tap = (action: () => void) => { unlockAudio(); if (!s.muted) playTap(); action(); };
  const openLesson = (demo: DemoId) => tap(() => { requestLesson(demo, s.selectedGrade, "今日推荐"); s.go("class"); });
  const plan = [
    { key: "class", done: cls.today, title: "上一节互动课", detail: picks.math ? `推荐：${picks.math.title}` : "去课堂选一节课", action: () => (picks.math ? openLesson(picks.math.id) : tap(() => s.go("class"))), icon: Presentation },
    { key: "daily", done: dailyDone, title: "完成每日练习", detail: `${GRADE_LABEL[s.selectedGrade]} · 10 道基础题`, action: () => tap(s.startDaily), icon: Target },
    { key: "review", done: dueCount === 0, title: "今日到期复习", detail: dueCount ? `${dueCount} 道到期 · 含逾期题` : "今日暂无到期题，可主动再练", action: () => tap(() => s.go("review")), icon: NotebookPen },
  ];
  const doneCount = plan.filter((x) => x.done).length;
  const nextStep = plan.find((x) => !x.done);
  return <div className="page-enter home-v2">
    <header className="home-hero-head">
      <div>
        <p className="eyebrow">{dateLabel(now)} · {GRADE_LABEL[s.selectedGrade]}</p>
        <h1>{greeting(now.getHours())}，今天也开窍一点。</h1>
        <p className="page-description">{doneCount === 3 ? "今天的计划全部完成啦，真棒！想多学一点，就去课堂做个实验。" : "按下面三步来：先看懂，再练习，最后把错题弄明白。"}</p>
      </div>
      <div className="home-pills" aria-label="今日概况">
        <span className="home-pill tone-peach"><Flame size={15} />连续 {currentStreak(s.streak, s.lastPlayDate)} 天</span>
        <span className="home-pill tone-gold"><Star size={15} />{totalStars(s.stars)} 颗星</span>
      </div>
    </header>

    <section className="plan-card" aria-labelledby="plan-title">
      <div className="plan-main">
        <span className="hero-kicker"><span className="status-dot" />{doneCount === 3 ? "今日计划已完成" : `今日计划 · 还差 ${3 - doneCount} 个学习步骤`}</span>
        <div className="plan-head">
          <ProgressRing value={doneCount} max={3} />
          <div><h2 id="plan-title">今天的学习计划</h2><p>{nextStep ? `下一步：${nextStep.title}` : "三步都完成了，给自己点个赞！"}</p></div>
        </div>
        <ol className="plan-steps">{plan.map((step, i) => { const Icon = step.icon; return <li key={step.key}>
          <button type="button" className={cn("plan-step", step.done && "is-done", step === nextStep && "is-next")} onClick={step.action}>
            <span className="plan-step-no">{step.done ? <Check size={15} /> : i + 1}</span>
            <span className="plan-step-icon"><Icon size={18} /></span>
            <span className="plan-step-text"><strong>{step.title}</strong><small>{step.detail}</small></span>
            <ArrowRight size={16} className="plan-step-arrow" />
          </button>
        </li>; })}</ol>
      </div>
      <div className="plan-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="math-doodle doodle-one">+</span><span className="math-doodle doodle-two">÷</span><Mascot mood={doneCount === 3 ? "happy" : "idle"} /></div>
    </section>

    <div className="section-heading"><h2>今日推荐</h2><span>每天自动换一节</span></div>
    <div className="pick-grid">
      {picks.math ? <PickCard tone="math" kicker="数学互动课" title={picks.math.title} summary={picks.math.summary} cta="去上课" icon={Presentation} onClick={() => openLesson(picks.math!.id)} /> : null}
      {picks.science ? <PickCard tone="science" kicker="科学小实验" title={picks.science.title} summary={picks.science.summary} cta="做实验" icon={FlaskConical} onClick={() => openLesson(picks.science!.id)} /> : null}
    </div>

    <div className="home-feature-grid home-feature-grid--v2">
      <section className="journey-card" aria-labelledby="journey-title">
        <div className="flex items-center justify-between"><span className="section-kicker"><MapIcon size={17} />我的闯关旅程</span><span className="soft-badge">{GRADE_LABEL[s.selectedGrade]}</span></div>
        <div className="journey-path" aria-hidden="true"><span className={done ? "path-done" : ""}>{done ? <Check size={16} /> : <MapIcon size={15} />}</span><i /><span className="path-current"><Star size={22} /></span><i /><span><LockKeyhole size={15} /></span></div>
        <h2 id="journey-title">{chapter.name}</h2><p className="muted-copy">下一站 · 第 {next.level} 关 · 每关 8 题</p>
        <div className="progress-caption"><span>本年级已通关</span><strong>{done} <small>/ {all}</small></strong></div><Meter value={done} max={all} label="本年级闯关进度" />
        <Button variant="secondary" size="lg" className="mt-5 w-full justify-between" onClick={() => tap(() => s.startLevel(next.chapterId, next.level))}>{done ? "继续闯关" : "开始闯关"}<ArrowRight /></Button>
      </section>
      <section className="learning-entry learning-entry--v2"><span className="mode-icon"><Lightbulb size={24}/></span><div><span className="eyebrow">{s.selectedGrade===3?"原创理解实验室":"按知识点练"}</span><h2>先想明白，再练到会。</h2><p>{s.selectedGrade===3?"三年级 18 个知识单元，配分步讲解和互动实验。":`${GRADE_LABEL[s.selectedGrade]} ${chaptersOfGrade(s.selectedGrade).length} 个题库模块，按知识点自由练习。`}</p></div><Button onClick={() => s.go(s.selectedGrade===3?"learn":"map")}>{s.selectedGrade===3?"去理解":"选知识点"}<ArrowRight/></Button></section>
    </div>

    <div className="section-heading"><h2>换个方式练一练</h2><span>按自己的节奏来</span></div>
    <div className="mode-grid">
      <ModeCard icon={BookOpen} tone="peach" title="今日复习与错题本" description={`${dueCount} 道今日到期 · ${count} 道错题可主动再练`} onClick={() => tap(() => s.go("review"))} />
      <ModeCard icon={Timer} tone="blue" title="90 秒小挑战" description="先求答对，再试试快一点" onClick={() => tap(s.startSprint)} />
      <ModeCard icon={Zap} tone="lavender" title="和窍窍比一比" description="60 秒 · 与电脑伙伴一起练" onClick={() => tap(s.startDuel)} />
    </div>
    <div className="section-heading"><h2>这一周</h2><span>练习和课堂的答题都算</span></div>
    <WeekCard />
    <div className="section-heading"><h2>每一步，都有记录</h2><span>所有年级累计</span></div>
    <div className="metrics-grid metrics-grid--4"><Metric icon={Flame} tone="peach" label="连续练习 · 天" value={String(currentStreak(s.streak, s.lastPlayDate))} /><Metric icon={Star} tone="gold" label="闯关星星" value={String(totalStars(s.stars))} /><Metric icon={Lightbulb} label="成长积分" value={String(s.xp)} /><Metric icon={Presentation} tone="blue" label="课堂练习 · 题" value={String(cls.attempts)} /></div>
    <p className="gentle-note"><Sparkles size={14} />不用和别人比，看见自己的进步就很好。</p>
  </div>;
}

export function WeekCard() {
  const now = useNow();
  const epoch = useMath((state) => state.archiveEpoch);
  const [act, setAct] = useState<Activity>({});
  useEffect(() => { setAct(loadActivity(typeof window === "undefined" ? undefined : window.localStorage)); }, [epoch]);
  const w = weekSummary(act, now);
  const top = Math.max(10, ...w.days.map((d) => d.n));
  return <section className="week-card" aria-label="最近 7 天学习记录">
    <div className="week-copy">
      <strong>{w.n ? `${w.n} 题` : "还没开始"}</strong>
      <span>{w.n ? `最近 7 天学了 ${w.activeDays} 天${w.rate === null ? "" : ` · 答对 ${w.rate}%`}` : "最近 7 天的答题会画在这里"}</span>
    </div>
    <ol className="week-bars">{w.days.map((d) => <li key={d.stamp} className={cn(d.today && "is-today", d.n > 0 && "has-data")}>
      <span className="week-bar" role="img" aria-label={`${d.label}，${d.n} 题，答对 ${d.ok} 题`} title={`${d.label}：${d.n} 题，答对 ${d.ok} 题`}><i style={{ height: `${Math.max(d.n ? 8 : 0, Math.round((d.n / top) * 100))}%` }} /></span>
      <small>{d.label}</small><b>{d.n || ""}</b>
    </li>)}</ol>
  </section>;
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(t); }, []);
  return now;
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const r = 26, c = 2 * Math.PI * r, ratio = Math.min(1, value / Math.max(1, max));
  return <div className="progress-ring" role="img" aria-label={`今日计划完成 ${value}/${max} 个学习步骤`}>
    <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r={r} className="ring-track" /><circle cx="32" cy="32" r={r} className="ring-value" strokeDasharray={`${c * ratio} ${c}`} transform="rotate(-90 32 32)" /></svg>
    <strong>{value}<small>/{max}</small></strong>
  </div>;
}

function PickCard({ tone, kicker, title, summary, cta, icon: Icon, onClick }: { tone: string; kicker: string; title: string; summary: string; cta: string; icon: LucideIcon; onClick: () => void }) {
  return <button type="button" className={`pick-card pick-${tone}`} onClick={onClick}>
    <span className="pick-icon"><Icon size={22} /></span>
    <span className="pick-kicker">{kicker}</span>
    <strong>{title}</strong>
    <small>{summary}</small>
    <span className="pick-cta">{cta}<ArrowRight size={15} /></span>
  </button>;
}

function ModeCard({ icon: Icon, tone, title, description, onClick }: { icon: LucideIcon; tone: string; title: string; description: string; onClick: () => void }) {
  return <button type="button" className="mode-card" onClick={onClick}><span className={`mode-icon tone-${tone}`}><Icon size={23} /></span><div><h3>{title}</h3><p>{description}</p></div><ChevronRight size={17} className="mode-arrow" /></button>;
}

export function Map() {
  const s = useMath();
  const [mode,setMode]=useState<"topic"|"journey">("topic");
  const [advanced,setAdvanced]=useState(false);
  const [query,setQuery]=useState("");
  const chapters=chaptersOfGrade(s.selectedGrade).filter(c=>`${c.name}${c.blurb}`.includes(query.trim()));
  const next = nextCampaign(s.stars, s.selectedGrade);
  return <div className="page-enter">
    <PageHeading eyebrow={`${GRADE_LABEL[s.selectedGrade]} · 我的学习路线`} title="题库与闯关" description="选一个今天想练的知识点。每组 8 题，答错会追加同类题帮你巩固。" action={<span className="star-total"><Star size={19} />{chaptersOfGrade(s.selectedGrade).reduce((sum, c) => sum + chapterStarSum(s.stars, c.id), 0)} 星</span>} />
    <div className="bank-toolbar"><div className="theme-tabs" aria-label="练习方式"><button type="button" aria-pressed={mode==="topic"} onClick={()=>setMode("topic")}>按知识点练</button><button type="button" aria-pressed={mode==="journey"} onClick={()=>setMode("journey")}>闯关路线</button></div><span className="soft-badge">{GRADE_LABEL[s.selectedGrade]} · {chaptersOfGrade(s.selectedGrade).length} 个模块</span></div>
    {mode==="topic"?<>
      <div className="bank-filters"><label className="learning-search"><Search size={16} aria-hidden="true"/><input aria-label="搜索本年级题库" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜知识点或题型…"/></label><div className="theme-tabs" aria-label="练习层次"><button type="button" aria-pressed={!advanced} onClick={()=>setAdvanced(false)}>基础一组</button><button type="button" aria-pressed={advanced} onClick={()=>setAdvanced(true)}>进阶一组</button></div></div>
      <div className="unit-grid">{chapters.map((chapter,index)=><button type="button" className="unit-card" key={chapter.id} onClick={()=>s.startTopic(chapter.id,advanced)}><div><span className="unit-number">{String(index+1).padStart(2,"0")}</span>{["上册","下册","上·下","选学拓展"].includes(chapter.term)?<small>{chapter.term}</small>:null}</div><h2>{chapter.name}</h2><p>{chapter.blurb}</p><footer><span>{advanced?"进阶":"基础"} · 练 8 题</span><ArrowRight size={17}/></footer></button>)}</div>
      {!chapters.length?<p className="gentle-note">没找到相关知识点，换个关键词试试，比如“乘法”“面积”。</p>:null}
      <p className="gentle-note">按知识点练不用解锁，会计入学情，但不拿闯关星星。题目均为原创，并非教材逐课同步。</p>
    </>:<>
    <p className="gentle-note">每章通过 3 关，就能解锁下一章。</p>
    <ol className="chapter-grid">{chaptersOfGrade(s.selectedGrade).map((chapter, index) => {
      const open = isChapterUnlocked(s.stars, chapter.id);
      const done = clearedLevels(s.stars, chapter.id);
      return <li key={chapter.id} className={cn("chapter-card", !open && "chapter-card--locked")}>
        <div className="chapter-top"><span className="chapter-number">{String(index + 1).padStart(2, "0")}</span><span>{chapter.term}</span>{open ? <span className="ml-auto">已过 {done}/{LEVELS_PER_CHAPTER} 关</span> : <span className="ml-auto flex items-center gap-1"><LockKeyhole size={13} />待解锁</span>}</div>
        <h2>{chapter.name}</h2><p>{chapter.blurb}</p>
        <div className="level-grid">{Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => {
          const level = i + 1;
          const got = s.stars[starKey(chapter.id, level)] ?? 0;
          const unlocked = open && isLevelUnlocked(s.stars, chapter.id, level);
          const current = next.chapterId === chapter.id && next.level === level;
          return <button key={level} type="button" className={cn("level-button", got > 0 && "level-button--done", current && "level-button--current")} disabled={!unlocked} aria-label={`${chapter.name}，第 ${level} 关，${unlocked ? `${got} 星${current ? '，推荐下一关' : ''}` : '未解锁'}`} onClick={() => { unlockAudio(); if (!s.muted) playTap(); s.startLevel(chapter.id, level); }}>
            <span>{!unlocked ? <LockKeyhole size={16} /> : level}</span><span className="level-stars" aria-hidden="true">{[1, 2, 3].map((star) => <Star key={star} size={9} className={star <= got ? "is-earned" : ""} />)}</span>
          </button>;
        })}</div>
        <p className="chapter-foot">{open ? `${chapterStarSum(s.stars, chapter.id)} / ${LEVELS_PER_CHAPTER * 3} 颗星星` : "上一章通过 3 关后开启"}</p>
      </li>;
    })}</ol></>}
  </div>;
}

export function Review() {
  const [, refresh] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => refresh(n => n + 1), 30000); return () => window.clearInterval(timer); }, []);
  const s = useMath();
  const wrong = s.wrong.filter((w) => chapterById(w.chapterId).grade === s.selectedGrade);
  const due = dueReviews(s.reviewData, s.selectedGrade);
  const pending = Object.entries(s.reviewData.schedule).filter(([id]) => s.reviewData.content[id] && chapterById(s.reviewData.content[id].chapterId).grade === s.selectedGrade);
  const nextDue = pending.length ? Math.min(...pending.map(([, state]) => state.dueAt)) : null;
  return <div className="page-enter">
    <section className="surface-card mb-5" aria-label="今日复习">
      <h2>今日到期复习 · {due.length} 题</h2>
      <p>{due.length ? "包含逾期题。独立作答后更新下次日期，同组关联题延后到明天。" : pending.length ? `今天暂无到期题。下次：${new Date(nextDue!).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}（北京时间）` : "还没有复习队列。普通练习中的错题与巩固题，会安排在次日复习。"}</p>
      <Button onClick={due.length ? s.startDueReview : s.startDaily}>{due.length ? "开始今日复习" : "去普通练习"}<ArrowRight /></Button>
      <p className="footnote">按北京时间安排；试验间隔为次日 / 3 天 / 7 天。主动再练不推进已有到期日；当天看过答案或再练后，复习不升级阶段，次日再来。</p>
    </section>
    <PageHeading eyebrow={`${GRADE_LABEL[s.selectedGrade]} · 把难点变熟悉`} title="错题本" description="先重做原题，再练同考点。原题答对后移出错题本，仍保留在跨天复习队列。" action={wrong.length ? <Button onClick={s.startReview}><RotateCcw />主动再练<ArrowRight /></Button> : undefined} />
    {!wrong.length ? <section className="empty-state"><span className="empty-illustration"><BookOpen size={40} /><Check size={23} /></span><h2>还没有错题，轻装出发。</h2><p>练习里暂时没答对的题，会收进这里。<br />每次弄懂一道，就是一次进步。</p><Button size="lg" onClick={s.startDaily}>去练一组<ArrowRight /></Button></section> : <>
      <div className="review-summary"><BookOpen size={18} /><span>本年级还有 <strong>{wrong.length}</strong> 道题可以再想想</span></div>
      <ul className="wrong-list">{wrong.map((w, index) => <li key={w.at + w.prompt} className="wrong-card">
        <div className="flex items-start gap-3"><span className="question-number">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><div className="wrong-tags"><span>{chapterById(w.chapterId).name}</span>{isSkillId(w.skill) ? <span>{SKILL_LABEL[w.skill]}</span> : null}</div><h2>{w.prompt}</h2><details className="explanation" onToggle={(event) => { if (event.currentTarget.open) s.revealReview(reviewId(w)); }}><summary>查看答案与解题思路<ChevronRight size={16} /></summary><div className="answer-comparison"><span>上次回答 <b>{w.given}</b></span><span>正确答案 <strong>{w.answer}</strong></span></div><p>{w.explain}</p>{w.trap ? <p className="explanation-tip"><Lightbulb size={15} />{w.trap}</p> : null}</details></div></div>
      </li>)}</ul>
      <div className="review-footer"><p>记录只保存在当前浏览器，换设备前记得备份。</p><ConfirmAction title="清空本年级错题？" description="跨天复习队列仍保留。清空前可在学情页导出备份。" confirmLabel="清空错题" onConfirm={s.clearWrong}><Button variant="ghost">清空本年级错题</Button></ConfirmAction></div>
    </>}
  </div>;
}

export function Report() {
  const s = useMath();
  const acc = s.stats.answered ? Math.round(s.stats.correct / s.stats.answered * 100) : null;
  const rows = skillRows(s.skillStats);
  const weak = weakSkills(s.skillStats);
  const pace = oralPace(s.skillStats);
  const wrong = s.wrong.filter((w) => chapterById(w.chapterId).grade === s.selectedGrade);
  const streak = currentStreak(s.streak, s.lastPlayDate);
  const recommendation = wrong.length ? `先把${GRADE_LABEL[s.selectedGrade]}的 ${wrong.length} 道错题想明白，再接着向前。` : `练一组${GRADE_LABEL[s.selectedGrade]}的题目，慢慢积累自己的学习记录。`;
  const exportReport = () => {
    const store = typeof window === "undefined" ? undefined : window.localStorage;
    const now = new Date();
    const week = weekSummary(loadActivity(store), now);
    const cls = classSummary(loadClassLog(store), now);
    downloadText(`开窍-学情-${todayStamp()}.txt`, [
      `开窍学情 · ${todayStamp()}`,
      "范围：本浏览器所有年级，包含复习和未完成练习中的已答题。",
      `累计 ${s.stats.answered} 题，正确率 ${acc === null ? '暂无' : `${acc}%`}`,
      `连续练习 ${streak} 天`,
      `最近 7 天：${week.n} 题，学习 ${week.activeDays} 天，正确率 ${week.rate === null ? "暂无" : `${week.rate}%`}`,
      `课堂练习：${cls.attempts} 题，答对 ${cls.correct} 题`,
      recommendation,
      "分列统计从 v0.13.4 开始；首答为普通练习初始题，巩固为错后追加、错题回炉和对症练。旧记录仅保留在累计中。",
      ...rows.map(row => `${row.label}：${attemptSummary(s.skillStats[row.id])}`),
      ...weak.slice(0, 4).map((row) => `${row.label} ${Math.round(row.acc * 100)}% · ${row.seen} 题`),
      "只跟自己比，不排名。课堂练习不计入上面的累计答题。",
    ].join('\n'));
  };
  return <div className="page-enter">
    <PageHeading eyebrow="看见自己的每一步" title="学习小结" description="汇总当前浏览器内所有年级的练习记录，只和自己比。" action={<Button variant="outline" onClick={exportReport}><Download />导出学情</Button>} />
    <div className="report-overview">
      <section className="accuracy-card"><div className="accuracy-ring" style={{ '--accuracy': `${acc ?? 0}%` } as import('react').CSSProperties}><div><strong>{acc === null ? '—' : acc}<small>{acc === null ? '' : '%'}</small></strong><span>{acc === null ? '等待第一次练习' : '累计正确率'}</span></div></div><p>{s.stats.answered ? `答对 ${s.stats.correct} / ${s.stats.answered} 题` : '还没有练习记录，开始一组就好。'}</p></section>
      <div className="report-metrics"><Metric icon={Target} label="累计答题" value={String(s.stats.answered)} /><Metric icon={Flame} tone="peach" label="连续练习 · 天" value={String(streak)} /><Metric icon={Star} tone="gold" label="闯关星星" value={String(totalStars(s.stars))} /><Metric icon={Lightbulb} tone="lavender" label="成长积分" value={String(s.xp)} /></div>
    </div>
    <section className="surface-card mt-5"><h2>首答与巩固</h2><p className="footnote">分列统计从 v0.13.4 开始；首答为普通练习初始题，巩固为错后追加、错题回炉和对症练。旧记录仅保留在累计中。</p>{rows.length ? <ul className="skill-list">{rows.map(row => <li key={row.id}><strong>{row.label}</strong><p>{attemptSummary(s.skillStats[row.id])}</p></li>)}</ul> : <p className="muted-copy">完成练习后显示首答与巩固记录。</p>}</section>
    <div className="section-heading"><h2>最近 7 天</h2><span>每天做了多少题</span></div>
    <WeekCard />
    <div className="report-columns mt-5"><div>
      <section className="recommend-card"><span className="section-kicker"><Lightbulb size={18} />接下来，练什么？</span><h2>{wrong.length ? '把错题变成拿手题。' : '保持练习，慢慢积累。'}</h2><p>{recommendation}</p><Button onClick={wrong.length ? s.startReview : s.startDaily}>{wrong.length ? '重做本年级错题' : '练一组本年级题目'}<ArrowRight /></Button></section>
      <section className="surface-card mt-5"><div className="section-heading mt-0"><h2>值得再巩固的地方</h2><span>所有年级</span></div>{weak.length ? <ul className="skill-list">{weak.slice(0, 4).map((row) => <li key={row.id}><div className="progress-caption"><strong>{row.label}</strong><span>{Math.round(row.acc * 100)}% · {row.seen} 次作答</span></div><Meter value={row.acc * 100} max={100} label={`${row.label}正确率`} /></li>)}</ul> : <p className="muted-copy leading-relaxed">{s.stats.answered ? '暂未发现有足够记录的薄弱项。继续练习，让小结更清楚。' : '完成练习后，这里会显示需要巩固的考点。'}</p>}<p className="footnote">每个考点至少有 3 次作答，才会纳入分析。</p>{pace ? <p className="pace-note"><Timer size={16} />{pace.line}</p> : null}{s.sprintBest ? <p className="pace-note"><Trophy size={16} />限时最好成绩：{s.sprintBest} 题（所有年级）</p> : null}</section>
    </div><div>
      <section className="surface-card"><div className="section-heading mt-0"><h2>闯关进度</h2><span>按年级查看</span></div><div className="grade-progress">{([1, 2, 3, 4, 5, 6] as const).map((grade) => {
        const chapters = CHAPTERS.filter((c) => c.grade === grade);
        const done = chapters.reduce((sum, c) => sum + clearedLevels(s.stars, c.id), 0);
        return <details key={grade} open={grade === s.selectedGrade}><summary><span>{GRADE_LABEL[grade]}</span><small>{done}/{chapters.length * LEVELS_PER_CHAPTER} 关</small><ChevronRight size={16} /></summary><ul>{chapters.map((c) => <li key={c.id}><span>{c.name}</span><span>{clearedLevels(s.stars, c.id)}/{LEVELS_PER_CHAPTER} <Star size={12} />{chapterStarSum(s.stars, c.id)}</span></li>)}</ul></details>;
      })}</div></section>
      <UnitProgress /><Backup />
    </div></div>
    <p className="gentle-note">已提交的答案会计入统计；未完成的练习不计通关和连续练习。</p>
  </div>;
}
