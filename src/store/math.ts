import { unitById } from "../lib/math/units.ts";
import { recordActivity } from "../lib/activity.ts";
import { create } from "zustand";
import { CHAPTERS, DAILY_COUNT, DRILL_COUNT, QUESTIONS_PER_LEVEL, SPRINT_COUNT, SPRINT_SECONDS } from "../lib/math/chapters.ts";
import { isCorrect, starsFor } from "../lib/math/grade.ts";
import {
  makeDailySet,
  makeLevelSet,
  makeMixedSet,
  makeSimilar,
  makeReviewSet,
} from "../lib/math/generate.ts";
import {
  isLevelUnlocked,
  shiftStamp,
  starKey,
  todayStamp,
  unlockedChapterIds,
} from "../lib/math/progress.ts";
import { randomRng } from "../lib/math/rng.ts";
import { SKILL_DRILL, inferSkill, isSkillId, touchSkill, type SkillId } from "../lib/math/skills.ts";
import type { AnswerLog, Grade, PlayKind, Question, Screen, WrongItem } from "../lib/math/types.ts";

import { ACTIVITY_KEY, activityForBackup } from "../lib/activity.ts";
import { CLASS_LOG_KEY, classLogForBackup } from "../lib/lesson/class-log.ts";
import { SAVE_KEY, SAVE_VERSION, UNREADABLE_KEY, emptyPersist, parseSave, salvageSave, type BackupExtras, type PersistShape } from "../lib/math/save.ts";

type Session = {
  kind: PlayKind;
  chapterId?: string;
  unitId?: string;
  assessment?: boolean;
  advanced?: boolean;
  level?: number;
  questions: Question[];
  index: number;
  combo: number;
  maxCombo: number;
  logs: AnswerLog[];
  shownAt: number;
  startedAt: number;
  feedback: null | { ok: boolean; given: string };
  retried: boolean;
  skill?: SkillId;
};

type Duel = {
  remain: number;
  npcScore: number;
  npcAcc: number;
  npcDelay: number;
};

type MathState = PersistShape & {
  screen: Screen;
  session: Session | null;
  duel: Duel | null;
  sprintRemain: number;
  lastStars: number;
  storageError: string | null;
  storageBlocked: boolean;
  /** 存档容错读取后的说明（不是错误，不阻止保存） */
  storageNotice: string | null;
  /** 恢复备份后加一，让仍挂在页面上的一周记录、课堂汇总重新读取。 */
  archiveEpoch: number;
  setGrade: (grade: Grade) => void;
  restore: (data: PersistShape, extras?: BackupExtras | null) => boolean;
  hydrate: () => void;
  persist: () => void;
  setMuted: (muted: boolean) => void;
  go: (screen: Screen) => void;
  startLevel: (chapterId: string, level: number) => void;
  startDaily: () => void;
  startTopic: (chapterId: string, advanced?: boolean) => void;
  startUnit: (unitId: string, assessment?: boolean) => void;
  startReview: () => void;
  startDuel: () => void;
  startSprint: () => void;
  startDrill: (skill?: SkillId) => void;
  submit: (given: string) => boolean;
  advance: () => void;
  tickDuel: (dt: number) => void;
  tickSprint: (dt: number) => void;
  abandon: () => void;
  clearWrong: () => void;
};

function slicePersist(s: PersistShape): PersistShape {
  return {
    version: SAVE_VERSION,
    unitStats: s.unitStats,
    selectedGrade: s.selectedGrade,
    dailyByGrade: s.dailyByGrade,
    stars: s.stars,
    xp: s.xp,
    streak: s.streak,
    lastPlayDate: s.lastPlayDate,
    lastDaily: s.lastDaily,
    wrong: s.wrong,
    stats: s.stats,
    muted: s.muted,
    skillStats: s.skillStats,
    sprintBest: s.sprintBest,
  };
}

function touchStreak(s: PersistShape): PersistShape {
  const today = todayStamp();
  if (s.lastPlayDate === today) return s;
  const streak = s.lastPlayDate === shiftStamp(today, -1) ? s.streak + 1 : 1;
  return { ...s, lastPlayDate: today, streak };
}

