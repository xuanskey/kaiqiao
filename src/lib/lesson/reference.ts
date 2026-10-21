/**
 * 仅供测试使用的独立数学参考实现。
 *
 * 刻意不复用 demos.ts / practice.ts / num.ts 里的任何函数，算法也不同：
 * - 有理数全部用 BigInt 表示，约分用“分解质因数”而不是辗转相除；
 * - 小数展开用数论方法：混循环位数 = 分母里 2、5 的最高次数，循环节长度 = 10 对其余因子的乘法阶，
 *   每一位数字用 floor(分子 × 10^k ÷ 分母) 直接算，不模拟竖式余数；
 * - 四舍五入用整数“加半再取整”。
 * 这样出题/演示代码里的计算一旦写错，测试能独立发现。
 */

export type Rat = { n: bigint; d: bigint };

function factor(x: bigint): Map<bigint, number> {
  const out = new Map<bigint, number>();
  let v = x < 0n ? -x : x;
  for (let p = 2n; p * p <= v; p += p === 2n ? 1n : 2n) {
    while (v % p === 0n) { out.set(p, (out.get(p) ?? 0) + 1); v /= p; }
  }
  if (v > 1n) out.set(v, (out.get(v) ?? 0) + 1);
  return out;
}

/** 用质因数分解约分（与生产代码的 gcd 算法无关）。 */
export function reduce(n: bigint, d: bigint): Rat {
  if (d === 0n) throw new Error("分母为 0");
  if (d < 0n) { n = -n; d = -d; }
  if (n === 0n) return { n: 0n, d: 1n };
  const fn = factor(n), fd = factor(d);
  for (const [p, k] of fn) {
    const common = Math.min(k, fd.get(p) ?? 0);
    for (let i = 0; i < common; i++) { n /= p; d /= p; }
  }
  return { n, d };
}

export const rat = (n: number | bigint, d: number | bigint = 1): Rat => reduce(BigInt(n), BigInt(d));
export const mul = (a: Rat, b: Rat): Rat => reduce(a.n * b.n, a.d * b.d);
export const div = (a: Rat, b: Rat): Rat => reduce(a.n * b.d, a.d * b.n);
export const eq = (a: Rat, b: Rat): boolean => a.n * b.d === b.n * a.d;
export const lt = (a: Rat, b: Rat): boolean => a.n * b.d < b.n * a.d;

/** 把 "7.2"、"18"、"0.05" 这样的十进制字符串转成有理数。 */
export function parseDecimal(s: string): Rat {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s.trim());
  if (!m) throw new Error(`不是十进制数：${s}`);
  const frac = m[3] ?? "";
  const n = BigInt(m[2] + frac) * (m[1] ? -1n : 1n);
  return reduce(n, 10n ** BigInt(frac.length));
}

/** 把 "3/4"、"2又1/4"、"3" 转成有理数；无法识别返回 null。 */
export function parseFractionText(s: string): Rat | null {
  const t = s.trim();
  let m = /^(\d+)$/.exec(t);
  if (m) return rat(BigInt(m[1]));
  m = /^(\d+)\/(\d+)$/.exec(t);
  if (m) return BigInt(m[2]) === 0n ? null : reduce(BigInt(m[1]), BigInt(m[2]));
  m = /^(\d+)又(\d+)\/(\d+)$/.exec(t);
  if (m) return BigInt(m[3]) === 0n ? null : reduce(BigInt(m[1]) * BigInt(m[3]) + BigInt(m[2]), BigInt(m[3]));
  return null;
}

export type Expansion = {
  int: bigint;
  /** 不循环部分（小数点后） */
  pre: string;
  /** 循环节；有限小数为空串 */
  period: string;
};

function vp(x: bigint, p: bigint): number { let k = 0; while (x % p === 0n) { x /= p; k++; } return k; }

/** 正有理数的小数展开：数论方法求混循环位数和循环节长度。 */
export function expand(q: Rat): Expansion {
  if (q.n < 0n) throw new Error("只处理非负数");
  const d = q.d;
  const preLen = Math.max(vp(d, 2n), vp(d, 5n));
  let rest = d; while (rest % 2n === 0n) rest /= 2n; while (rest % 5n === 0n) rest /= 5n;
  let periodLen = 0;
  if (rest > 1n) { let t = 10n % rest; periodLen = 1; while (t !== 1n) { t = (t * 10n) % rest; periodLen++; } }
  const digit = (k: number) => ((q.n * 10n ** BigInt(k)) / d) % 10n; // 小数点后第 k 位
  let pre = "", period = "";
  for (let k = 1; k <= preLen; k++) pre += digit(k);
  for (let k = preLen + 1; k <= preLen + periodLen; k++) period += digit(k);
  return { int: q.n / d, pre, period };
}

/** 有限小数的标准写法（去掉末尾 0）；不是有限小数返回 null。 */
export function terminating(q: Rat): string | null {
  const e = expand(q);
  if (e.period) return null;
  return e.pre ? `${e.int}.${e.pre}` : String(e.int);
}

/** 截取到小数点后 k 位（不四舍五入），保留末尾 0。 */
export function truncate(q: Rat, k: number): string {
  const scaled = (q.n * 10n ** BigInt(k)) / q.d;
  const s = scaled.toString().padStart(k + 1, "0");
  return k ? `${s.slice(0, -k)}.${s.slice(-k)}` : s;
}

/** 四舍五入保留 k 位小数，保留末尾 0（“保留两位小数”的写法）。 */
export function roundHalfUp(q: Rat, k: number): string {
  const scaled = (q.n * 10n ** BigInt(k) * 2n + q.d) / (2n * q.d);
  const s = scaled.toString().padStart(k + 1, "0");
  return k ? `${s.slice(0, -k)}.${s.slice(-k)}` : s;
}

/** 最简分数写法：整数写整数，否则 a/b。 */
export function fracText(q: Rat): string {
  return q.d === 1n ? String(q.n) : `${q.n}/${q.d}`;
}

/** 带分数写法：假分数写成“几又几分之几”，真分数和整数返回空串。 */
export function mixedText(q: Rat): string {
  if (q.d === 1n || q.n < q.d) return "";
  return `${q.n / q.d}又${q.n % q.d}/${q.d}`;
}

/** 多边形面积（鞋带公式），顶点为 [x, y]；返回 2 倍面积，保证是整数。 */
export function shoelace2(points: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s);
}
