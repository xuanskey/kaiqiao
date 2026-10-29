/* Pure decision shared by the browser and node --test. */
export function domainDecision({ hostname, pathname = '/', search = '', hash = '', hasRecords, topLevel = true }) {
  if (!topLevel || hostname !== 'yanghat.cn') return { kind: 'none' };
  return hasRecords ? { kind: 'banner' } : { kind: 'redirect', url: 'https://www.yanghat.cn' + pathname + search + hash };
}
export function hasPracticeRecords(storage) {
  // Conservatively retain even unreadable or empty existing saves for safe migration.
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (/^(kaiqiao\.save\.v1|kaiqiao\.review\.(content|schedule)\.v1|kaiqiao-class-log|kaiqiao-activity)(\.|$)/.test(key)) return true;
    }
    return false;
  } catch { return true; }
}
if (typeof window !== 'undefined') {
  const decision = domainDecision({ hostname: location.hostname, pathname: location.pathname, search: location.search, hash: location.hash,
    topLevel: window === window.top, hasRecords: (() => { try { return hasPracticeRecords(window.localStorage); } catch { return true; } })() });
  if (decision.kind === 'redirect') location.replace(decision.url);
  if (decision.kind === 'banner') {
    const show = () => {
      const banner = document.createElement('aside');
      banner.className = 'domain-notice'; banner.setAttribute('role', 'status');
      banner.append('本站正式地址是 www.yanghat.cn。你的练习记录保存在当前地址，请先在学情页「导出备份」，再到 www.yanghat.cn 导入。 ');
      const link = document.createElement('a'); link.href = 'https://www.yanghat.cn' + location.pathname + location.search + location.hash;
      link.textContent = '前往 www.yanghat.cn'; banner.append(link); document.body.prepend(banner);
      new ResizeObserver(() => document.documentElement.style.setProperty('--domain-notice-height', banner.getBoundingClientRect().height + 'px')).observe(banner);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true }); else show();
  }
}
