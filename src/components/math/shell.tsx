import { useEffect, useRef, type ReactNode } from "react";
import { BarChart3, ChevronDown, Home, Library, NotebookPen, Presentation, ShieldCheck, Volume2, VolumeX, type LucideIcon } from "lucide-react";
import { GRADE_LABEL, chapterById } from "@/lib/math/chapters";
import { unlockAudio } from "@/lib/math/audio";
import type { Grade, Screen } from "@/lib/math/types";
import { useMath } from "@/store/math";
import { cn } from "@/lib/utils";
import { LogoMark, Mascot } from "./mascot";

const NAV: { screen: Screen; label: string; icon: LucideIcon }[] = [
  { screen: "home", label: "首页", icon: Home },
  { screen: "class", label: "课堂", icon: Presentation },
  { screen: "map", label: "题库", icon: Library },
  { screen: "review", label: "错题本", icon: NotebookPen },
  { screen: "report", label: "学情", icon: BarChart3 },
];

/** “理解实验室”并入课堂：在理解页时，导航高亮“课堂”。 */
const navOf = (screen: Screen): Screen => (screen === "learn" ? "class" : screen);

export function AppShell({ screen, children }: { screen: Screen; children: ReactNode }) {
  const go = useMath((s) => s.go);
  const muted = useMath((s) => s.muted);
  const setMuted = useMath((s) => s.setMuted);
  const wrong = useMath((s) => s.wrong);
  const grade = useMath((s) => s.selectedGrade);
  const storageError = useMath((s) => s.storageError);
  const storageNotice = useMath((s) => s.storageNotice);
  const main = useRef<HTMLElement>(null);
  const previousScreen = useRef(screen);
  const focus = ["play", "duel", "result"].includes(screen);
  const wrongCount = wrong.filter((w) => chapterById(w.chapterId).grade === grade).length;
  useEffect(() => {
    if (screen !== previousScreen.current) {
      window.scrollTo({ top: 0, behavior: "instant" });
      main.current?.focus({ preventScroll: true });
      previousScreen.current = screen;
    }
  }, [screen]);

  return <div className={cn("app-shell", focus && "app-shell--focus")}>
    {!focus ? <aside className="sidebar">
      <div className="brand"><LogoMark /><div><strong>开窍</strong><span>每天一点，慢慢开窍</span></div></div>
      <p className="nav-caption">我的学习</p>
      <nav className="main-nav" aria-label="主导航">
        {NAV.map(({ screen: target, label, icon: Icon }) => <button key={target} type="button" onClick={() => go(target)} aria-current={navOf(screen) === target ? "page" : undefined} className={cn("nav-item", navOf(screen) === target && "is-active")}>
          <Icon size={20} /><span>{label}</span>{target === "review" && wrongCount > 0 ? <b className="nav-count">{wrongCount}</b> : null}
        </button>)}
      </nav>
      <div className="sidebar-note"><Mascot /><p>不用一下子全会，<br />每次弄懂一点就很好。</p></div>
      <div className="local-note"><ShieldCheck size={16} /><span>进度保存在当前浏览器</span></div>
    </aside> : null}
    <div className="workspace">
      {!focus ? <header className="topbar">
        <div className="mobile-brand"><LogoMark /><strong>开窍</strong></div>
        <span className="desktop-context">小学数学与科学 · 学习空间</span>
        <div className="topbar-actions"><GradePicker /><button type="button" className="icon-button" aria-label={muted ? "打开声音" : "关闭声音"} aria-pressed={!muted} onClick={() => { unlockAudio(); setMuted(!muted); }}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button></div>
      </header> : null}
      <main className="main-content" ref={main} tabIndex={-1} aria-label="学习内容">
        {storageError ? <p role="alert" className="storage-alert">{storageError}</p> : null}
        {storageNotice ? <p role="status" className="storage-alert storage-notice">{storageNotice}<button type="button" onClick={() => useMath.setState({ storageNotice: null })}>知道了</button></p> : null}
        {children}
      </main>
    </div>
  </div>;
}

function GradePicker() {
  const grade = useMath((s) => s.selectedGrade);
  const setGrade = useMath((s) => s.setGrade);
  return <div className="grade-picker">
    <label htmlFor="grade">练习年级</label>
    <div className="relative"><select id="grade" value={grade} onChange={(e) => setGrade(Number(e.target.value) as Grade)}>
      {([1, 2, 3, 4, 5, 6] as const).map((g) => <option key={g} value={g}>{GRADE_LABEL[g]}</option>)}
    </select><ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" /></div>
  </div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div>;
}

export function Metric({ label, value, icon: Icon, tone = "green" }: { label: string; value: string; icon?: LucideIcon; tone?: string }) {
  return <div className="metric">{Icon ? <span className={`metric-icon tone-${tone}`}><Icon size={18} /></span> : null}<div><strong>{value}</strong><span>{label}</span></div></div>;
}

export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return <div className="meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}><span style={{ width: `${Math.min(100, Math.max(0, value / Math.max(1, max) * 100))}%` }} /></div>;
}
