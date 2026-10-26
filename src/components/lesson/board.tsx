import type { RefObject } from "react";
import { ChevronLeft, ChevronRight, ListChecks, Pause, Play, RotateCcw } from "lucide-react";
import { SPEEDS, boardAt, type LessonStep, type PlayerAction, type PlayerState, type Speed } from "@/lib/lesson/timeline";
import { splitForGrade } from "@/lib/lesson/grade-style";
import type { Grade } from "@/lib/math/types";
import { cn } from "@/lib/utils";

/** 动态板书：之前写下的内容保留，最新一步“写”出来，重点用荧光笔高亮。 */
export function Board({ steps, player, grade }: { steps: LessonStep[]; player: PlayerState; grade: Grade }) {
  const view = boardAt(steps, player.index);
  return <div className="board" aria-label="课堂板书">
    {view.length === 0 ? <p className="board-empty">黑板还空着，点“播放”开始上课。</p> : null}
    {view.map(({ item, fresh, highlighted }) => {
      const cls = cn("board-item", fresh && "is-fresh", highlighted && "is-highlight", item.kind === "text" && item.tone && `tone-${item.tone}`);
      if (item.kind === "column") return <pre key={item.id} className={cn(cls, "board-column")}>{item.lines.join("\n")}</pre>;
      if (item.kind === "formula") return <p key={item.id} className={cn(cls, "board-formula")}>{item.text}</p>;
      if (item.kind === "mark") return <p key={item.id} className={cn(cls, "board-mark")}>{item.text}</p>;
      return <p key={item.id} className={cls}>{item.text}</p>;
    })}
    <SubtitleLine text={steps[player.index]?.say ?? ""} grade={grade} />
  </div>;
}

function SubtitleLine({ text, grade }: { text: string; grade: Grade }) {
  return <div className="board-subtitle" aria-live="polite">{splitForGrade(text, grade).map((s, i) => <span key={i}>{s}</span>)}</div>;
}

/** 课堂控制：播放、暂停、上一步、下一步、重新开始、倍速、跳到某一步、查看完整过程。 */
export function PlayerControls({ steps, player, dispatch, progressRef }: { steps: LessonStep[]; player: PlayerState; dispatch: (a: PlayerAction) => void; progressRef?: RefObject<HTMLElement | null> }) {
  return <div className="player" role="group" aria-label="课堂控制">
    <div className="player-progress" aria-hidden="true"><i ref={progressRef} style={{ width: `${((player.index + player.progress) / Math.max(1, steps.length)) * 100}%` }} /></div>
    <div className="player-row">
      <button type="button" className="player-main" onClick={() => dispatch({ type: "toggle" })} aria-label={player.playing ? "暂停" : player.ended ? "重新播放" : "播放"}>
        {player.playing ? <Pause size={20} /> : <Play size={20} />}<span>{player.playing ? "暂停" : player.ended ? "重新播放" : player.index > 0 || player.progress > 0 ? "继续" : "播放"}</span>
      </button>
      <button type="button" onClick={() => dispatch({ type: "prev" })} disabled={player.index === 0} aria-label="上一步"><ChevronLeft size={18} /><span>上一步</span></button>
      <button type="button" onClick={() => dispatch({ type: "next" })} disabled={player.ended} aria-label="下一步"><span>下一步</span><ChevronRight size={18} /></button>
      <button type="button" onClick={() => dispatch({ type: "restart" })} aria-label="重新开始"><RotateCcw size={17} /><span>重新开始</span></button>
      <button type="button" onClick={() => dispatch({ type: "showAll" })} aria-label="查看完整过程"><ListChecks size={17} /><span>完整过程</span></button>
      <label className="player-speed">速度<select value={player.speed} onChange={(e) => dispatch({ type: "speed", speed: Number(e.target.value) as Speed })}>{SPEEDS.map((s) => <option key={s} value={s}>{`${s} 倍`}</option>)}</select></label>
    </div>
    <ol className="player-steps" aria-label="跳到指定步骤">
      {steps.map((s, i) => <li key={s.id}><button type="button" aria-label={`第 ${i + 1} 步：${s.say}`} aria-current={i === player.index ? "step" : undefined} className={cn(i < player.index && "is-done", i === player.index && "is-current")} onClick={() => dispatch({ type: "seek", index: i })}>{i + 1}</button></li>)}
    </ol>
  </div>;
}
