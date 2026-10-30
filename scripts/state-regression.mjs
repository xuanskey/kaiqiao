// React 状态回归：真实构建 + 浏览器交互；答案由独立参考算法计算。
// npm run build && node scripts/state-regression.mjs
// 也由 smoke.mjs 调用。固定随机种子只影响浏览器测试，不给生产代码加入测试后门。
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { div, parseDecimal, roundHalfUp, terminating } from '../src/lib/lesson/reference.ts';
import { DEMO_LIST } from '../src/lib/lesson/demos.ts';

const AI_CONFIG = { enabled: true, baseUrl: 'https://ai.example.test', model: 'mock', apiKey: 'test-only-key' };
const LEVEL = ['', '简单', '标准', '提高'];
const promptOf = (page) => page.locator('.quiz-prompt').innerText();
const feedback = (page) => page.locator('.quiz-feedback');
const input = (page) => page.getByLabel('填写答案');
const teacher = (page, name) => page.locator('.tutor-actions').getByRole('button', { name, exact: true });
const bubble = (page) => page.locator('.tutor-bubble p').innerText();
const button = (page, name) => page.getByRole('button', { name, exact: true });

function decimal(prompt) {
  const m = /([\d.]+) ÷ ([\d.]+)/.exec(prompt);
  assert.ok(m, `可识别的除法题：${prompt}`);
  const quotient = div(parseDecimal(m[1]), parseDecimal(m[2]));
  const answer = prompt.includes('保留两位') ? roundHalfUp(quotient, 2) : terminating(quotient);
  assert.ok(answer !== null, `应有有限小数答案：${prompt}`);
  return { a: m[1], b: m[2], answer };
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '页面无横向溢出');
}
async function countIs(page, attempts, correct) {
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('kaiqiao-class-log') || '{}')['decimal-div']);
  assert.equal(log?.attempts ?? 0, attempts, '课堂记录仅在提交时增加');
  assert.equal(log?.correct ?? 0, correct, '正确题数保留');
  assert.ok((await page.locator('.quiz header').innerText()).includes(`本次 ${correct}/${attempts}`), '换题不重置本次正确率');
  const activity = await page.evaluate(() => JSON.parse(localStorage.getItem('kaiqiao-activity') || '{}'));
  // 课堂和每日活动记录均不能因换题/重放事件重复增加。
  const totals = Object.values(activity).reduce((n, x) => n + (x.n ?? 0), 0);
  assert.equal(totals, attempts, '活动记录只记一次');
}
async function levelIs(page, level) {
  assert.match(await page.locator('.quiz header').innerText(), new RegExp(`难度：${LEVEL[level]}`));
}
async function enter(page, base, id = 'decimal-div', grade = 5) {
  await page.goto(`${base}?lesson=${id}&grade=${grade}`);
  await page.locator('.lesson-head h1').waitFor();
  await button(page, '开始随堂练习').click();
  await page.locator('.quiz-prompt').waitFor();
  await noOverflow(page);
}
async function answer(page, correct) {
  const prompt = await promptOf(page);
  const { a, b, answer: right } = decimal(prompt);
  const given = correct ? right : String(Number(right) * 10);
  await input(page).fill(given);
  await button(page, '提交').click();
  await feedback(page).waitFor();
  assert.equal(await promptOf(page), prompt, '提交不能改变题干');
  assert.equal(await input(page).inputValue(), given, '反馈对应刚提交的答案');
  const steps = await feedback(page).locator('ol li').allTextContents();
  assert.deepEqual(steps, [
    `除数是小数，被除数和除数同时乘 10：${Math.round(Number(a) * 10)} ÷ ${Math.round(Number(b) * 10)}`,
    `${Math.round(Number(a) * 10)} ÷ ${Math.round(Number(b) * 10)} = ${right}`,
  ], '每一步解析与屏幕上的标准题一致');
  if (correct) assert.match(await feedback(page).innerText(), /答对了/);
  else {
    assert.ok((await feedback(page).innerText()).includes(`正确答案：${right}`));
    assert.equal(await page.locator('.quiz-hint').innerText(), '被除数和除数要同时扩大相同的倍数。');
  }
  await noOverflow(page);
  return prompt;
}
async function blank(page) {
  assert.equal(await feedback(page).count(), 0, '新题不能保留旧反馈');
  assert.equal(await input(page).inputValue(), '', '新题不能保留旧输入');
  assert.equal(await input(page).isEnabled(), true);
  assert.equal(await button(page, '提交').isDisabled(), true, '旧输入不能提交给新题');
  await noOverflow(page);
}

