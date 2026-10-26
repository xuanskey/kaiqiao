export type InputMode = "choice" | "keypad";
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type KeypadKind = "int" | "remainder" | "dec";

export type Question = {
  id: string;
  chapterId: string;
  prompt: string;
  explain: string;
  answer: string;
  mode: InputMode;
  choices?: string[];
  keypad?: KeypadKind;
  trap?: string;
  skill?: string;
  fromWrong?: boolean;
};

export type Chapter = {
  id: string;
  name: string;
  blurb: string;
  term: string;
  grade: 1 | 2 | 3 | 4 | 5 | 6;
};

export type WrongItem = {
  prompt: string;
  answer: string;
  explain: string;
  chapterId: string;
  given: string;
  at: number;
  trap?: string;
  skill?: string;
  mode?: InputMode;
  choices?: string[];
  keypad?: KeypadKind;
};

export type AnswerLog = {
  prompt: string;
  given: string;
  ok: boolean;
  ms: number;
  skill?: string;
};

export type SkillStat = {
  firstSeen?: number;
  firstCorrect?: number;
  retrySeen?: number;
  retryCorrect?: number;
  seen: number;
  correct: number;
  sumMs: number;
};

export type PlayKind = "topic" | "unit" | "campaign" | "daily" | "review" | "duel" | "sprint" | "drill";

export type Screen = "class" | "learn" | "home" | "map" | "play" | "result" | "review" | "duel" | "report";
