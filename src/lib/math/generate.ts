import { EXPANDED_FACTORY } from "./expanded-bank.ts";
import { LEARNING_FACTORY } from "./learning-bank.ts";
import { CHAPTERS } from "./chapters.ts";
import { GRADE_FACTORY } from "./grades.ts";
import { inferSkill } from "./skills.ts";
import { randomRng, type Rng } from "./rng.ts";
import type { KeypadKind, Question, WrongItem } from "./types.ts";

let seq = 0;

function qid(): string {
  seq += 1;
  return `q${seq.toString(36)}`;
}

function asKeypad(
  chapterId: string,
  prompt: string,
  answer: string | number,
  explain: string,
  keypad: KeypadKind = "int",
  trap?: string,
): Question {
  return {
    id: qid(),
    chapterId,
    prompt,
    answer: String(answer),
    explain,
    mode: "keypad",
    keypad,
    trap,
  };
}

function asChoice(
  rng: Rng,
  chapterId: string,
  prompt: string,
  answer: string | number,
  explain: string,
  distractors: Array<string | number>,
  trap?: string,
): Question {
  const correct = String(answer);
  const uniq = [correct];
  for (const raw of rng.shuffle(distractors.map(String))) {
    if (raw !== correct && raw !== "" && !uniq.includes(raw)) uniq.push(raw);
    if (uniq.length === 4) break;
  }
  const n = Number(correct);
  if (Number.isFinite(n)) {
    for (const extra of [n + 1, n - 1, n + 10, Math.abs(n - 10), n * 2, Math.max(0, n - 2)]) {
      const s = String(extra);
      if (!uniq.includes(s)) uniq.push(s);
      if (uniq.length === 4) break;
    }
  }
  const target = Number.isFinite(n) ? 4 : Math.min(4, Math.max(2, uniq.length));
  return {
    id: qid(),
    chapterId,
    prompt,
    answer: correct,
    explain,
    mode: "choice",
    choices: rng.shuffle(uniq.slice(0, target)),
    trap,
  };
}

function digitsToNum(digits: number[]): number {
  return digits.reduce((s, d, i) => s + d * 10 ** i, 0);
}

function noCarryAdd(rng: Rng, len: number): [number, number] {
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < len; i += 1) {
    const high = i === len - 1;
    const da = rng.int(high ? 1 : 0, high ? 8 : 8);
    const db = rng.int(high ? 1 : 0, Math.max(0, 9 - da));
    a.push(da);
    b.push(high && db === 0 ? 1 : db);
  }
  return [digitsToNum(a), digitsToNum(b)];
}

function noBorrowSub(rng: Rng, len: number): [number, number] {
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < len; i += 1) {
    const high = i === len - 1;
    const da = rng.int(high ? 2 : 1, 9);
    const db = rng.int(high ? 1 : 0, da);
    a.push(da);
    b.push(high && db === 0 ? 1 : db);
  }
  const na = digitsToNum(a);
  const nb = digitsToNum(b);
  return na >= nb ? [na, nb] : [nb, na];
}

function carryAdd(rng: Rng, len: number): [number, number] {
  for (let k = 0; k < 24; k += 1) {
    const min = 10 ** (len - 1);
    const max = 10 ** len - 1;
    const a = rng.int(min, max);
    const b = rng.int(min, Math.min(max, 9999 - a));
    if (a + b <= 9999 && ((a % 10) + (b % 10) >= 10 || k > 8)) return [a, b];
  }
  return [586, 247];
}

