// 浏览器冒烟测试（CI 每次运行）：用本地 vite preview 打开 dist/ 构建产物，不访问外网。
// 用法：npm run build && npm run test:smoke
// 本地可用系统 Chromium：CHROMIUM_PATH=/usr/bin/chromium npm run test:smoke
// 覆盖：手机/电脑视口打开五节课；改参数后结果正确；随堂练习答对/答错的反馈；
// 无 console error / pageerror、无横向溢出；旧版本学习记录升级不丢；损坏数据不崩溃、不覆盖原数据。
import assert from 'node:assert/strict';
import { preview } from 'vite';
import { chromium } from 'playwright';

const started = Date.now();
const server = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: false }, logLevel: 'error' });
const BASE = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
let passed = 0;
const ok = (name) => { passed++; console.log(`✓ ${name}`); };

/** 每个页面：拦截外网请求（记下来算失败）、收集 console error 和 pageerror。 */
async function openPage(viewport, initStorage) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, serviceWorkers: 'block', locale: 'zh-CN' });
  const external = [], errors = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    external.push(url); return route.abort();
  });
  if (initStorage) await context.addInitScript((items) => {
    if (sessionStorage.getItem('smoke-init')) return;
    sessionStorage.setItem('smoke-init', '1');
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  }, initStorage);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.setDefaultTimeout(15_000);
  return { page, context, done: async () => { assert.deepEqual(errors, [], '不应有运行时错误'); assert.deepEqual(external, [], '不应请求外网'); await context.close(); } };
}

async function noOverflow(page, tag) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `${tag} 横向溢出 ${overflow}px`);
}

// ———— 独立计算随堂练习的答案（不用应用里的函数） ————
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function decimalAnswer(prompt) {
  const m = /([\d.]+) ÷ ([\d.]+)/.exec(prompt);
  const toTenths = (s) => Math.round(Number(s) * 10);
  const a = toTenths(m[1]), b = toTenths(m[2]);
  if (prompt.includes('保留两位')) { const x = Math.floor((a * 1000) / b); const r = Math.floor((x + 5) / 10); return `${Math.floor(r / 100)}.${String(r % 100).padStart(2, '0')}`; }
  for (let k = 0; k <= 6; k++) { const n = a * 10 ** k; if (n % b === 0) { const q = String(n / b).padStart(k + 1, '0'); return k ? `${q.slice(0, -k)}.${q.slice(-k)}`.replace(/\.?0+$/, '') : q; } }
  throw new Error(`除不尽：${prompt}`);
}
function fractionAnswer(prompt) {
  let n, d;
  let m = /有 (\d+) 人，其中 (\d+)\/(\d+)/.exec(prompt);
  if (m) { n = Number(m[1]) * Number(m[2]); d = Number(m[3]); }
  else if ((m = /^(\d+)\/(\d+) × (\d+)\/(\d+)/.exec(prompt))) { n = m[1] * m[3]; d = m[2] * m[4]; }
  else if ((m = /^(\d+)\/(\d+) × (\d+)/.exec(prompt))) { n = m[1] * m[3]; d = Number(m[2]); }
  else throw new Error(`看不懂题目：${prompt}`);
  const g = gcd(n, d); n /= g; d /= g;
  return d === 1 ? String(n) : `${n}/${d}`;
}

