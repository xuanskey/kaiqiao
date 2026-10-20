/** 小学阶段用到的精确小数工具：用“整数 + 小数位数”表示，避免 0.1 + 0.2 这类浮点误差。 */

/** 把 value / 10^scale 格式化为去掉末尾 0 的小数字符串。 */
export function fmtScaled(value: number, scale: number): string {
  if (!Number.isInteger(value) || !Number.isInteger(scale) || scale < 0) throw new Error("fmtScaled 需要整数");
  const neg = value < 0;
  const abs = Math.abs(value);
  const base = 10 ** scale;
  const int = Math.floor(abs / base);
  let frac = scale > 0 ? String(abs % base).padStart(scale, "0") : "";
  frac = frac.replace(/0+$/, "");
  return `${neg ? "-" : ""}${int}${frac ? `.${frac}` : ""}`;
}

/** 保留 d 位小数的四舍五入（用整数运算），用于“约等于”。 */
export function roundTo(n: number, d: number): string {
  const base = 10 ** d;
  const v = Math.round((n + Number.EPSILON) * base);
  return fmtScaled(v, d);
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
