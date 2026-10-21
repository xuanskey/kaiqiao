import type { Grade } from "../math/types.ts";
import { bandOf } from "./grade-style.ts";
import { lifeExample, DEMOS, type DemoId } from "./demos.ts";
import type { PracticeQ } from "./practice.ts";

/**
 * 离线规则老师：不联网、不调用大模型，按年级和学生的反馈选择讲法。
 * 它只返回“要做什么”，由界面执行（重播、换讲法、出题……），绝不执行文本里的代码。
 */
export type TutorIntent = "repeat" | "another" | "example" | "confused" | "try" | "quiz" | "why-wrong" | "harder" | "easier";

export const TUTOR_ACTIONS: { intent: TutorIntent; label: string }[] = [
  { intent: "repeat", label: "老师，再讲一遍" },
  { intent: "another", label: "换一种方法讲" },
  { intent: "example", label: "举个生活中的例子" },
  { intent: "confused", label: "我没听懂" },
  { intent: "try", label: "让我自己试试" },
  { intent: "quiz", label: "给我出一道题" },
  { intent: "why-wrong", label: "这道题为什么错了？" },
  { intent: "harder", label: "再难一点" },
  { intent: "easier", label: "简单一点" },
];

export type TutorState = {
  variant: number;
  /** 下一题准备使用的难度；当前题实际难度保存在 PracticeQ.level。 */
  level: number;
  speed: number;
  confusedCount: number;
};

export type TutorEffect =
  | { type: "restart" }
  | { type: "variant"; variant: number }
  | { type: "speed"; speed: number }
  | { type: "level"; level: number }
  | { type: "interactive" }
  | { type: "quiz" }
  | { type: "none" };

export type TutorReply = { text: string; effects: TutorEffect[]; state: TutorState };

export function initialTutor(): TutorState {
  return { variant: 0, level: 2, speed: 1, confusedCount: 0 };
}

const praise = ["你愿意说出来，这很好。", "没关系，我们换个角度看。", "慢慢来，弄懂比做快更重要。"];

export function tutorRespond(intent: TutorIntent, demo: DemoId, grade: Grade, state: TutorState, lastWrong?: { q: PracticeQ; given: string; hint?: string }): TutorReply {
  const band = bandOf(grade);
  const s = { ...state };
  switch (intent) {
    case "repeat":
      return { text: band === "low" ? "好的，我们从头再看一遍。" : "好，从第一步重新讲，注意看黑板上高亮的地方。", effects: [{ type: "restart" }], state: s };
    case "another":
      s.variant = s.variant === 1 ? 0 : 1;
      return { text: s.variant === 1 ? "换一种想法来讲。" : "回到原来的讲法。", effects: [{ type: "variant", variant: s.variant }, { type: "restart" }], state: s };
    case "example":
      s.variant = 2;
      return { text: lifeExample(demo, grade), effects: [{ type: "variant", variant: 2 }, { type: "restart" }], state: s };
    case "confused": {
      s.confusedCount += 1;
      s.speed = s.confusedCount >= 2 ? 0.5 : 0.75;
      s.level = Math.max(1, s.level - 1);
      const tip = band === "low" ? "我们放慢一点，一次只看一步。" : band === "mid" ? "我放慢速度，你每看完一步可以点“下一步”。" : "我们放慢速度。每一步先自己想想“为什么”，再点下一步。";
      return { text: `${praise[(s.confusedCount - 1) % praise.length]}${tip}`, effects: [{ type: "speed", speed: s.speed }, { type: "level", level: s.level }, { type: "restart" }], state: s };
    }
    case "try":
      return { text: band === "low" ? "动手拖一拖、点一点吧！" : `自己调一调参数，看看结果怎样变化。${DEMOS[demo].summary}`, effects: [{ type: "interactive" }], state: s };
    case "quiz":
      return { text: "来，试试这道题。", effects: [{ type: "quiz" }], state: s };
    case "why-wrong":
      if (!lastWrong) return { text: "现在还没有做错的题。先做一道题吧！", effects: [{ type: "none" }], state: s };
      return { text: `你写的是“${lastWrong.given}”，正确答案是“${lastWrong.q.answer}”。${lastWrong.hint ?? "看一看解析里的每一步，找找是哪一步不一样。"}`, effects: [{ type: "none" }], state: s };
    case "harder":
      s.level = Math.min(3, s.level + 1);
      return { text: s.level === 3 ? "好，下一题会更有挑战。" : "难度提高一点。", effects: [{ type: "level", level: s.level }, { type: "quiz" }], state: s };
    case "easier":
      s.level = Math.max(1, s.level - 1);
      return { text: "好，我们先从简单的开始。", effects: [{ type: "level", level: s.level }, { type: "quiz" }], state: s };
  }
}

/** 根据最近的答题结果自动调整难度：连续答对升级，连续答错降级。 */
export function adaptLevel(level: number, recent: boolean[]): number {
  const last2 = recent.slice(-2);
  if (last2.length === 2 && last2.every(Boolean)) return Math.min(3, level + 1);
  if (last2.length === 2 && last2.every((x) => !x)) return Math.max(1, level - 1);
  return level;
}