function pushWrong(list: WrongItem[], item: WrongItem): WrongItem[] {
  const next = [item, ...list.filter((w) => w.prompt !== item.prompt || w.chapterId !== item.chapterId)];
  return next.slice(0, 40);
}

function closeSession(s: MathState, session: Session): Partial<MathState> {
  const correct = session.logs.filter((l) => l.ok).length;
  const avg =
    session.logs.length === 0
      ? 0
      : session.logs.reduce((n, l) => n + l.ms, 0) / session.logs.length;
  const earned = session.kind === "campaign" ? starsFor(correct, session.logs.length, avg) : 0;
  let stars = s.stars;
  if (session.kind === "campaign" && session.chapterId && session.level) {
    const key = starKey(session.chapterId, session.level);
    const prev = stars[key] ?? 0;
    if (earned > prev) stars = { ...stars, [key]: earned };
  }
  let lastDaily = s.lastDaily;
  const sprintBest = session.kind === "sprint" ? Math.max(s.sprintBest, correct) : s.sprintBest;
  let next: PersistShape = {
    ...slicePersist(s),
    stars,
    sprintBest,
    xp: s.xp + correct * 10 + session.maxCombo * 2,
  };
  if (session.kind === "daily" && session.logs.length > 0) {
    lastDaily = todayStamp();
    next.dailyByGrade = { ...s.dailyByGrade, [s.selectedGrade]: lastDaily };
  }
  if (session.kind === "unit" && session.unitId && session.logs.length) {
    const previous = s.unitStats[session.unitId];
    next.unitStats = { ...s.unitStats, [session.unitId]: { completed: (previous?.completed ?? 0) + 1, correct, total: session.logs.length, at: Date.now(), mode: session.assessment ? "check" : "practice" } };
  }
  next = session.logs.length ? touchStreak({ ...next, lastDaily }) : next;
  return {
    ...next,
    lastStars: earned,
    screen: "result",
    session: { ...session, feedback: null },
    sprintRemain: 0,
  };
}

function newSession(kind: PlayKind, questions: Question[], extra?: Partial<Session>): Session {
  const now = performance.now();
  return {
    kind,
    questions,
    index: 0,
    combo: 0,
    maxCombo: 0,
    logs: [],
    shownAt: now,
    startedAt: now,
    feedback: null,
    retried: false,
    ...extra,
  };
}

/** 把读不懂的原始存档另存到 UNREADABLE_KEY（已有不同内容时加时间戳），写后读回确认；失败返回 null。 */
function keepUnreadableCopy(raw: string): string | null {
  try {
    const existing = localStorage.getItem(UNREADABLE_KEY);
    if (existing === raw) return UNREADABLE_KEY;
    const key = existing === null ? UNREADABLE_KEY : `${UNREADABLE_KEY}-${Date.now()}`;
    localStorage.setItem(key, raw);
    return localStorage.getItem(key) === raw ? key : null;
  } catch { return null; }
}

