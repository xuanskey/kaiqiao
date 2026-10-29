/** 错误边界：resetKey 变化（例如切换页面）时才退出出错状态。 */
export function shouldReset(prevKey: unknown, nextKey: unknown, hasError: boolean): boolean {
  return hasError && !Object.is(prevKey, nextKey);
}
