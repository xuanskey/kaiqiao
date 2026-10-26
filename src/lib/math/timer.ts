/**
 * 限时界面不需要每帧刷新整道题。
 * 只有显示用的剩余秒数变化，或时间走完，才把累计的间隔交给状态。
 */
export function shouldPublishTimer(remain: number, carry: number): boolean {
  if (!(carry > 0) || !Number.isFinite(carry) || !Number.isFinite(remain) || remain <= 0) return false;
  const next = Math.max(0, remain - carry);
  return next <= 0 || Math.ceil(next) !== Math.ceil(remain);
}