export const useMath = create<MathState>((set, get) => ({
  ...emptyPersist(),
  screen: "home",
  session: null,
  duel: null,
  sprintRemain: 0,
  lastStars: 0,
  storageError: null,
  storageBlocked: false,
  storageNotice: null,
  archiveEpoch: 0,
  hydrate: () => {
    let raw: string | null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch {
      set({ storageError: "浏览器不允许读取本机存储（可能是隐私模式或禁用了网站数据）。当前练习不会保存。", storageBlocked: true, storageNotice: null });
      return;
    }
    if (!raw) { set({ ...emptyPersist(), storageError: null, storageBlocked: false, storageNotice: null }); return; }
    let json: unknown = undefined;
    try { json = JSON.parse(raw); } catch { /* 不是合法 JSON，下面按损坏处理 */ }
    try {
      set({ ...parseSave(json), storageError: null, storageBlocked: false, storageNotice: null });
      return;
    } catch { /* 严格校验没通过，尝试容错读取 */ }
    // 容错读取：先把原始存档另存一份（写入并读回确认），成功后才使用能识别的部分；另存失败就保持只读保护。
    const salvaged = json === undefined ? null : salvageSave(json);
    const copied = salvaged ? keepUnreadableCopy(raw) : null;
    if (salvaged && copied) {
      set({ ...salvaged.data, storageError: null, storageBlocked: false,
        storageNotice: `存档里有 ${salvaged.dropped} 条记录无法识别，已跳过，其余记录照常使用。原始存档已在本浏览器另存一份，没有删除。` });
      return;
    }
    set({ storageError: "无法读取原存档，已保护原数据。当前练习暂不保存，请先在学情页下载原存档或恢复有效备份。", storageBlocked: true, storageNotice: null });
  },
  persist: () => {
    if (get().storageBlocked) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(slicePersist(get())));
      if (get().storageError) set({ storageError: null });
    } catch {
      set({ storageError: "浏览器未能保存进度。请在学情页导出备份，避免关闭后丢失。" });
    }
  },
  setGrade: (grade) => {
    if (![1, 2, 3, 4, 5, 6].includes(grade)) return;
    set({ selectedGrade: grade, session: null, duel: null, sprintRemain: 0, screen: "home" });
    get().persist();
  },
  restore: (data, extras = null) => {
    const revert = (prev: Record<string, string | null>) => {
      for (const [key, value] of Object.entries(prev)) {
        try {
          if (value == null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        } catch { /* 回滚失败时只保留错误提示 */ }
      }
    };
    try {
      const checked = parseSave(data);
      const extrasChecked = extras ? { classLog: classLogForBackup(extras.classLog), activity: activityForBackup(extras.activity) } : null;
      const writes: [string, string][] = [[SAVE_KEY, JSON.stringify(checked)]];
      if (extrasChecked) writes.push([CLASS_LOG_KEY, JSON.stringify(extrasChecked.classLog)], [ACTIVITY_KEY, JSON.stringify(extrasChecked.activity)]);
      const prev: Record<string, string | null> = {};
      for (const [key] of writes) prev[key] = localStorage.getItem(key);
      try {
        for (const [key, value] of writes) localStorage.setItem(key, value);
        for (const [key, value] of writes) if (localStorage.getItem(key) !== value) throw new Error("readback");
      } catch (error) {
        revert(prev);
        throw error;
      }
      set({ ...checked, session: null, duel: null, sprintRemain: 0, screen: "report", storageError: null, storageBlocked: false, storageNotice: null, archiveEpoch: get().archiveEpoch + 1 });
      return true;
    } catch {
      set({ storageError: "恢复失败，原有记录未被替换。请检查文件或浏览器存储空间。" });
      return false;
    }
  },
  setMuted: (muted) => {
    set({ muted });
    get().persist();
  },
  go: (screen) => set({ screen, session: null, duel: null, sprintRemain: 0 }),
  startLevel: (chapterId, level) => {
    const chapter = CHAPTERS.find((c) => c.id === chapterId);
    if (!chapter || !isLevelUnlocked(get().stars, chapterId, level)) return;
    set({ selectedGrade: chapter.grade });
    const questions = makeLevelSet(chapterId, level, QUESTIONS_PER_LEVEL, randomRng());
    set({
      screen: "play",
      lastStars: 0,
      session: newSession("campaign", questions, { chapterId, level }),
      duel: null,
      sprintRemain: 0,
    });
  },
  startTopic: (chapterId, advanced = false) => {
    const chapter = CHAPTERS.find(c => c.id === chapterId && c.grade === get().selectedGrade);
    if (!chapter) return;
    const rng = randomRng();
    const questions = Array.from({length:8},(_,i)=>makeLevelSet(chapterId, (advanced ? 5 : 1) + i%4, 1, rng)[0]!);
    set({ screen: "play", lastStars: 0, session: newSession("topic", questions, {chapterId,advanced}), duel: null, sprintRemain: 0 });
  },
  startUnit: (unitId, assessment = false) => {
    const unit = unitById(unitId);
    if (!unit) return;
    const rng = randomRng();
    const count = assessment ? 12 : 8;
    const questions = Array.from({ length: count }, (_, i) => makeLevelSet(unit.chapterId, i % 8 + 1, 1, rng)[0]!);
    set({ selectedGrade: 3, screen: "play", lastStars: 0, session: newSession("unit", questions, { chapterId: unit.chapterId, unitId, assessment }), duel: null, sprintRemain: 0 });
  },
  startDaily: () => {
    const ids = unlockedChapterIds(get().stars, get().selectedGrade);
    const stats = get().stats;
    const acc = stats.answered ? stats.correct / stats.answered : 0.5;
    set({
      screen: "play",
      lastStars: 0,
      session: newSession("daily", makeDailySet(ids, gradeWrong(get()), DAILY_COUNT, randomRng(), acc)),
      duel: null,
      sprintRemain: 0,
    });
  },
  startReview: () => {
    const wrong = gradeWrong(get());
    if (!wrong.length) {
      set({ screen: "review" });
      return;
    }
    set({
      screen: "play",
      lastStars: 0,
      session: newSession("review", makeReviewSet(wrong, randomRng())),
      duel: null,
      sprintRemain: 0,
    });
  },
  startDuel: () => {
    const ids = unlockedChapterIds(get().stars, get().selectedGrade);
    const q = makeMixedSet(ids, 40, randomRng());
    set({
      screen: "duel",
      lastStars: 0,
      session: newSession("duel", q),
      duel: { remain: 60, npcScore: 0, npcAcc: 0, npcDelay: 2.6 },
      sprintRemain: 0,
    });
  },
  startSprint: () => {
    const q = makeMixedSet(unlockedChapterIds(get().stars, get().selectedGrade), SPRINT_COUNT, randomRng());
    set({
      screen: "play",
      lastStars: 0,
      session: newSession("sprint", q),
      duel: null,
      sprintRemain: SPRINT_SECONDS,
    });
  },
  startDrill: (skill) => {
    const s = get();
    const picked = skill ?? gradeWrong(s).find((w) => isSkillId(w.skill))?.skill as SkillId | undefined;
    const recent = gradeWrong(s).find((w) => w.skill === picked);
    const suggested = picked ? SKILL_DRILL[picked] : undefined;
    const target = recent ? { chapterId: recent.chapterId, level: 4 }
      : suggested && CHAPTERS.some((c) => c.id === suggested.chapterId && c.grade === s.selectedGrade) ? suggested
      : { chapterId: unlockedChapterIds(s.stars, s.selectedGrade)[0]!, level: 3 };
    const canTarget = !!picked && (recent || suggested?.chapterId === target.chapterId);
    const rng = randomRng();
    const questions = Array.from({ length: DRILL_COUNT }, () => makeSimilar({ chapterId: target.chapterId, skill: canTarget ? picked : undefined }, rng));
    set({
      screen: "play",
      lastStars: 0,
      session: newSession("drill", questions, { chapterId: target.chapterId, level: target.level, skill: canTarget ? picked : undefined }),
      duel: null,
      sprintRemain: 0,
    });
  },
  submit: (given) => {
    const session = get().session;
    if (!session || session.feedback || !["play", "duel"].includes(get().screen) || !given.trim()) return false;
    const q = session.questions[session.index];
    if (!q) return false;
    const ok = isCorrect(q, given);
    if (typeof window !== "undefined" && window.localStorage) recordActivity(window.localStorage, ok);
    const ms = Math.max(200, performance.now() - session.shownAt);
    const combo = ok ? session.combo + 1 : 0;
    const skill = q.skill ?? inferSkill(q);
    const logs = [...session.logs, { prompt: q.prompt, given, ok, ms, skill }];
    let wrong = get().wrong;
    if (!ok) {
      wrong = pushWrong(wrong, {
        prompt: q.prompt,
        answer: q.answer,
        explain: q.explain,
        chapterId: q.chapterId,
        given,
        at: Date.now(),
        trap: q.trap,
        skill,
        mode: q.mode,
        choices: q.choices,
        keypad: q.keypad,
      });
    } else {
      wrong = wrong.filter((w) => w.prompt !== q.prompt || w.chapterId !== q.chapterId);
    }
    const skillStats = touchSkill(get().skillStats, skill, ok, ms, session.retried || session.kind === "review" || session.kind === "drill");
    set({
      wrong,
      skillStats,
      stats: { answered: get().stats.answered + 1, correct: get().stats.correct + (ok ? 1 : 0) },
      session: {
        ...session,
        combo,
        maxCombo: Math.max(session.maxCombo, combo),
        logs,
        feedback: { ok, given },
      },
    });
    get().persist();
    return ok;
  },
  advance: () => {
    const s = get();
    const session = s.session;
    if (!session || !session.feedback || !["play", "duel"].includes(s.screen)) return;
    const nextIndex = session.index + 1;
    if (session.kind === "duel") {
      if (!s.duel || s.duel.remain <= 0) {
        set({ screen: "result", session: { ...session, feedback: null } });
        return;
      }
      set({
        session: {
          ...session,
          index: nextIndex % session.questions.length,
          shownAt: performance.now(),
          feedback: null,
        },
      });
      return;
    }
    if (session.kind === "sprint") {
      if (s.sprintRemain <= 0 || nextIndex >= session.questions.length) {
        const patch = closeSession(s, session);
        set(patch);
        get().persist();
        return;
      }
      set({
        session: {
          ...session,
          index: nextIndex,
          shownAt: performance.now(),
          feedback: null,
        },
      });
      return;
    }
    if (nextIndex >= session.questions.length) {
      if (!session.retried && !(session.kind === "unit" && session.assessment)) {
        const missed = session.logs.filter((l) => !l.ok);
        const rng = randomRng();
        const extras: Question[] = [];
        for (const m of missed) {
          const src = session.questions.find((q) => q.prompt === m.prompt);
          extras.push(makeSimilar({ chapterId: src?.chapterId ?? session.questions[0]!.chapterId, skill: src?.skill, prompt: m.prompt }, rng, [...session.questions, ...extras]));
        }
        if (extras.length > 0) {
          set({
            session: {
              ...session,
              questions: [...session.questions, ...extras],
              index: nextIndex,
              shownAt: performance.now(),
              feedback: null,
              retried: true,
            },
          });
          return;
        }
      }
      const patch = closeSession(s, session);
      set(patch);
      get().persist();
      return;
    }
    set({
      session: {
        ...session,
        index: nextIndex,
        shownAt: performance.now(),
        feedback: null,
      },
    });
  },
  tickDuel: (dt) => {
    const s = get();
    if (!s.duel || !s.session || s.screen !== "duel" || !Number.isFinite(dt) || dt <= 0) return;
    const remain = Math.max(0, s.duel.remain - dt);
    let npcScore = s.duel.npcScore;
    let npcAcc = s.duel.npcAcc + dt;
    let npcDelay = s.duel.npcDelay;
    if (remain > 0 && npcAcc >= npcDelay) {
      npcAcc = 0;
      npcDelay = 2.1 + Math.random() * 1.4;
      if (Math.random() < 0.78) npcScore += 1;
    }
    if (remain <= 0) {
      const session = s.session;
      const patch = closeSession(
        { ...s, duel: { ...s.duel, remain: 0, npcScore } },
        session,
      );
      set({
        ...patch,
        duel: { remain: 0, npcScore, npcAcc: 0, npcDelay },
      });
      get().persist();
      return;
    }
    set({ duel: { remain, npcScore, npcAcc, npcDelay } });
  },
  tickSprint: (dt) => {
    const s = get();
    if (!s.session || s.session.kind !== "sprint" || s.screen !== "play" || !Number.isFinite(dt) || dt <= 0) return;
    const remain = Math.max(0, s.sprintRemain - dt);
    if (remain <= 0) {
      const patch = closeSession({ ...s, sprintRemain: 0 }, s.session);
      set(patch);
      get().persist();
      return;
    }
    set({ sprintRemain: remain });
  },
  abandon: () => {
    set({ screen: "home", session: null, duel: null, sprintRemain: 0 });
    get().persist();
  },
  clearWrong: () => {
    set({ wrong: get().wrong.filter((w) => CHAPTERS.find((c) => c.id === w.chapterId)?.grade !== get().selectedGrade) });
    get().persist();
  },
}));

export function gradeWrong(s: Pick<PersistShape, "wrong" | "selectedGrade">): WrongItem[] {
  const ids = new Set(CHAPTERS.filter((c) => c.grade === s.selectedGrade).map((c) => c.id));
  return s.wrong.filter((w) => ids.has(w.chapterId));
}
