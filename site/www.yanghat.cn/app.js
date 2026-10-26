'use strict';

// practice=1 时首页只内嵌练习，不跑门面动效。
if (new URLSearchParams(location.search).get('practice') !== '1') {
// The main site stays useful without JavaScript. Enhancements are enabled here.
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
const mobileBreakpoint = window.matchMedia('(max-width: 640px)');
if (menuToggle && mobileMenu) {
  menuToggle.hidden = false;
  function setMenu(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    mobileMenu.hidden = !open;
  }
  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  mobileMenu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileMenu.hidden) {
      setMenu(false);
      menuToggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!mobileMenu.hidden && !event.target.closest('.site-header')) setMenu(false);
  });
  function checkBreakpoint(event) { if (!event.matches) setMenu(false); }
  if (mobileBreakpoint.addEventListener) mobileBreakpoint.addEventListener('change', checkBreakpoint);
  else mobileBreakpoint.addListener(checkBreakpoint);
}

const next = document.querySelector('#demo-next');
if (next) {
  const answer = document.querySelector('#demo-answer');
  const equation = document.querySelector('.equation');
  const explanation = document.querySelector('#demo-explanation');
  const label = document.querySelector('#demo-button-label');
  const leftCount = document.querySelector('#left-count-label');
  const rightCount = document.querySelector('#right-count-label');
  const description = document.querySelector('#counting-description');
  const progress = document.querySelector('#demo-progress');
  const tokens = [...document.querySelectorAll('[data-token]')];
  const shifts = [[-116, 50], [-113, 50], [-78, 25], [19, -25], [19, -25]];
  const steps = [
    { title: '8 离 10，还差几个？', detail: '先想一想，再一起看看。', button: '看一看，怎么想', left: '先看 8 个', right: '再加 5 个', description: '左边十格框中有 8 个绿色圆点，右边有 5 个黄色圆点。' },
    { title: '从 5 里面，分出 2 个。', detail: '8 + 2 = 10，右边还剩 3 个。', button: '凑成十，然后呢？', left: '8 + 2，凑成 10', right: '还剩 3 个', description: '从右边 5 个黄色圆点中移出 2 个，补满左边的十格框。左边共 10 个，右边剩 3 个。' },
    { title: '10 再加 3，原来就是 13。', detail: '把 5 拆成 2 和 3，想一想就更清楚了。', button: '再看一遍', left: '一整组 10 个', right: '再加 3 个', description: '左边 10 个圆点加右边 3 个圆点，一共 13 个。8 加 5 等于 13。' },
  ];
  let step = 0;
  function render() {
    const current = steps[step];
    answer.textContent = step === 2 ? '13' : '?';
    answer.classList.toggle('is-revealed', step === 2);
    equation.setAttribute('aria-label', step === 2 ? '8 加 5 等于 13' : '8 加 5 等于多少');
    explanation.replaceChildren();
    const title = document.createElement('strong');
    const detail = document.createElement('p');
    title.textContent = current.title;
    detail.textContent = current.detail;
    explanation.append(title, detail);
    label.textContent = current.button;
    leftCount.textContent = current.left;
    rightCount.textContent = current.right;
    description.textContent = current.description;
    progress.setAttribute('aria-label', `示例第 ${step + 1} 步，共 3 步`);
    [...progress.children].forEach((dot, index) => dot.classList.toggle('is-active', index === step));
    tokens.forEach((token, index) => {
      const [x, y] = step === 0 ? [0, 0] : shifts[index];
      token.style.transform = `translate(${x}px, ${y}px)`;
    });
  }
  next.hidden = false;
  next.addEventListener('click', () => { step = (step + 1) % steps.length; render(); });
}
}