const LESSONS = [
  { id: 'make-ten', grade: 1, board: '9 + 1 = 10，10 + 3 = 13', act: async (page) => { await page.getByRole('button', { name: '第二个加数加 1' }).click(); await page.locator('.stage', { hasText: '10 + 4 = 14' }).waitFor(); } },
  { id: 'bar-chart', grade: 4, board: '10 − 3 = 7（票）', act: async (page) => { await page.getByRole('button', { name: '葡萄加 1 票' }).click(); await page.locator('.stage', { hasText: '相差 6 票' }).waitFor(); await page.locator('.stage', { hasText: '共 27 人' }).waitFor(); } },
  { id: 'poly-area', grade: 5, board: '8 × 5 = 40', act: async (page) => {
    await page.locator('.param-options', { hasText: '图形' }).getByRole('button', { name: '梯形' }).click();
    await page.locator('.stage', { hasText: '(4 + 8) × 5 ÷ 2 = 30' }).waitFor();
    const h = page.getByRole('slider', { name: '高' }); await h.focus(); await page.keyboard.press('ArrowRight'); // 高 5 → 6
    await page.locator('.stage', { hasText: '(4 + 8) × 6 ÷ 2 = 36' }).waitFor();
  } },
  { id: 'decimal-div', grade: 5, board: '7.2 ÷ 0.4 = 18', act: async (page) => {
    await page.getByRole('button', { name: '除数加 0.1', exact: true }).click(); // 7.2 ÷ 0.5 = 14.4
    await page.locator('.ddiv .dec-answer', { hasText: '14.4' }).waitFor();
    await page.getByRole('button', { name: '除数加 1', exact: true }).click(); // 7.2 ÷ 1.5 = 4.8
    await page.locator('.ddiv .dec-answer', { hasText: '4.8' }).waitFor();
    await page.getByRole('button', { name: '除数加 0.1', exact: true }).click(); // 7.2 ÷ 1.6 = 4.5
    await page.locator('.ddiv .dec-answer', { hasText: '4.5' }).waitFor();
    await page.getByRole('button', { name: '被除数加 1', exact: true }).click(); // 8.2 ÷ 1.6 = 5.125
    await page.locator('.ddiv .dec-answer', { hasText: '5.125' }).waitFor();
    await page.getByRole('button', { name: '除数减 1', exact: true }).click(); // 8.2 ÷ 0.6 = 13.666… ≈ 13.67
    await page.locator('.ddiv', { hasText: '循环节是 6' }).waitFor();
    await page.locator('.ddiv .dec-answer', { hasText: '13.67' }).waitFor();
  } },
  { id: 'fraction-mul', grade: 6, board: '3/4 × 2/3 = 1/2', act: async (page) => { await page.getByRole('button', { name: '第一个分数取 1/4' }).click(); await page.locator('.stage', { hasText: '1/4 × 2/3 = 1/6' }).waitFor(); } },
];

async function doQuiz(page, kind, tag) {
  const solve = kind === 'decimal' ? decimalAnswer : fractionAnswer;
  await page.getByRole('button', { name: '开始随堂练习' }).click();
  const quiz = page.locator('.quiz');
  await quiz.waitFor();
  // 第 1 题：独立算出答案，应判对
  const prompt1 = (await quiz.locator('.quiz-prompt').innerText()).trim();
  await quiz.getByLabel('填写答案').fill(solve(prompt1));
  await quiz.getByRole('button', { name: '提交' }).click();
  await quiz.locator('.quiz-feedback.is-ok', { hasText: '答对了' }).waitFor();
  await quiz.getByRole('button', { name: '下一题' }).click();
  // 第 2 题：故意写错（小数点挪一位、保留位数不对 / 分母相加），应显示正确答案、解析和针对性提示
  const prompt2 = (await quiz.locator('.quiz-prompt').innerText()).trim();
  const right = solve(prompt2);
  let wrong = null;
  if (kind === 'decimal') wrong = prompt2.includes('保留两位') ? right.slice(0, -1) : String(Number((Number(right) * 10).toFixed(6)));
  else { const m = /^(\d+)\/(\d+) × (\d+)\/(\d+)/.exec(prompt2); if (m) wrong = `${+m[1] + +m[3]}/${+m[2] + +m[4]}`; }
  await quiz.getByLabel('填写答案').fill(wrong ?? '9999');
  await quiz.getByRole('button', { name: '提交' }).click();
  const fb = quiz.locator('.quiz-feedback.is-bad');
  await fb.waitFor();
  assert.ok((await fb.innerText()).includes(`正确答案：${right}`), `${tag} 正确答案`);
  if (wrong) await fb.locator('.quiz-hint').waitFor();
  assert.ok(await fb.locator('ol li').count() >= 1, `${tag} 分步解析`);
}

