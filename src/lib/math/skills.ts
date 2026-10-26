import { hasBorrow, hasCarry, parseColumn } from "./column.ts";
import type { Question, SkillStat, WrongItem } from "./types.ts";

export type SkillId =
  | "add"
  | "add-carry"
  | "sub"
  | "sub-borrow"
  | "times"
  | "bei"
  | "mul"
  | "div"
  | "div-remain"
  | "peri"
  | "area"
  | "time"
  | "calendar"
  | "frac"
  | "dec"
  | "dir"
  | "stat"
  | "eq"
  | "pct"
  | "ratio"
  | "number" | "money" | "shape" | "factor" | "volume" | "surface" | "rate" | "scale"
  | "circle" | "measure" | "mass" | "combine" | "mixed" | "geometry";

export const SKILL_LABEL: Record<SkillId, string> = {
  number: "数与数位", money: "元角分", shape: "图形与规律", factor: "因数与倍数", volume: "体积与容积", surface: "表面积", rate: "速度与路程", scale: "比例尺",
  measure: "长度换算", mass: "质量换算", combine: "有序思考", mixed: "混合运算", geometry: "线与角",
  add: "加法",
  "add-carry": "进位加法",
  sub: "减法",
  "sub-borrow": "退位减法",
  times: "表内乘除",
  bei: "认识倍",
  mul: "多位数乘法",
  div: "除法",
  "div-remain": "有余数除法",
  peri: "周长",
  area: "面积",
  time: "时分秒",
  calendar: "年月日",
  frac: "分数",
  dec: "小数",
  dir: "位置方向",
  stat: "简单统计",
  eq: "简易方程",
  pct: "百分数",
  ratio: "比和比例",
  circle: "圆",
};

export const SKILL_HINT: Record<SkillId, string> = {
  number: "先确认数位，再比较或换算。", money: "1 元 = 10 角，1 角 = 10 分；先统一单位。", shape: "看清图形特征或排列顺序，再判断。", factor: "因数是能整除这个数的数；公因数与公倍数不要混淆。", volume: "先确认立体形状，分清体积和容积单位。", surface: "求各个面的面积之和，看清是否只求侧面。", rate: "路程 = 速度 × 时间，先统一单位。", scale: "图上距离与实际距离先统一单位，再按比例尺计算。",
  measure: "先统一长度单位，再计算。", mass: "1 吨 = 1000 千克，1 千克 = 1000 克。", combine: "固定一项有序列举，重叠部分不重复计算。", mixed: "有括号先算括号，先乘除后加减，同级从左往右。", geometry: "角的大小看张口，不看边的长短。",
  add: "对齐数位，从个位加起。",
  "add-carry": "满十向前进 1，进上来的 1 不能漏。",
  sub: "对齐数位，从个位减起。",
  "sub-borrow": "不够减就向前借 1，借走的那一位少 1。",
  times: "用口诀，不要把加减混进去。",
  bei: "几倍就是乘；问「多多少」要再减一次。",
  mul: "按数位分别相乘，每个数位都要乘到，最后合起来。",
  div: "想乘法口诀：几乘除数最接近被除数。",
  "div-remain": "余数必须比除数小。写成 商余余数。",
  peri: "长方形周长 =（长 + 宽）× 2，正方形 × 4。",
  area: "先确认图形，再选面积公式；面积用平方单位。",
  time: "1 时 = 60 分。跨天先算到午夜。",
  calendar: "平年 365，闰年二月 29。整百年份还要能被 400 整除。",
  frac: "平均分成几份，每份就是几分之一。",
  dec: "加减要对齐小数点；乘法看小数位数；除法先把除数化成整数。",
  dir: "面朝一个方向，右转顺时针一格。",
  stat: "一共用加法，相差用减法。",
  eq: "等式两边同时加减同一个数，或同时乘除同一个非零数，等式仍成立。",
  pct: "百分数就是分母是 100 的分数。",
  ratio: "比的前项后项同时乘或除以同一个非零数，比值不变。",
  circle: "周长 = π × 直径；面积 = π × 半径 × 半径。π 按题目要求取值。",
};