// 故意忽略 AbortSignal 的延迟 fetch：即使服务/模拟器仍返回，过期结果也必须被丢弃。
// completed 在 JSON 被消费后的下一任务标记，用事件进度等待替代固定 sleep。
function mockAi() {
  const realFetch = window.fetch.bind(window);
  window.aiMock = { requests: [], mode: 'defer' };
  window.fetch = (url, init) => {
    if (!String(url).startsWith('https://ai.example.test/')) return realFetch(url, init);
    const state = window.aiMock;
    const req = { aborted: false, completed: false, body: JSON.parse(init.body), release: null };
    state.requests.push(req);
    return new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        req.aborted = true;
        if (state.mode === 'timeout') reject(new DOMException('模拟取消', 'AbortError'));
      });
      req.release = (text = '过期回答 A') => {
        if (state.mode === 'network') { reject(new TypeError('模拟断网')); req.completed = true; return; }
        const res = new Response('{}', { status: state.mode === 'http' ? 503 : 200 });
        res.json = async () => {
          setTimeout(() => { req.completed = true; }, 0);
          return { choices: [{ message: { content: text } }] };
        };
        resolve(res);
        if (!res.ok) req.completed = true;
      };
    });
  };
}
async function sendAi(page) {
  await page.getByLabel('问老师', { exact: true }).fill('问题 A');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await page.waitForFunction(() => window.aiMock.requests.length === 1);
  assert.equal(await page.getByRole('button', { name: '发送', exact: true }).isDisabled(), true);
}
async function releaseAi(page, text = '过期回答 A') {
  await page.evaluate((text) => window.aiMock.requests[0].release(text), text);
  await page.waitForFunction(() => window.aiMock.requests[0].completed);
}
async function idleAi(page) {
  await page.waitForFunction(() => !document.querySelector('.ai-ask')?.textContent.includes('思考中'));
}

