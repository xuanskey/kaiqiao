/**
 * 浏览器禁用网站数据时，连读取 window.localStorage 这个属性都会抛 SecurityError。
 * 统一从这里取：拿不到就返回 undefined，调用方按“不保存”处理，页面照常渲染。
 */
export function safeLocalStorage(win: { localStorage: Storage } | undefined = typeof window === "undefined" ? undefined : window): Storage | undefined {
  try { return win?.localStorage ?? undefined; } catch { return undefined; }
}