export const SKILL_DRILL: Record<SkillId, { chapterId: string; level: number }> = {
  number: {chapterId:"g1number",level:3}, money: {chapterId:"g1money",level:3}, shape: {chapterId:"g1shape",level:3}, factor: {chapterId:"g5factor",level:3}, volume: {chapterId:"g5volume",level:3}, surface: {chapterId:"g5volume",level:4}, rate: {chapterId:"g4stats",level:3}, scale: {chapterId:"g6scale",level:3},
  measure: {chapterId:"g3measure",level:3}, mass:{chapterId:"g3mass",level:3}, combine:{chapterId:"g3combine",level:3}, mixed:{chapterId:"g3mixed",level:3}, geometry:{chapterId:"g3angles",level:3},
  add: { chapterId: "warmup", level: 2 },
  "add-carry": { chapterId: "wan", level: 5 },
  sub: { chapterId: "warmup", level: 2 },
  "sub-borrow": { chapterId: "wan", level: 6 },
  times: { chapterId: "warmup", level: 4 },
  bei: { chapterId: "bei", level: 5 },
  mul: { chapterId: "mul1", level: 4 },
  div: { chapterId: "div1", level: 2 },
  "div-remain": { chapterId: "div1", level: 6 },
  peri: { chapterId: "peri", level: 3 },
  area: { chapterId: "area", level: 3 },
  time: { chapterId: "time", level: 4 },
  calendar: { chapterId: "time", level: 6 },
  frac: { chapterId: "frac", level: 2 },
  dec: { chapterId: "frac", level: 7 },
  dir: { chapterId: "dir", level: 3 },
  stat: { chapterId: "stat", level: 4 },
  eq: { chapterId: "g5eq", level: 3 },
  pct: { chapterId: "g5pct", level: 3 },
  ratio: { chapterId: "g6ratio", level: 3 },
  circle: { chapterId: "g6circle", level: 3 },
};

const SKILL_IDS = Object.keys(SKILL_LABEL) as SkillId[];

export function isSkillId(value: string | undefined): value is SkillId {
  return !!value && SKILL_IDS.includes(value as SkillId);
}

export function inferSkill(q: Pick<Question, "chapterId" | "prompt" | "answer" | "trap">): SkillId {
  const { chapterId, prompt, answer, trap } = q;
  if (chapterId === "g4dec") return "dec";
  if (chapterId === "g5frac") return "frac";
  if (trap?.includes("跨天")) return "time";
  if (trap?.includes("多多少") || (chapterId === "bei" && prompt.includes("多多少"))) return "bei";
  if (trap?.includes("连续进位")) return "add-carry";
  if (trap?.includes("连续退位")) return "sub-borrow";

  const col = parseColumn(prompt);
  if (col) {
    if (col.op === "+") return hasCarry(col.a, col.b) ? "add-carry" : "add";
    if (col.op === "−") return hasBorrow(col.a, col.b) ? "sub-borrow" : "sub";
    if (col.op === "×") {
      if (chapterId === "warmup" || (col.a <= 9 && col.b <= 9)) return "times";
      return "mul";
    }
  }

  if (prompt.includes("÷")) {
    if (answer.includes("余") || prompt.includes("余")) return "div-remain";
    return chapterId === "warmup" ? "times" : "div";
  }

  if (chapterId === "time") {
    if (/年|月|闰|平年/.test(prompt)) return "calendar";
    return "time";
  }
  if (chapterId === "frac") {
    if (/\d\.\d|元|角/.test(prompt)) return "dec";
    return "frac";
  }

  switch (chapterId) {
    case "bei":
      return "bei";
    case "mul1":
    case "mul2":
      return "mul";
    case "div1":
      return "div";
    case "peri":
      return "peri";
    case "area":
      return "area";
    case "dir":
      return "dir";
    case "stat":
      return "stat";
    case "g1add":
    case "g2add":
      return prompt.includes("−") ? "sub" : "add";
    case "g1clock":
      return "time";
    case "g2times":
      return "times";
    case "g4ops":
      return prompt.includes("÷") ? "div" : "mul";
    case "g4dec":
      return "dec";
    case "g5frac":
      return "frac";
    case "g5eq":
      return "eq";
    case "g5pct":
      return "pct";
    case "g6ratio":
      return "ratio";
    case "g6circle":
      return "circle";
    case "wan":
      return prompt.includes("−") ? "sub" : "add";
    default:
      return "add";
  }
}