try {
  for (const [vw, tag] of [[{ width: 1280, height: 900 }, '电脑'], [{ width: 390, height: 844 }, '手机']]) {
    const { page, done } = await openPage(vw);
    for (const l of LESSONS) {
      await page.goto(`${BASE}?lesson=${l.id}&grade=${l.grade}`);
      await page.locator('.lesson-head h1').waitFor();
      assert.ok(!page.url().includes('lesson='), '直达后清掉地址栏参数');
      await page.getByRole('button', { name: '完整过程' }).click();
      const board = await page.locator('.board').innerText();
      assert.ok(board.includes(l.board), `${l.id} 板书应包含 ${l.board}：${board}`);
      await page.getByRole('button', { name: '让我自己试试' }).first().click();
      await l.act(page);
      await noOverflow(page, `${tag} ${l.id}`);
      if ((tag === '电脑' && l.id === 'decimal-div') || (tag === '手机' && l.id === 'fraction-mul')) {
        await doQuiz(page, l.id === 'decimal-div' ? 'decimal' : 'fraction', `${tag} ${l.id}`);
        await noOverflow(page, `${tag} ${l.id} 练习后`);
        ok(`${tag}：${l.id} 随堂练习答对、答错（含针对性提示）`);
      }
      ok(`${tag}：${l.id} 打开课程、板书正确、改参数后结果正确、无横向溢出`);
    }
    await done();
  }

  // 旧版本（v0.2，存档 v2）的学习记录升级后不丢
  {
    const v2 = { version: 2, stars: { 'warmup:1': 3 }, xp: 150, streak: 4, lastPlayDate: '2026-09-20', lastDaily: '2026-09-20', stats: { answered: 37, correct: 30 }, muted: false, skillStats: {}, sprintBest: 12,
      wrong: [{ prompt: '37 + 48 = ?', answer: '85', explain: '个位 7 + 8 = 15，向十位进 1。', chapterId: 'warmup', given: '75', at: 1758300000000, mode: 'keypad', keypad: 'int' }] };
    const classLog = { 'make-ten': { attempts: 5, correct: 4, lastAt: 1758300000000 } };
    const { page, done } = await openPage({ width: 390, height: 844 }, { 'kaiqiao.save.v1': JSON.stringify(v2), 'kaiqiao-class-log': JSON.stringify(classLog) });
    await page.goto(BASE);
    await page.getByRole('button', { name: '学情', exact: true }).first().click();
    await page.getByText('答对 30 / 37 题').waitFor();
    await page.getByRole('button', { name: /^错题本/ }).first().click();
    await page.getByRole('heading', { name: '37 + 48 = ?' }).waitFor();
    await page.getByRole('button', { name: '课堂', exact: true }).first().click();
    await page.locator('.class-log', { hasText: '4/5' }).waitFor();
    await page.locator('#grade').selectOption('4'); // 切换年级会保存
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('kaiqiao.save.v1')));
    assert.equal(saved.version, 4); assert.deepEqual(saved.stats, { answered: 37, correct: 30 }); assert.equal(saved.wrong[0].prompt, '37 + 48 = ?'); assert.equal(saved.xp, 150);
    await noOverflow(page, '旧存档');
    await done();
    ok('旧版本存档（v2）升级为 v4：答题数、错题、课堂记录都保留');
  }

  // 损坏数据：页面不崩溃，原数据不被覆盖
  {
    const { page, done } = await openPage({ width: 1280, height: 900 }, { 'kaiqiao.save.v1': '{"version":4,"xp":', 'kaiqiao-class-log': '[坏', 'kaiqiao-activity': 'null', 'kaiqiao-ai': '{坏' });
    await page.goto(`${BASE}?lesson=decimal-div&grade=5`);
    await page.locator('.lesson-head h1').waitFor();
    await page.locator('.storage-alert', { hasText: '保护原数据' }).waitFor();
    await doQuiz(page, 'decimal', '损坏数据');
    const after = await page.evaluate(() => ({ save: localStorage.getItem('kaiqiao.save.v1'), log: localStorage.getItem('kaiqiao-class-log'), logCopy: localStorage.getItem('kaiqiao-class-log.unreadable') }));
    assert.equal(after.save, '{"version":4,"xp":', '损坏的主存档不能被覆盖');
    assert.equal(after.logCopy, '[坏', '损坏的课堂记录先另存');
    assert.ok(JSON.parse(after.log)['decimal-div'].attempts === 2);
    await page.getByRole('button', { name: '学情', exact: true }).first().click();
    await page.getByRole('button', { name: '下载原始存档' }).waitFor();
    await done();
    ok('损坏的存档/课堂记录/AI 设置：不崩溃，原数据保留或先另存');
  }
  console.log(`冒烟测试通过：${passed} 项，用时 ${Math.round((Date.now() - started) / 1000)} 秒`);
} finally {
  await browser.close();
  await server.close();
}
