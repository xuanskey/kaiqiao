export type Usage = { prompt: number; completion: number; cached?: number };
export function costFen(usage: Usage, peak: boolean): number {
  const { prompt, completion, cached = 0 } = usage;
  if (![prompt, completion, cached].every(Number.isSafeInteger) || prompt < 0 || completion < 0 || cached < 0 || cached > prompt) throw new Error('invalid_usage');
  // 单价为分 / 百万 token；加权整数分子除以 1_000_000 后得到分。
  const units = (prompt - cached) * 100 + cached * 2 + completion * 400;
  const scaled = units * (peak ? 2 : 1);
  if (!Number.isSafeInteger(scaled) || !Number.isSafeInteger(scaled + 999_999)) throw new Error('invalid_usage');
  return Math.max(1, Math.floor((scaled + 999_999) / 1_000_000));
}
export function debit(balance: number, cost: number): number {
  if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(cost) || cost < 1 || balance < cost) throw new Error('insufficient_balance');
  return balance - cost;
}
export function isPeak(date: Date, holiday = false): boolean {
  const beijing = new Date(date.getTime() + 8 * 3600000);
  const day = beijing.getUTCDay(), hour = beijing.getUTCHours();
  return !holiday && day >= 1 && day <= 5 && ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 18));
}