export function emptySkillStat(): SkillStat {
  return { seen: 0, correct: 0, sumMs: 0, firstSeen: 0, firstCorrect: 0, retrySeen: 0, retryCorrect: 0 };
}

export function touchSkill(
  map: Record<string, SkillStat>,
  skill: string | undefined,
  ok: boolean,
  ms: number,
  retry = false,
): Record<string, SkillStat> {
  if (!skill) return map;
  const prev = map[skill] ?? emptySkillStat();
  return {
    ...map,
    [skill]: {
      firstSeen: (prev.firstSeen ?? 0) + (retry ? 0 : 1),
      firstCorrect: (prev.firstCorrect ?? 0) + (!retry && ok ? 1 : 0),
      retrySeen: (prev.retrySeen ?? 0) + (retry ? 1 : 0),
      retryCorrect: (prev.retryCorrect ?? 0) + (retry && ok ? 1 : 0),
      seen: prev.seen + 1,
      correct: prev.correct + (ok ? 1 : 0),
      sumMs: prev.sumMs + ms,
    },
  };
}

export type SkillRow = {
  id: SkillId;
  label: string;
  acc: number;
  seen: number;
  avgMs: number;
};

export function skillRows(map: Record<string, SkillStat>): SkillRow[] {
  return Object.entries(map)
    .filter((entry): entry is [SkillId, SkillStat] => isSkillId(entry[0]) && entry[1].seen > 0)
    .map(([id, s]) => ({
      id,
      label: SKILL_LABEL[id],
      acc: s.correct / s.seen,
      seen: s.seen,
      avgMs: s.sumMs / s.seen,
    }))
    .sort((a, b) => a.acc - b.acc || b.seen - a.seen);
}

export function weakSkills(map: Record<string, SkillStat>, minSeen = 3): SkillRow[] {
  return skillRows(map).filter((row) => row.seen >= minSeen && row.acc < 0.8);
}

export function tonightPlan(map: Record<string, SkillStat>, wrong: WrongItem[]): {
  line: string;
  skill?: SkillId;
} {
  if (!Object.values(map).some((s) => s.seen > 0) && !wrong.length) {
    return { line: "还没有练习记录。先选年级，完成一组每日练习，再看需要巩固的地方。" };
  }
  const weak = weakSkills(map, 3);
  if (weak[0]) {
    const top = weak[0];
    return {
      skill: top.id,
      line: `今晚专攻${top.label}。${SKILL_HINT[top.id]}先做 8 题。`,
    };
  }
  if (wrong.length) {
    const skill = isSkillId(wrong[0]?.skill) ? wrong[0]!.skill : undefined;
    const label = skill ? SKILL_LABEL[skill] : "错题";
    return { skill, line: `错题本还有 ${wrong.length} 道。先回炉 ${label}。` };
  }
  return { line: "目前记录未见明显薄弱项。可以练一组本年级题目，继续积累记录。" };
}

export function oralPace(map: Record<string, SkillStat>): { avgMs: number; line: string } | null {
  const ids: SkillId[] = ["add", "add-carry", "sub", "sub-borrow", "times"];
  let seen = 0;
  let sum = 0;
  for (const id of ids) {
    const s = map[id];
    if (!s) continue;
    seen += s.seen;
    sum += s.sumMs;
  }
  if (seen < 6) return null;
  const avgMs = sum / seen;
  const sec = (avgMs / 1000).toFixed(1);
  if (avgMs <= 5000) return { avgMs, line: `口算约 ${sec} 秒一题，已经很快。` };
  if (avgMs <= 9000) return { avgMs, line: `口算约 ${sec} 秒一题，再练冲刺会更稳。` };
  return { avgMs, line: `口算约 ${sec} 秒一题。先求对，再求快。` };
}

/** 旧存档不倒推归类；无该类作答时显示暂无。 */
export function attemptSummary(s: SkillStat): string {
  const rate = (correct: number, seen: number) => seen ? `${Math.round(correct / seen * 100)}%（${correct}/${seen} 题）` : "暂无（0 题）";
  return `首答正确率 ${rate(s.firstCorrect ?? 0, s.firstSeen ?? 0)} · 巩固正确率 ${rate(s.retryCorrect ?? 0, s.retrySeen ?? 0)}`;
}