function isLeap(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeap(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function warmup(level: number, rng: Rng): Question {
  const id = "warmup";
  const t = level;
  if (t <= 2) {
    const add = rng.chance(0.55);
    if (add) {
      const a = rng.int(t === 1 ? 1 : 10, t === 1 ? 20 : 70);
      const b = rng.int(1, t === 1 ? 20 - a || 9 : 99 - a);
      return asKeypad(id, `${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b}`);
    }
    const a = rng.int(t === 1 ? 8 : 20, t === 1 ? 20 : 99);
    const b = rng.int(1, a);
    return asKeypad(id, `${a} − ${b} = ?`, a - b, `${a} − ${b} = ${a - b}`);
  }
  if (t <= 4) {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    if (rng.chance(0.5)) {
      return asKeypad(id, `${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}`);
    }
    return asKeypad(id, `${a * b} ÷ ${a} = ?`, b, `${a * b} ÷ ${a} = ${b}，因为 ${a} × ${b} = ${a * b}`);
  }
  if (t <= 6) {
    const a = rng.int(12, 80);
    const b = rng.int(6, 90 - a);
    const sum = a + b;
    if (rng.chance(0.5)) {
      return asKeypad(id, `${a} + □ = ${sum}，□ 是多少？`, b, `${sum} − ${a} = ${b}`);
    }
    return asKeypad(id, `□ − ${b} = ${a}，□ 是多少？`, a + b, `${a} + ${b} = ${a + b}`);
  }
  const a = rng.int(11, 48);
  const b = rng.int(2, 9);
  if (rng.chance(0.5)) return asKeypad(id, `${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}`);
  return asKeypad(id, `${a * b} ÷ ${b} = ?`, a, `${a * b} ÷ ${b} = ${a}`);
}

function dirQ(level: number, rng: Rng): Question {
  const id = "dir";
  const dirs = ["东", "南", "西", "北"] as const;
  if (level <= 3) {
    const face = rng.int(0, 3);
    const right = rng.chance(0.5);
    const land = (face + (right ? 1 : 3)) % 4;
    const verb = right ? "向右转" : "向左转";
    return asChoice(
      rng,
      id,
      `面朝${dirs[face]}，${verb}后朝哪一边？`,
      dirs[land]!,
      `面朝${dirs[face]}，${verb}后朝${dirs[land]}。`,
      dirs.filter((_, i) => i !== land),
    );
  }
  if (level <= 6) {
    const face = rng.int(0, 3);
    const opp = (face + 2) % 4;
    return asChoice(
      rng,
      id,
      `${dirs[face]}的对面是哪一边？`,
      dirs[opp]!,
      `${dirs[face]}的对面是${dirs[opp]}。`,
      dirs.filter((_, i) => i !== opp),
    );
  }
  const start = rng.int(0, 3);
  const firstRight = rng.chance(0.5);
  const secondRight = rng.chance(0.5);
  const mid = (start + (firstRight ? 1 : 3)) % 4;
  const end = (mid + (secondRight ? 1 : 3)) % 4;
  const v1 = firstRight ? "向右转" : "向左转";
  const v2 = secondRight ? "再向右转" : "再向左转";
  return asChoice(
    rng,
    id,
    `从学校出发面朝${dirs[start]}，${v1}走到路口，${v2}。现在朝哪一边？`,
    dirs[end]!,
    `先朝${dirs[start]}，${v1}后朝${dirs[mid]}，${v2}后朝${dirs[end]}。`,
    dirs.filter((_, i) => i !== end),
  );
}

function statQ(level: number, rng: Rng): Question {
  const id = "stat";
  const a = rng.int(4, 12 + level);
  const b = rng.int(3, 10 + level);
  if (level <= 3) {
    return asKeypad(id, `一班喜欢踢球的有 ${a} 人，二班有 ${b} 人。一共多少人？`, a + b, `${a} + ${b} = ${a + b}`);
  }
  if (level <= 6) {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    const who = a >= b ? "一班" : "二班";
    if (rng.chance(0.5)) {
      return asChoice(rng, id, `一班 ${a} 人，二班 ${b} 人。哪班人更多？`, who, `${hi} > ${lo}，所以${who}更多。`, ["一班", "二班", "一样多"]);
    }
    return asKeypad(id, `一班 ${a} 人，二班 ${b} 人。相差多少人？`, hi - lo, `${hi} − ${lo} = ${hi - lo}`);
  }
  const boy = rng.int(8, 18);
  const girl = rng.int(6, 16);
  return asKeypad(
    id,
    `调查表：男生 ${boy} 人，女生 ${girl} 人。全班一共多少人？`,
    boy + girl,
    `${boy} + ${girl} = ${boy + girl}`,
  );
}

function consecutiveCarryAdd(rng: Rng, len: number): [number, number] {
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < len; i += 1) {
    const high = i === len - 1;
    const da = rng.int(high ? 1 : 5, 9);
    const db = rng.int(high ? 1 : Math.max(1, 10 - da), 9);
    a.push(da);
    b.push(db);
  }
  const na = digitsToNum(a);
  const nb = digitsToNum(b);
  if (na + nb > 9999) return [387, 569];
  return [na, nb];
}

function consecutiveBorrowSub(rng: Rng): [number, number] {
  const a = rng.pick([200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 5000]);
  const b = rng.int(108, Math.min(a - 1, a === 500 ? 489 : a - 11));
  return [a, b];
}

function wan(level: number, rng: Rng): Question {
  const id = "wan";
  const len = level <= 3 ? 3 : 4;
  if (level >= 7 && rng.chance(0.45)) {
    const a = rng.pick([198, 297, 302, 489, 511, 298]);
    const b = rng.pick([203, 305, 198, 512, 305]);
    const approx = Math.round((a + b) / 100) * 100;
    return asChoice(
      rng,
      id,
      `${a} + ${b} 大约是多少？`,
      String(approx),
      `先估成整百：${Math.round(a / 100) * 100} + ${Math.round(b / 100) * 100} ≈ ${approx}。精确值是 ${a + b}。`,
      [a + b, Math.round((a + b) / 10) * 10, a + b - 100, a + b + 100],
      "估算先看百位，不要把精确值当成大约。",
    );
  }
  if (level >= 3 && rng.chance(0.55)) {
    if (rng.chance(0.5)) {
      const [a, b] = consecutiveCarryAdd(rng, len);
      return asKeypad(
        id,
        `${a} + ${b} = ?`,
        a + b,
        `${a} + ${b} = ${a + b}。个位、十位都要进位，进上来的 1 不能漏。`,
        "int",
        "连续进位：每一位满十都要向前加 1。",
      );
    }
    const [a, b] = consecutiveBorrowSub(rng);
    return asKeypad(
      id,
      `${a} − ${b} = ?`,
      a - b,
      `${a} − ${b} = ${a - b}。被减数有 0 时，要连续向前借。`,
      "int",
      "连续退位：借走以后这一位是 9，不要忘了减。",
    );
  }
  if (level <= 2) {
    const [a, b] = rng.chance(0.5) ? noCarryAdd(rng, len) : noBorrowSub(rng, len);
    if (a >= b && rng.chance(0.45)) {
      return asKeypad(id, `${a} − ${b} = ?`, a - b, `${a} − ${b} = ${a - b}（各位都不退位）`);
    }
    const [x, y] = noCarryAdd(rng, len);
    return asKeypad(id, `${x} + ${y} = ?`, x + y, `${x} + ${y} = ${x + y}（各位都不进位）`);
  }
  if (rng.chance(0.5)) {
    const [a, b] = carryAdd(rng, len);
    return asKeypad(id, `${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b}`);
  }
  const min = 10 ** (len - 1);
  const a = rng.int(min + 20, 10 ** len - 1);
  const b = rng.int(min / 2, a - 1);
  return asKeypad(id, `${a} − ${b} = ?`, a - b, `${a} − ${b} = ${a - b}`);
}

function bei(level: number, rng: Rng): Question {
  const id = "bei";
  const n = rng.int(2, level <= 3 ? 9 : 12);
  const k = rng.int(2, level <= 4 ? 8 : 9);
  const product = n * k;
  if (level >= 4 && rng.chance(0.45)) {
    const more = n * (k - 1);
    return asKeypad(
      id,
      `柳树 ${n} 棵，杨树是柳树的 ${k} 倍。杨树比柳树多多少棵？`,
      more,
      `杨树 ${n} × ${k} = ${product} 棵，再减柳树：${product} − ${n} = ${more}。也可以 ${n} × (${k} − 1)。`,
      "int",
      "问的是「多多少」，不是杨树有多少。",
    );
  }
  const kind = rng.int(0, level >= 6 ? 3 : 2);
  if (kind === 0) {
    return asKeypad(id, `${n} 的 ${k} 倍是多少？`, product, `${n} 的 ${k} 倍就是 ${n} × ${k} = ${product}`);
  }
  if (kind === 1) {
    return asKeypad(id, `${product} 是 ${n} 的几倍？`, k, `${product} ÷ ${n} = ${k}，所以是 ${k} 倍`);
  }
  if (kind === 2) {
    return asChoice(
      rng,
      id,
      `一根绳子长 ${product} 厘米，是另一根 ${n} 厘米绳子的几倍？`,
      String(k),
      `${product} ÷ ${n} = ${k}（倍）`,
      [k + 1, k - 1, n, product],
    );
  }
  const other = n * rng.int(2, 6);
  return asChoice(
    rng,
    id,
    `甲数是 ${n}，乙数是 ${other}。乙数是甲数的几倍？`,
    String(other / n),
    `${other} ÷ ${n} = ${other / n}`,
    [other - n, n, other, (other / n) + 1],
  );
}

function mul1(level: number, rng: Rng): Question {
  const id = "mul1";
  if (level <= 3 && rng.chance(0.2)) {
    const n = rng.int(12, 256);
    const zeroFirst = rng.chance(0.5);
    const a = zeroFirst ? 0 : n;
    const b = zeroFirst ? n : 0;
    return asKeypad(id, `${a} × ${b} = ?`, 0, `0 乘任何数都得 0。`, "int", "0 乘任何数都是 0，不要把另一个数抄下来。");
  }
  const d = rng.int(2, 9);
  const a =
    level <= 2
      ? rng.int(12, 48)
      : level <= 5
        ? rng.int(23, 186)
        : rng.int(102, 408);
  return asKeypad(id, `${a} × ${d} = ?`, a * d, `${a} × ${d} = ${a * d}`);
}

function div1(level: number, rng: Rng): Question {
  const id = "div1";
  const d = rng.int(2, 9);
  if (level <= 3) {
    const q = rng.int(4, level === 1 ? 12 : 36);
    const n = d * q;
    return asKeypad(id, `${n} ÷ ${d} = ?`, q, `${n} ÷ ${d} = ${q}，因为 ${d} × ${q} = ${n}`);
  }
  const q = rng.int(6, 48);
  const r = rng.int(1, d - 1);
  const n = d * q + r;
  return asKeypad(
    id,
    `${n} ÷ ${d}，商是几、余数是几？（写成 商余余数，如 7余2）`,
    `${q}余${r}`,
    `${d} × ${q} = ${d * q}，${n} − ${d * q} = ${r}，所以商 ${q} 余 ${r}。余数必须比除数小。`,
    "remainder",
    "余数要比除数小，不能把余数写成除数那么大。",
  );
}

function mul2(level: number, rng: Rng): Question {
  const id = "mul2";
  const a = rng.int(11, level <= 3 ? 19 : level <= 6 ? 32 : 48);
  const b = rng.int(11, level <= 3 ? 15 : level <= 6 ? 24 : 36);
  return asKeypad(id, `${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}`);
}

function peri(level: number, rng: Rng): Question {
  const id = "peri";
  if (rng.chance(0.4)) {
    const s = rng.int(4, 18);
    const p = 4 * s;
    if (level >= 6 && rng.chance(0.5)) {
      return asKeypad(id, `正方形周长 ${p} 厘米，边长是多少厘米？`, s, `边长 = 周长 ÷ 4 = ${p} ÷ 4 = ${s}`);
    }
    return asKeypad(id, `边长 ${s} 厘米的正方形，周长是多少厘米？`, p, `周长 = 4 × ${s} = ${p}`);
  }
  const l = rng.int(6, 20);
  const w = rng.int(3, l - 1);
  const p = 2 * (l + w);
  if (level >= 7) {
    return asChoice(
      rng,
      id,
      `长方形长 ${l} 米、宽 ${w} 米。周长怎样算？`,
      `2 × (${l} + ${w})`,
      `长方形周长 = （长 + 宽）× 2 = 2 × (${l} + ${w}) = ${p}`,
      [`${l} × ${w}`, `4 × ${l}`, `${l} + ${w}`, `2 × ${l} × ${w}`],
    );
  }
  return asKeypad(id, `长 ${l} 厘米、宽 ${w} 厘米的长方形，周长是多少厘米？`, p, `周长 = (${l} + ${w}) × 2 = ${p}`);
}

function area(level: number, rng: Rng): Question {
  const id = "area";
  if (level >= 7 && rng.chance(0.4)) {
    return asChoice(
      rng,
      id,
      "1 平方米等于多少平方分米？",
      "100",
      "1 米 = 10 分米，面积是 10 × 10 = 100 平方分米。",
      ["10", "1000", "20", "50"],
    );
  }
  if (rng.chance(0.4)) {
    const s = rng.int(3, 12);
    return asKeypad(id, `边长 ${s} 厘米的正方形，面积是多少平方厘米？`, s * s, `面积 = ${s} × ${s} = ${s * s}`);
  }
  const l = rng.int(5, 16);
  const w = rng.int(2, 12);
  if (level >= 6 && rng.chance(0.4)) {
    const a = l * w;
    return asKeypad(id, `长方形面积 ${a} 平方厘米，长 ${l} 厘米，宽是多少厘米？`, w, `宽 = 面积 ÷ 长 = ${a} ÷ ${l} = ${w}`);
  }
  return asKeypad(id, `长 ${l} 厘米、宽 ${w} 厘米的长方形，面积是多少平方厘米？`, l * w, `面积 = ${l} × ${w} = ${l * w}`);
}

function timeQ(level: number, rng: Rng): Question {
  const id = "time";
  if (level >= 5 && rng.chance(0.35)) {
    const startH = rng.int(18, 22);
    const startM = rng.pick([0, 15, 30, 45]);
    const endH = rng.int(5, 10);
    const endM = rng.pick([0, 15, 30, 45]);
    const overnight = (24 * 60 - (startH * 60 + startM)) + (endH * 60 + endM);
    const hh = Math.floor(overnight / 60);
    const mm = overnight % 60;
    return asChoice(
      rng,
      id,
      `火车 ${startH}:${String(startM).padStart(2, "0")} 出发，次日 ${endH}:${String(endM).padStart(2, "0")} 到达，行驶多久？`,
      `${hh}时${mm}分`,
      `先算到午夜：${24 - startH} 小时少 ${startM} 分，再加次日 ${endH} 时 ${endM} 分，一共 ${hh} 时 ${mm} 分。`,
      [`${Math.abs(endH - startH)}时${Math.abs(endM - startM)}分`, `${hh}时${startM}分`, `${endH}时${mm}分`, `${hh + 12}时${mm}分`],
      "跨天了，不能用到达时间直接减出发时间。",
    );
  }
  const kind = rng.int(0, level >= 5 ? 5 : 3);
  if (kind === 0) {
    const h = rng.int(1, 4);
    return asChoice(rng, id, `${h} 小时等于多少分钟？`, String(h * 60), `1 小时 = 60 分钟，所以 ${h} × 60 = ${h * 60}`, [
      h * 100,
      h * 24,
      60,
      h * 10,
    ]);
  }
  if (kind === 1) {
    const h = rng.int(1, 10);
    const m = rng.int(5, 50);
    const add = rng.int(10, 55);
    const total = h * 60 + m + add;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return asChoice(
      rng,
      id,
      `${h}时${m}分再过 ${add} 分是几点？`,
      `${nh}时${nm}分`,
      `${m} + ${add} = ${m + add} 分，写成 ${nh}时${nm}分。`,
      [`${h}时${(m + add) % 60}分`, `${nh}时${m}分`, `${h + 1}时${nm}分`, `${h}时${add}分`],
    );
  }
  if (kind === 2) {
    const year = rng.pick([2016, 2018, 2019, 2020, 2023, 2024, 2025, 2026]);
    const leap = isLeap(year);
    return asChoice(
      rng,
      id,
      `${year} 年是平年还是闰年？`,
      leap ? "闰年" : "平年",
      leap
        ? `${year} 能被 4 整除，是闰年，二月有 29 天。`
        : `${year} 不能被 4 整除，是平年，二月有 28 天。`,
      leap ? ["平年"] : ["闰年"],
    );
  }
  if (kind === 3) {
    const year = rng.pick([2023, 2024, 2025, 2026]);
    const month = rng.pick([1, 2, 4, 6, 7, 9, 11, 12]);
    const days = daysInMonth(year, month);
    return asChoice(
      rng,
      id,
      `${year} 年 ${month} 月有多少天？`,
      String(days),
      `${month} 月有 ${days} 天。`,
      [28, 29, 30, 31].filter((x) => x !== days),
    );
  }
  if (kind === 4) {
    return asChoice(rng, id, "一年有多少个月？", "12", "一年有 12 个月。", ["10", "24", "365", "7"]);
  }
  return asChoice(
    rng,
    id,
    "1 分钟等于多少秒？",
    "60",
    "1 分钟 = 60 秒。",
    ["100", "30", "16", "24"],
  );
}

function frac(level: number, rng: Rng): Question {
  const id = "frac";
  const kind = rng.int(0, level >= 6 ? 4 : 2);
  if (kind === 0) {
    const den = rng.pick([2, 3, 4, 5, 8]);
    const whole = den * rng.int(2, 6);
    const part = whole / den;
    return asKeypad(
      id,
      `${whole} 的 ${den === 2 ? "一半" : `1/${den}`} 是多少？`,
      part,
      `${whole} ÷ ${den} = ${part}`,
    );
  }
  if (kind === 1) {
    return asChoice(rng, id, "把一块饼平均分成 4 份，每份是几分之几？", "1/4", "平均分成 4 份，每份是 1/4。", [
      "1/2",
      "4/1",
      "1/3",
      "4/4",
    ]);
  }
  if (kind === 2) {
    return asChoice(rng, id, "1/2 和 1/3，哪一个更大？", "1/2", "同样的饼，分成 2 份每份比分成 3 份更大，所以 1/2 > 1/3。", [
      "1/3",
      "一样大",
      "无法比较",
    ]);
  }
  if (kind === 3) {
    const a = rng.int(1, 6);
    const b = rng.int(1, 9 - a);
    const x = a / 10;
    const y = b / 10;
    const s = ((a + b) / 10).toFixed(1);
    return asKeypad(id, `${x.toFixed(1)} + ${y.toFixed(1)} = ?`, s, `${x.toFixed(1)} + ${y.toFixed(1)} = ${s}`, "dec");
  }
  const yuan = rng.pick([1.5, 2.5, 3.5, 4.5, 6.5]);
  const jiao = Math.round(yuan * 10);
  return asKeypad(id, `${yuan} 元等于多少角？`, jiao, `1 元 = 10 角，所以 ${yuan} × 10 = ${jiao}`);
}

const FACTORY: Record<string, (level: number, rng: Rng) => Question> = {
  warmup,
  wan,
  bei,
  mul1,
  div1,
  mul2,
  peri,
  area,
  time: timeQ,
  frac,
  dir: dirQ,
  stat: statQ,
  ...GRADE_FACTORY,
  ...LEARNING_FACTORY,
  ...EXPANDED_FACTORY,
};

export function tagQuestion(q: Question): Question {
  return { ...q, skill: q.skill ?? inferSkill(q) };
}

export const PROMPT_COOLDOWN = 12;
// 同一 RNG 表示一次组卷上下文；按章节保存最近 12 题，不写入存档。
const recentByRng = new WeakMap<Rng, Map<string, string[]>>();

export function makeQuestion(chapterId: string, level: number, rng: Rng = randomRng()): Question {
  const clamped = Math.min(8, Math.max(1, Math.round(level)));
  const factory = FACTORY[chapterId] ?? warmup;
  let history = recentByRng.get(rng);
  if (!history) { history = new Map(); recentByRng.set(rng, history); }
  const recent = history.get(chapterId) ?? [];
  let q: Question;
  // 小题池或固定 RNG 最多尝试 80 次，然后允许重复，保证出题终止。
  let attempts = 0;
  do { q = tagQuestion({ ...factory(clamped, rng), chapterId }); }
  while (recent.includes(q.prompt) && ++attempts < 80);
  history.set(chapterId, [...recent, q.prompt].slice(-PROMPT_COOLDOWN));
  return q;
}

export function makeLevelSet(
  chapterId: string,
  level: number,
  n: number,
  rng: Rng = randomRng(),
): Question[] {
  return Array.from({ length: n }, () => makeQuestion(chapterId, level, rng));
}

export function makeMixedSet(chapterIds: string[], n: number, rng: Rng = randomRng()): Question[] {
  const ids = chapterIds.length ? chapterIds : ["warmup"];
  return Array.from({ length: n }, (_, i) => {
    const id = ids[i % ids.length] ?? "warmup";
    return makeQuestion(id, rng.int(1, 6), rng);
  });
}

export function makeSimilar(item: Pick<WrongItem, "chapterId" | "skill"> & { prompt?: string }, rng: Rng = randomRng(), recent: Question[] = []): Question {
  let history = recentByRng.get(rng);
  if (!history) { history = new Map(); recentByRng.set(rng, history); }
  const prompts = recent.filter(q => q.chapterId === item.chapterId).map(q => q.prompt);
  history.set(item.chapterId, [...(history.get(item.chapterId) ?? []), ...prompts, ...(item.prompt ? [item.prompt] : [])].slice(-PROMPT_COOLDOWN));
  let q = makeQuestion(item.chapterId, rng.int(3, 6), rng);
  for (let attempt = 0; item.skill && q.skill !== item.skill && attempt < 40; attempt++) {
    q = makeQuestion(item.chapterId, rng.int(1, 8), rng);
  }
  return q;
}

export function wrongToQuestion(item: WrongItem): Question | null {
  const numeric = /^-?\d+(\.\d+)?$/.test(item.answer) || item.answer.includes("余");
  const mode = item.mode ?? (item.choices?.length ? "choice" : numeric ? "keypad" : "choice");
  if (mode === "choice" && !(item.choices && item.choices.includes(item.answer))) return null;
  return tagQuestion({
    id: qid(),
    chapterId: item.chapterId,
    prompt: item.prompt,
    answer: item.answer,
    explain: item.explain || "再做一遍这道错过的题。",
    mode,
    choices: item.choices,
    keypad: item.keypad ?? (item.answer.includes("余") ? "remainder" : item.answer.includes(".") ? "dec" : "int"),
    trap: item.trap,
    skill: item.skill,
    fromWrong: true,
  });
}

export function makeReviewSet(wrong: WrongItem[], rng: Rng = randomRng()): Question[] {
  const exact: Question[] = [];
  for (const item of wrong) {
    const q = wrongToQuestion(item);
    if (q && !exact.some((e) => e.prompt === q.prompt)) exact.push(q);
    if (exact.length >= 5) break;
  }
  const similar = wrong.slice(0, 5).map((item) => makeSimilar(item, rng));
  const out = [...exact];
  for (const q of similar) {
    if (!out.some((e) => e.prompt === q.prompt)) out.push(q);
    if (out.length >= 10) break;
  }
  if (out.length < 6) out.push(...makeMixedSet([...new Set(wrong.map((w) => w.chapterId))], 6 - out.length, rng));
  return out;
}

export function makeDailySet(
  chapterIds: string[],
  wrong: WrongItem[],
  n: number,
  rng: Rng = randomRng(),
  accuracy = 0.5,
): Question[] {
  const hi = accuracy >= 0.8 ? 7 : accuracy >= 0.6 ? 5 : 3;
  const lo = accuracy >= 0.8 ? 3 : 1;
  const reviewN = Math.min(3, wrong.length, n);
  const review = wrong.slice(0, reviewN).map((w) => makeSimilar(w, rng));
  const remain = Math.max(0, n - review.length);
  const speedN = Math.min(5, remain);
  const speedIds = chapterIds.filter((id) => ["warmup", "wan", "g1add", "g2add", "g2times", "g4ops", "g4dec", "g5eq", "g6ratio"].includes(id));
  const speedPool = speedIds.length ? speedIds : chapterIds.length ? chapterIds : ["warmup"];
  const speed = Array.from({ length: speedN }, (_, i) =>
    makeQuestion(speedPool[i % speedPool.length] ?? "warmup", rng.int(lo, Math.max(lo, hi - 2)), rng),
  );
  const challengeN = Math.max(0, remain - speed.length);
  const challengeIds = chapterIds.filter((id) => id !== "warmup");
  const challengePool = challengeIds.length ? challengeIds : chapterIds.length ? chapterIds : ["warmup"];
  const challenge = Array.from({ length: challengeN }, (_, i) =>
    makeQuestion(challengePool[i % challengePool.length] ?? "warmup", rng.int(Math.max(lo, hi - 1), hi), rng),
  );
  return [...review, ...speed, ...challenge];
}

export function allChapterIds(): string[] {
  return CHAPTERS.map((c) => c.id);
}