export async function runStateRegression(browser, base) {
  let passed = 0;
  const failures = [];
  async function run(name, viewport, fn, ai = false) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, serviceWorkers: 'block', locale: 'zh-CN' });
    const errors = [], external = [];
    await context.route('**/*', (route) => {
      const url = route.request().url();
      // vite preview 没有 Pages Functions：同源统计端点 /e 线上返回 204，这里照样模拟。
      if (url.startsWith(base) && new URL(url).pathname === '/e') return route.fulfill({ status: 204, body: '' });
      if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      external.push(url); return route.abort();
    });
    await context.addInitScript(({ ai, cfg }) => {
      let seed = 13217;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
      localStorage.setItem('kaiqiao-reduce-motion', '1');
      if (ai) localStorage.setItem('kaiqiao-ai', JSON.stringify(cfg));
    }, { ai, cfg: AI_CONFIG });
    if (ai) await context.addInitScript(mockAi);
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    try {
      await enter(page, base);
      await fn(page);
      await noOverflow(page);
      assert.deepEqual(errors, [], '无 pageerror 或 console error');
      assert.deepEqual(external, [], '测试不能访问外网或真实 AI');
      passed++;
      console.log(`✓ ${name}`);
    } catch (error) {
      failures.push({ name, error });
      console.error(`✗ ${name}: ${error.message}`);
    } finally { await context.close(); }
  }

  for (const [viewport, tag] of [[{ width: 390, height: 844 }, '手机'], [{ width: 1280, height: 900 }, '电脑']]) {
    await run(`${tag} A 连对两题：题干/答案/解析锁定，下一题升级`, viewport, async (page) => {
      await answer(page, true);
      await button(page, '下一题').click();
      await blank(page);
      await answer(page, true);
      await countIs(page, 2, 2);
      await levelIs(page, 2);
      assert.ok((await feedback(page).innerText()).includes('下一题将升级为「提高」'));
      await button(page, '下一题').click();
      await blank(page);
      await levelIs(page, 3);
      assert.match(await promptOf(page), /保留两位/);
    });
    await run(`${tag} B 连错两题：提示/解析锁定，下一题降级`, viewport, async (page) => {
      await answer(page, false);
      await button(page, '下一题').click();
      await answer(page, false);
      await countIs(page, 2, 0);
      await levelIs(page, 2);
      assert.ok((await feedback(page).innerText()).includes('下一题将降级为「简单」'));
      await button(page, '下一题').click();
      await blank(page);
      await levelIs(page, 1);
      assert.ok(!decimal(await promptOf(page)).b.includes('.'), '简单题除数为整数');
    });
    for (const [action, level] of [['再难一点', 3], ['简单一点', 1], ['给我出一道题', 2]]) {
      await run(`${tag} C 输入时${action}：清空旧输入`, viewport, async (page) => {
        const old = await promptOf(page);
        await input(page).fill('123456');
        await teacher(page, action).click();
        assert.notEqual(await promptOf(page), old, '主动操作确实换题');
        await blank(page);
        await levelIs(page, level);
        await countIs(page, 0, 0);
        const current = await promptOf(page);
        await input(page).fill(decimal(current).answer);
        await button(page, '提交').click();
        await page.locator('.quiz-feedback.is-ok').waitFor();
        assert.equal(await promptOf(page), current);
        await countIs(page, 1, 1);
      });
    }
    await run(`${tag} D 反馈时重新出题：清反馈，保留历史`, viewport, async (page) => {
      const old = await answer(page, false);
      await teacher(page, '给我出一道题').click();
      await blank(page);
      assert.notEqual(await promptOf(page), old);
      await countIs(page, 1, 0);
      await answer(page, true);
      await countIs(page, 2, 1);
      // 返回目录并重新进入，已完成记录仍在本地；不要求会话计数跨课堂保留。
      await button(page, '返回课程目录').click();
      await page.locator('.class-log', { hasText: '1/2' }).waitFor();
    });
    await run(`${tag} E 连错后的同类再练：保留原难度和知识点`, viewport, async (page) => {
      await answer(page, false);
      await button(page, '下一题').click();
      const old = await answer(page, false);
      await button(page, '同类再练一道').click();
      await blank(page);
      await levelIs(page, 2);
      assert.notEqual(await promptOf(page), old);
      const { b } = decimal(await promptOf(page));
      assert.ok(b.includes('.'), '仍练习除数是小数的同类题');
      await countIs(page, 2, 0);
      await answer(page, true);
      await countIs(page, 3, 1);
      await button(page, '下一题').click();
      await levelIs(page, 1);
    });
    await run(`${tag} 同源状态：我没听懂仅安排下一题，不打断输入`, viewport, async (page) => {
      const old = await promptOf(page);
      await input(page).fill(decimal(old).answer);
      await teacher(page, '我没听懂').click();
      assert.equal(await promptOf(page), old);
      assert.equal(await input(page).inputValue(), decimal(old).answer);
      await levelIs(page, 2);
      await answer(page, true);
      await button(page, '下一题').click();
      await levelIs(page, 1);
    });
    await run(`${tag} 同批次重复提交只计一次`, viewport, async (page) => {
      await input(page).fill(decimal(await promptOf(page)).answer);
      await page.locator('.quiz-fill').evaluate((form) => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await feedback(page).waitFor();
      await countIs(page, 1, 1);
    });
    await run(`${tag} 选择题：选项和反馈属于同一题，换题解锁`, viewport, async (page) => {
      await enter(page, base, 'pendulum', 5);
      const old = await promptOf(page);
      const lengths = [...old.matchAll(/(\d+) 厘米/g)].map((m) => Number(m[1]));
      assert.equal(lengths.length, 2);
      const right = `${Math.min(...lengths)} 厘米`;
      const choices = await page.locator('.quiz-choices button').allTextContents();
      await page.locator('.quiz-choices').getByRole('button', { name: right, exact: true }).click();
      await page.locator('.quiz-feedback.is-ok').waitFor();
      assert.equal(await promptOf(page), old);
      assert.deepEqual(await page.locator('.quiz-choices button').allTextContents(), choices);
      assert.equal(await page.locator('.quiz-choices button:enabled').count(), 0);
      assert.equal(await page.locator('.quiz-choices .is-right').innerText(), right);
      await teacher(page, '给我出一道题').click();
      assert.equal(await feedback(page).count(), 0);
      assert.ok(await page.locator('.quiz-choices button:enabled').count() > 0);
    });
    await run(`${tag} F 旧 AI 不能覆盖换讲法，随后新请求正常`, viewport, async (page) => {
      await sendAi(page);
      await teacher(page, '换一种方法讲').click();
      const latest = await bubble(page);
      assert.equal(latest, '换一种想法来讲。');
      await releaseAi(page);
      await idleAi(page);
      assert.equal(await bubble(page), latest, '过期 AI 不覆盖离线操作');
      assert.equal(await page.evaluate(() => window.aiMock.requests[0].aborted), true);
      await page.getByLabel('问老师', { exact: true }).fill('新问题 B');
      await page.getByRole('button', { name: '发送', exact: true }).click();
      await page.waitForFunction(() => window.aiMock.requests.length === 2);
      await page.evaluate(() => window.aiMock.requests[1].release('新回答 B'));
      await page.locator('.tutor-bubble', { hasText: '新回答 B' }).waitFor();
      await idleAi(page);
      await page.getByLabel('问老师', { exact: true }).fill('问题 C');
      await page.getByRole('button', { name: '发送', exact: true }).click();
      await page.waitForFunction(() => window.aiMock.requests.length === 3);
      await teacher(page, '换一种方法讲').click();
      await idleAi(page);
      const newest = await bubble(page);
      await page.getByLabel('问老师', { exact: true }).fill('问题 D');
      await page.getByRole('button', { name: '发送', exact: true }).click();
      await page.waitForFunction(() => window.aiMock.requests.length === 4);
      await page.evaluate(() => window.aiMock.requests[2].release('过期回答 C'));
      await page.waitForFunction(() => window.aiMock.requests[2].completed);
      assert.equal(await bubble(page), newest);
      assert.equal(await page.getByRole('button', { name: '发送', exact: true }).isDisabled(), true, 'C 完成不能清除 D 的 loading');
      await page.evaluate(() => window.aiMock.requests[3].release('新回答 D'));
      await page.locator('.tutor-bubble', { hasText: '新回答 D' }).waitFor();
      await idleAi(page);
    }, true);
  }

  // 新生命周期用于所有课程：补齐不同选择/判断/填空形态的真实浏览器覆盖。
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await run(`${viewport.width}px 全部 25 数学演示 + 11 科学实验：直达、板书、作答、换题`, viewport, async (page) => {
      assert.equal(DEMO_LIST.filter((d) => d.subject === 'math').length, 25);
      assert.equal(DEMO_LIST.filter((d) => d.subject === 'science').length, 11);
      for (const demo of DEMO_LIST) {
        await enter(page, base, demo.id, demo.grades[0]);
        assert.equal(await page.locator('.lesson-head h1').innerText(), demo.title);
        assert.equal(page.url().includes('lesson='), false, '直达链接正常消费');
        await button(page, '查看完整过程').click();
        assert.ok((await page.locator('.board').innerText()).length > 0);
        if (demo.subject === 'science') await page.getByRole('region', { name: '实验说明' }).waitFor();
        const prompt = await promptOf(page);
        const choices = page.locator('.quiz-choices button');
        if (await choices.count()) await choices.first().click();
        else { await input(page).fill('not-an-answer'); await button(page, '提交').click(); }
        await feedback(page).waitFor();
        assert.equal(await promptOf(page), prompt);
        assert.ok(await feedback(page).locator('ol li').count() > 0);
        await noOverflow(page);
        await teacher(page, '给我出一道题').click();
        assert.equal(await feedback(page).count(), 0);
        if (await choices.count()) assert.ok(await page.locator('.quiz-choices button:enabled').count() > 0);
        else await blank(page);
      }
    });
  }

  const desktop = { width: 1280, height: 900 };
  for (const action of ['清除密钥', '禁用', '修改模型', '离开课程', '切换课程']) {
    await run(`AI ${action}时取消，迟到回复不回写`, desktop, async (page) => {
      await sendAi(page);
      const old = await bubble(page);
      if (action === '离开课程' || action === '切换课程') {
        await button(page, '返回课程目录').click();
        await page.locator('.class-picker').waitFor();
        if (action === '切换课程') {
          await page.getByRole('group', { name: '年级', exact: true }).getByRole('button', { name: '五年级' }).click();
          await page.locator('.class-unit').filter({ has: page.locator('strong', { hasText: '小数乘法' }) }).getByRole('button', { name: '上课' }).click();
          await page.locator('.lesson-head h1', { hasText: '小数乘小数' }).waitFor();
        }
      } else {
        await page.locator('.ai-head').getByRole('button', { name: '设置' }).click();
        if (action === '清除密钥') await button(page, '清除密钥').click();
        else {
          if (action === '禁用') await page.getByLabel('开启 AI 老师').uncheck();
          else await page.getByLabel('模型', { exact: true }).fill('changed-model');
          await button(page, '保存').click();
        }
      }
      const latest = await page.locator('.tutor-bubble p').allTextContents();
      await releaseAi(page);
      await idleAi(page);
      assert.equal(await page.evaluate(() => window.aiMock.requests[0].aborted), true, '无效请求必须取消');
      assert.deepEqual(await page.locator('.tutor-bubble p').allTextContents(), latest);
      if (action === '清除密钥' || action === '禁用') {
        assert.equal(await page.locator('.ai-ask').count(), 0);
        assert.equal(await bubble(page), old);
      }
    }, true);
  }
  for (const mode of ['network', 'http', 'timeout', 'timeout-ignores-abort', 'cancel']) {
    await run(`AI ${mode}后退出 loading，可再次提问`, desktop, async (page) => {
      if (mode.startsWith('timeout')) await page.clock.install();
      await page.evaluate((mode) => { window.aiMock.mode = mode; }, mode);
      await sendAi(page);
      const old = await bubble(page);
      if (mode.startsWith('timeout')) await page.clock.runFor(20_001);
      else if (mode === 'cancel') await button(page, '取消请求').click();
      else await releaseAi(page);
      await idleAi(page);
      if (mode === 'cancel') assert.equal(await bubble(page), old);
      else assert.match(await bubble(page), mode.startsWith('timeout') ? /等待太久/ : mode === 'http' ? /503/ : /网络连接失败/);
      assert.equal(await page.getByRole('button', { name: '发送', exact: true }).isEnabled(), true);
      if (mode.startsWith('timeout') || mode === 'cancel') {
        assert.equal(await page.evaluate(() => window.aiMock.requests[0].aborted), true);
      }
      if (mode === 'timeout-ignores-abort' || mode === 'cancel') {
        const latest = await bubble(page);
        if (mode.startsWith('timeout')) {
          await page.evaluate(() => window.aiMock.requests[0].release());
          await page.clock.runFor(1);
          await page.waitForFunction(() => window.aiMock.requests[0].completed);
        } else await releaseAi(page);
        assert.equal(await bubble(page), latest, '取消/超时后迟到回复也被丢弃');
      }
    }, true);
  }
  console.log(`状态回归：${passed} 通过，${failures.length} 失败`);
  if (failures.length) throw new AggregateError(failures.map(({ name, error }) => new Error(`${name}: ${error.message}`)), '状态回归失败');
  return passed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
    await runStateRegression(browser, server.resolvedUrls.local[0]);
  } finally { await browser?.close(); await server.close(); }
}
