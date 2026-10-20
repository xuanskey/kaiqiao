import { useState } from "react";
import { UnitProgress } from "./learning";
import { ArrowRight, BookOpen, Check, ChevronRight, Download, Flame, Lightbulb, LockKeyhole, Map as MapIcon, RotateCcw, Search, Sparkles, Star, Target, Timer, Trophy, Zap, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAPTERS, GRADE_LABEL, LEVELS_PER_CHAPTER, chapterById, chaptersOfGrade } from "@/lib/math/chapters";
import { unlockAudio, playTap } from "@/lib/math/audio";
import { chapterStarSum, clearedLevels, currentStreak, isChapterUnlocked, isLevelUnlocked, nextCampaign, starKey, todayStamp, totalStars } from "@/lib/math/progress";
import { SKILL_LABEL, isSkillId, oralPace, weakSkills } from "@/lib/math/skills";
import { downloadText } from "@/lib/download";
import { cn } from "@/lib/utils";
import { useMath } from "@/store/math";
import { Mascot } from "./mascot";
import { Backup } from "./backup";
import { Meter, Metric, PageHeading } from "./shell";

export function Home() {
  const s = useMath();
  const next = nextCampaign(s.stars, s.selectedGrade);
  const chapter = chapterById(next.chapterId);
  const count = s.wrong.filter((w) => chapterById(w.chapterId).grade === s.selectedGrade).length;
  const dailyDone = s.dailyByGrade[s.selectedGrade] === todayStamp();
  const done = chaptersOfGrade(s.selectedGrade).reduce((n, c) => n + clearedLevels(s.stars, c.id), 0);
  const all = chaptersOfGrade(s.selectedGrade).length * LEVELS_PER_CHAPTER;
  const tap = (action: () => void) => { unlockAudio(); if (!s.muted) playTap(); action(); };
  return <div className="page-enter">
    <PageHeading eyebrow={`${GRADE_LABEL[s.selectedGrade]} · 今日练习`} title={dailyDone ? "今天的练习完成啦。" : "今天，也开窍一点。"} description={dailyDone ? "想多练一会儿，就挑个知识点，或去错题本把难题再想一遍。" : "每天 10 道题，先想清楚，再动手。答错也没关系，每道题都有讲解。"} />
    <div className="home-feature-grid">
      <section className="daily-card" aria-labelledby="daily-title">
        <span className="hero-kicker"><span className="status-dot" />{dailyDone ? "今天已完成" : "今天的小目标"}</span>
        <div className="daily-copy"><h2 id="daily-title">每天一组，<br />把数学练明白。</h2><p>{GRADE_LABEL[s.selectedGrade]} · 10 道基础题<br />答错的题会收进错题本。</p></div>
        <div className="hero-art"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="math-doodle doodle-one">+</span><span className="math-doodle doodle-two">÷</span><Mascot mood={dailyDone ? "happy" : "idle"} /></div>
        <Button className="daily-button" size="lg" onClick={() => tap(s.startDaily)}>{dailyDone ? <Check /> : <Sparkles />}{dailyDone ? "再练一组" : "开始每日练习"}<ArrowRight /></Button>
      </section>
      <section className="journey-card" aria-labelledby="journey-title">
        <div className="flex items-center justify-between"><span className="section-kicker"><MapIcon size={17} />我的闯关旅程</span><span className="soft-badge">{GRADE_LABEL[s.selectedGrade]}</span></div>
        <div className="journey-path" aria-hidden="true"><span className={done ? "path-done" : ""}>{done ? <Check size={16} /> : <MapIcon size={15} />}</span><i /><span className="path-current"><Star size={22} /></span><i /><span><LockKeyhole size={15} /></span></div>
        <h2 id="journey-title">{chapter.name}</h2><p className="muted-copy">下一站 · 第 {next.level} 关 · 每关 8 题</p>
        <div className="progress-caption"><span>本年级已通关</span><strong>{done} <small>/ {all}</small></strong></div><Meter value={done} max={all} label="本年级闯关进度" />
        <Button variant="secondary" size="lg" className="mt-5 w-full justify-between" onClick={() => tap(() => s.startLevel(next.chapterId, next.level))}>{done ? "继续闯关" : "开始闯关"}<ArrowRight /></Button>
      </section>
    </div>
    <section className="learning-entry"><span className="mode-icon"><Lightbulb size={24}/></span><div><span className="eyebrow">{s.selectedGrade===3?"原创理解实验室":"按知识点练"}</span><h2>先想明白，再练到会。</h2><p>{s.selectedGrade===3?"三年级 18 个知识单元，配分步讲解和互动实验。":`${GRADE_LABEL[s.selectedGrade]} ${chaptersOfGrade(s.selectedGrade).length} 个题库模块，按知识点自由练习。`}</p></div><Button onClick={() => s.go(s.selectedGrade===3?"learn":"map")}>{s.selectedGrade===3?"去理解":"选知识点"}<ArrowRight/></Button></section>
    <div className="section-heading"><h2>换个方式练一练</h2><span>按自己的节奏来</span></div>
    <div className="mode-grid">
      <ModeCard icon={BookOpen} tone="peach" title="错题再想想" description={count ? `${count} 道待巩固 · 把难点变熟悉` : "暂时没有错题，继续保持"} onClick={() => tap(() => s.go("review"))} />
      <ModeCard icon={Timer} tone="blue" title="90 秒小挑战" description="先求答对，再试试快一点" onClick={() => tap(s.startSprint)} />
      <ModeCard icon={Zap} tone="lavender" title="和窍窍比一比" description="60 秒 · 与电脑伙伴一起练" onClick={() => tap(s.startDuel)} />
    </div>
    <div className="section-heading"><h2>每一步，都有记录</h2><span>所有年级累计</span></div>
    <div className="metrics-grid"><Metric icon={Flame} tone="peach" label="连续练习 · 天" value={String(currentStreak(s.streak, s.lastPlayDate))} /><Metric icon={Star} tone="gold" label="闯关星星" value={String(totalStars(s.stars))} /><Metric icon={Lightbulb} label="成长积分" value={String(s.xp)} /></div>
    <p className="gentle-note"><Sparkles size={14} />不用和别人比，看见自己的进步就很好。</p>
  </div>;
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
  const s = useMath();
  const wrong = s.wrong.filter((w) => chapterById(w.chapterId).grade === s.selectedGrade);
  return <div className="page-enter">
    <PageHeading eyebrow={`${GRADE_LABEL[s.selectedGrade]} · 把难点变熟悉`} title="错题本" description="先重做原题，再练同考点。原题答对后，就会移出这里。" action={wrong.length ? <Button onClick={s.startReview}><RotateCcw />重做错题<ArrowRight /></Button> : undefined} />
    {!wrong.length ? <section className="empty-state"><span className="empty-illustration"><BookOpen size={40} /><Check size={23} /></span><h2>还没有错题，轻装出发。</h2><p>练习里暂时没答对的题，会收进这里。<br />每次弄懂一道，就是一次进步。</p><Button size="lg" onClick={s.startDaily}>去练一组<ArrowRight /></Button></section> : <>
      <div className="review-summary"><BookOpen size={18} /><span>本年级还有 <strong>{wrong.length}</strong> 道题可以再想想</span></div>
      <ul className="wrong-list">{wrong.map((w, index) => <li key={w.at + w.prompt} className="wrong-card">
        <div className="flex items-start gap-3"><span className="question-number">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><div className="wrong-tags"><span>{chapterById(w.chapterId).name}</span>{isSkillId(w.skill) ? <span>{SKILL_LABEL[w.skill]}</span> : null}</div><h2>{w.prompt}</h2><div className="answer-comparison"><span>上次回答 <b>{w.given}</b></span><span>正确答案 <strong>{w.answer}</strong></span></div><details className="explanation"><summary>看看解题思路<ChevronRight size={16} /></summary><p>{w.explain}</p>{w.trap ? <p className="explanation-tip"><Lightbulb size={15} />{w.trap}</p> : null}</details></div></div>
      </li>)}</ul>
      <div className="review-footer"><p>记录只保存在当前浏览器，换设备前记得备份。</p><Button variant="ghost" onClick={() => { if (window.confirm("清空本年级错题？清空前可在学情页导出备份。")) s.clearWrong(); }}>清空本年级错题</Button></div>
    </>}
  </div>;
}

