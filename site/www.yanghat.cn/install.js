// A single local boolean remembers dismissal. No identifiers or automatic prompts.
const key = 'kaiqiao.install-dismissed';
const hint = document.querySelector('#install-hint');
if (hint && location.pathname === '/' && new URLSearchParams(location.search).get('practice') !== '1') {
  let dismissed = false;
  try { dismissed = localStorage.getItem(key) === 'true'; } catch { /* Hint works without persistence. */ }
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (!standalone && !dismissed) {
    hint.hidden = false;
    const add = hint.querySelector('[data-install]');
    let pending;
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      hint.querySelector('[data-install-text]').textContent = '点分享 → 添加到主屏幕，下次一点就开。';
    }
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault(); pending = event; add.hidden = false;
    });
    add.addEventListener('click', async () => {
      if (!pending) return;
      const event = pending; pending = null; add.hidden = true;
      try { await event.prompt(); } catch { /* Browser may withdraw the prompt. */ }
    });
    hint.querySelector('[data-dismiss]').addEventListener('click', () => {
      hint.hidden = true;
      try { localStorage.setItem(key, 'true'); } catch { /* No storage required. */ }
    });
    window.addEventListener('appinstalled', () => { hint.hidden = true; });
  }
}
