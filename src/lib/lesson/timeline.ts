/**
 * 课堂时间轴：纯数据状态机。
 * 画面完全由 (steps, index, progress) 推导，所以暂停、继续、跳转、回放后的板书一定一致。
 */

export type BoardItem =
  | { kind: "text"; id: string; text: string; tone?: "title" | "note" | "result" | "warn" }
  | { kind: "formula"; id: string; text: string }
  | { kind: "column"; id: string; lines: string[] }
  | { kind: "mark"; id: string; target: string; text: string };

export type LessonStep = {
  id: string;
  /** 字幕/讲解 */
  say: string;
  /** 这一步写到黑板上的内容（之前步骤写下的内容会保留） */
  board: BoardItem[];
  /** 这一步需要高亮的板书 id */
  highlight?: string[];
  /** 交给演示组件的场景状态，例如 { reveal: 2 } */
  scene?: Record<string, number>;
  /** 1 倍速下的停留时长（毫秒） */
  durationMs: number;
};

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export type PlayerState = {
  index: number;
  /** 当前步骤已播放的比例 0—1 */
  progress: number;
  playing: boolean;
  speed: Speed;
  /** 播放到最后一步结束 */
  ended: boolean;
};

export type PlayerAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "seek"; index: number }
  | { type: "restart" }
  | { type: "speed"; speed: Speed }
  | { type: "showAll" }
  | { type: "tick"; dtMs: number }
  | { type: "commit"; index: number; progress: number; playing: boolean; ended: boolean; speed: number };

export function initialPlayer(): PlayerState {
  return { index: 0, progress: 0, playing: false, speed: 1, ended: false };
}

const clampIndex = (i: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(Number.isFinite(i) ? i : 0)));

export function reducePlayer(steps: readonly LessonStep[], state: PlayerState, action: PlayerAction): PlayerState {
  const n = steps.length;
  if (n === 0) return initialPlayer();
  const last = n - 1;
  switch (action.type) {
    case "play":
      if (state.ended) return { ...state, index: 0, progress: 0, ended: false, playing: true };
      return { ...state, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "toggle":
      return reducePlayer(steps, state, { type: state.playing ? "pause" : "play" });
    case "next":
      if (state.index >= last) return { ...state, progress: 1, playing: false, ended: true };
      return { ...state, index: state.index + 1, progress: 0, ended: false };
    case "prev":
      return { ...state, index: Math.max(0, state.index - 1), progress: 0, ended: false };
    case "seek":
      return { ...state, index: clampIndex(action.index, n), progress: 0, ended: false };
    case "restart":
      return { ...state, index: 0, progress: 0, ended: false, playing: true };
    case "speed":
      return SPEEDS.includes(action.speed) ? { ...state, speed: action.speed } : state;
    case "showAll":
      return { ...state, index: last, progress: 1, playing: false, ended: true };
    case "commit": {
      const index = clampIndex(action.index, n);
      const progress = typeof action.progress === "number" && Number.isFinite(action.progress) ? Math.min(1, Math.max(0, action.progress)) : 0;
      const speed = SPEEDS.includes(action.speed as Speed) ? action.speed as Speed : state.speed;
      const ended = action.ended === true;
      return { index, progress, playing: action.playing === true && !ended, speed, ended };
    }
    case "tick": {
      if (!state.playing || !(action.dtMs > 0) || !Number.isFinite(action.dtMs)) return state;
      let { index, progress } = state;
      let budget = action.dtMs * state.speed;
      while (budget > 0) {
        const total = Math.max(1, steps[index].durationMs);
        const remain = (1 - progress) * total;
        if (budget < remain) { progress += budget / total; budget = 0; break; }
        budget -= remain;
        if (index >= last) return { ...state, index, progress: 1, playing: false, ended: true };
        index += 1; progress = 0;
      }
      return { ...state, index, progress };
    }
  }
}

export type BoardView = { item: BoardItem; fresh: boolean; highlighted: boolean }[];

/** 当前应该显示的板书：0..index 步写下的全部内容，最新一步标记为 fresh。 */
export function boardAt(steps: readonly LessonStep[], index: number): BoardView {
  if (steps.length === 0) return [];
  const i = clampIndex(index, steps.length);
  const highlight = new Set(steps[i].highlight ?? []);
  const view: BoardView = [];
  for (let s = 0; s <= i; s++) {
    for (const item of steps[s].board) {
      const at = view.findIndex((v) => v.item.id === item.id);
      const entry = { item, fresh: s === i, highlighted: highlight.has(item.id) };
      if (at >= 0) view[at] = entry; else view.push(entry);
    }
  }
  for (const v of view) if (highlight.has(v.item.id)) v.highlighted = true;
  return view;
}

/** 合并 0..index 步的场景状态，后写的覆盖先写的。 */
export function sceneAt(steps: readonly LessonStep[], index: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (steps.length === 0) return out;
  const i = clampIndex(index, steps.length);
  for (let s = 0; s <= i; s++) Object.assign(out, steps[s].scene ?? {});
  return out;
}

export function totalDurationMs(steps: readonly LessonStep[]): number {
  return steps.reduce((sum, s) => sum + s.durationMs, 0);
}