export function Report() {
  const s = useMath();
  const acc = s.stats.answered ? Math.round(s.stats.correct / s.stats.answered * 100) : null;
  const weak = weakSkills(s.skillStats);
  const pace = oralPace(s.skillStats);
  const wrong = s.wrong.filter((w) => chapterById(w.chapterId).grade === s.selectedGrade);
  const streak = currentStreak(s.streak, s.lastPlayDate);
  const recommendation = wrong.length ? `先把${GRADE_LABEL[s.selectedGrade]}的 ${wrong.length} 道错题想明白，再接着向前。` : `练一组${GRADE_LABEL[s.selectedGrade]}的题目，慢慢积累自己的学习记录。`;
  const exportReport = () => downloadText(`开窍-学情-${todayStamp()}.txt`, [
    `开窍学情 · ${todayStamp()}`,
    "范围：本浏览器所有年级，包含复习和未完成练习中的已答题。",
    `累计 ${s.stats.answered} 题，正确率 ${acc === null ? '暂无' : `${acc}%`}`,
    `连续练习 ${streak} 天`, recommendation,
    ...weak.slice(0, 4).map((row) => `${row.label} ${Math.round(row.acc * 100)}% · ${row.seen} 题`),
    "只跟自己比，不排名。",
  ].join('\n'));
  return <div className="page-enter">
    <PageHeading eyebrow="看见自己的每一步" title="学习小结" description="汇总当前浏览器内所有年级的练习记录，只和自己比。" action={<Button variant="outline" onClick={exportReport}><Download />导出学情</Button>} />
    <div className="report-overview">
      <section className="accuracy-card"><div className="accuracy-ring" style={{ '--accuracy': `${acc ?? 0}%` } as import('react').CSSProperties}><div><strong>{acc === null ? '—' : acc}<small>{acc === null ? '' : '%'}</small></strong><span>{acc === null ? '等待第一次练习' : '累计正确率'}</span></div></div><p>{s.stats.answered ? `答对 ${s.stats.correct} / ${s.stats.answered} 题` : '还没有练习记录，开始一组就好。'}</p></section>
      <div className="report-metrics"><Metric icon={Target} label="累计答题" value={String(s.stats.answered)} /><Metric icon={Flame} tone="peach" label="连续练习 · 天" value={String(streak)} /><Metric icon={Star} tone="gold" label="闯关星星" value={String(totalStars(s.stars))} /><Metric icon={Lightbulb} tone="lavender" label="成长积分" value={String(s.xp)} /></div>
    </div>
    <div className="report-columns"><div>
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
