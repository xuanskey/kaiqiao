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
if (next && ["#demo-answer", ".equation", "#demo-explanation", "#demo-button-label", "#left-count-label", "#right-count-label", "#counting-description", "#demo-progress"].every(selector => document.querySelector(selector)) && document.querySelectorAll("[data-token]").length === 5) {
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

// 动画演示：只在进入视口时自动播放；可暂停，章节可跳转；减弱动效时不自动播放，直接显示每段的完成画面。
const stage = document.querySelector('#promo-stage');
const toggle = document.querySelector('#promo-toggle');
if (stage && toggle && stage.querySelectorAll('.scene').length === stage.querySelectorAll('.promo-progress i').length) {
  const scenes = [...stage.querySelectorAll('.scene')];
  const bars = [...stage.querySelectorAll('.promo-progress i')];
  const chapters = [...document.querySelectorAll('[data-promo-scene]')];
  const durations = scenes.map(scene => Number(scene.dataset.duration) || 5000);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, elapsed = 0, last = 0, frame = 0, visible = false, held = reduceMotion.matches;
  function paint() {
    bars.forEach((bar, i) => bar.style.setProperty('--p', i < index ? 1 : i > index ? 0 : Math.min(elapsed / durations[index], 1)));
  }
  function show(next) {
    index = (next + scenes.length) % scenes.length;
    elapsed = 0;
    scenes.forEach(scene => scene.classList.remove('is-current'));
    void stage.getBoundingClientRect(); // 重新挂上 is-current 以从头播放本段动画
    scenes[index].classList.add('is-current');
    chapters.forEach(button => {
      if (Number(button.dataset.promoScene) === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    paint();
  }
  function tick(now) {
    elapsed += now - last;
    last = now;
    if (elapsed >= durations[index]) show(index + 1);
    paint();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    const running = visible && !held && !document.hidden;
    stage.classList.toggle('is-paused', !running);
    stage.classList.toggle('is-held', held);
    toggle.setAttribute('aria-label', held ? '播放动画' : '暂停动画');
    cancelAnimationFrame(frame);
    if (running) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  toggle.addEventListener('click', () => {
    held = !held;
    if (!held && stage.classList.contains('is-static')) {
      stage.classList.remove('is-static');
      show(index);
    }
    sync();
  });
  chapters.forEach(button => button.addEventListener('click', () => {
    // 暂停时跳章节直接显示该段完成画面；播放中则从该段开头继续播。
    stage.classList.toggle('is-static', held);
    show(Number(button.dataset.promoScene));
    sync();
  }));
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting;
      sync();
    }, { threshold: 0.35 }).observe(stage);
  } else {
    visible = true;
  }
  stage.classList.add('is-live');
  stage.classList.toggle('is-static', held);
  toggle.hidden = false;
  show(held ? scenes.length - 1 : 0);
  sync();
}
}
