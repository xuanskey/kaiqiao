// 可选的浏览器交互测试（不在 CI 中运行）：
// npm run build && npx vite preview --port 4173 &
// npm i --no-save playwright && CHROMIUM_PATH=/path/to/chromium node scripts/e2e-classroom.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const out = process.env.SHOT_DIR || 'e2e-shots';
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
await import('node:fs').then((fs) => fs.mkdirSync(out, { recursive: true }));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const results = [];
const ok = (name) => { results.push(name); console.log('✓', name); };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e))); page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  page.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) errors.push(m.text()); });
  await page.goto(BASE);
  await page.getByRole('button', { name: '课堂' }).first().click();
  await page.getByRole('heading', { name: '互动课堂' }).waitFor();
  for (const g of ['一年级','二年级','三年级','四年级','五年级','六年级']) await page.getByRole('group', { name: '年级' }).getByRole('button', { name: g }).waitFor();
  ok('年级 1—6 与上下册、学科、教材可选');
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '三年级' }).click();
  await page.screenshot({ path: `${out}/class-desktop.png`, fullPage: true });
  // 教材切换：未录入版本不显示课程
  await page.getByLabel('教材').selectOption('bsd-math');
  await page.getByText('目录还没有录入').waitFor();
  await page.getByLabel('教材').selectOption('pep-math');
  ok('未录入的教材版本不混用目录');
  // 三年级分数
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '分数的初步认识' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('heading', { name: '分数的初步认识' }).waitFor();
  await page.getByRole('button', { name: '播放' }).click();
  await page.waitForTimeout(3500);
  const idx1 = await page.locator('.player-steps .is-current').innerText();
  await page.getByRole('button', { name: '暂停' }).click();
  const boardA = await page.locator('.board').innerText();
  await page.waitForTimeout(1500);
  const boardB = await page.locator('.board').innerText();
  assert.equal(boardA, boardB, '暂停后板书不变');
  assert.equal(await page.locator('.player-steps .is-current').innerText(), idx1);
  ok(`播放后前进到第 ${idx1} 步，暂停后板书保持不变`);
  await page.getByRole('button', { name: /第 4 步/ }).click();
  const b4 = await page.locator('.board').innerText();
  assert.ok(b4.includes('涂色 = 1/4'));
  await page.getByRole('button', { name: '上一步' }).click();
  assert.ok(!(await page.locator('.board').innerText()).includes('涂色 = 1/4'), '回到第 3 步时第 4 步内容消失');
  await page.getByRole('button', { name: '下一步' }).click();
  assert.equal(await page.locator('.board').innerText(), b4, '跳转后与之前一致');
  ok('跳转、上一步、下一步后画面一致');
  await page.getByLabel('平均分成几份').fill('8');
  await page.getByLabel('涂色几份').fill('3');
  assert.ok((await page.locator('.board').innerText()).includes('涂色 = 3/8'));
  ok('改变分割方式后板书实时变为 3/8');
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  await page.locator('.stage svg rect').nth(5).click();
  assert.ok((await page.locator('.board').innerText()).includes('6/8'));
  ok('动手模式点格子涂色，分数随之变为 6/8');
  await page.getByRole('button', { name: '我没听懂' }).click();
  assert.equal(await page.getByLabel('速度').inputValue(), '0.75');
  await page.getByRole('button', { name: '给我出一道题' }).click();
  await page.locator('.quiz').waitFor();
  ok('规则老师：没听懂后放慢到 0.75 倍；出题按钮生成随堂练习');
  // 答错一题看提示
  const q = page.locator('.quiz');
  const choice = q.locator('.quiz-choices button');
  if (await choice.count()) await choice.first().click(); else { await q.getByLabel('填写答案').fill('9999'); await q.getByRole('button', { name: '提交' }).click(); }
  await q.locator('.quiz-feedback').waitFor();
  ok('提交后显示分步解析');
  await page.screenshot({ path: `${out}/fraction-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: '完整过程' }).click();
  assert.equal(await page.locator('.player-steps .is-current').innerText(), String(await page.locator('.player-steps li').count()));
  ok('“完整过程”一次显示全部步骤');
  // 一年级拖苹果
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '一年级' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '5 以内数的认识和加、减法' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  for (let i = 0; i < 2; i++) {
    const apples = page.locator('.stage svg g[style*="grab"]');
    const box = await apples.first().boundingBox();
    const svgBox = await page.locator('.stage svg').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(svgBox.x + svgBox.width * 0.2, svgBox.y + svgBox.height * 0.55, { steps: 8 });
    await page.mouse.up();
  }
  await page.locator('.stage-result', { hasText: '3 + 2 = 5' }).waitFor();
  ok('一年级：拖动 2 个苹果到左盘后显示 3 + 2 = 5');
  // 二年级平均分
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '二年级' }).click();
  await page.getByRole('group', { name: '学期' }).getByRole('button', { name: '下册' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '有余数的除法' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('group', { name: '看什么' }).getByRole('button', { name: '平均分（除法）' }).click();
  await page.getByLabel('一共几个').fill('14');
  await page.getByLabel('几组 / 几人').fill('4');
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '每人分一块' }).click();
  await page.locator('.stage-result', { hasText: '14 ÷ 4 = 3……2' }).waitFor();
  ok('二年级：14 块分给 4 人，逐轮分完得到 3……2');
  // 四年级量角
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '四年级' }).click();
  await page.getByRole('group', { name: '学期' }).getByRole('button', { name: '上册' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '角的度量' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  const handle = page.locator('.stage svg circle[style*="grab"]');
  const hb = await handle.boundingBox();
  const sb = await page.locator('.stage svg').boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.1, { steps: 10 }); await page.mouse.up();
  const angleText = await page.locator('.stage-result').textContent();
  assert.match(angleText, /^(8[5-9]|9[0-5])° · (锐角|直角|钝角)/);
  ok(`四年级：拖动角的一边到正上方，读数 ${angleText}`);
  // 五年级：新教材的等式性质（不再解方程）
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '五年级' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '用字母表示数和数量关系' }) }).getByRole('button', { name: '上课' }).click();
  for (let i = 1; i <= 5; i++) { await page.getByRole('button', { name: new RegExp(`^第 ${i} 步`) }).click(); }
  const bb = await page.locator('.board').innerText();
  assert.ok(bb.includes('3x + 4 = 19') && bb.includes('3×5 + 4 = 19') && bb.includes('等式两边') && bb.includes('初中'));
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  await page.getByLabel('猜 x 的值').fill('5');
  await page.locator('.stage-result', { hasText: '平衡了！x = 5' }).waitFor();
  ok('五年级（新教材）：代入 x=5 得 3×5+4=19，演示等式的性质并说明解方程到初中学；天平猜 5 时平衡');
  // 五年级：可能性真实随机试验
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '可能性' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('button', { name: '摸 100 次', exact: true }).click();
  const label = await page.locator('.stage svg').getAttribute('aria-label');
  const mm = label.match(/已摸 (\d+) 次，红 (\d+) 次，白 (\d+) 次/);
  assert.ok(mm && Number(mm[1]) === 100 && Number(mm[2]) + Number(mm[3]) === 100 && Number(mm[2]) > Number(mm[3]));
  ok(`五年级：红 7 白 3 真随机摸 100 次，红 ${mm[2]} 次、白 ${mm[3]} 次`);
  // 新教材目录核对
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '六年级' }).click();
  const six = await page.locator('.class-units').innerText();
  for (const t of ['确定位置', '生活中的负数', '鸽巢问题']) assert.ok(six.includes(t), t);
  for (const t of ['扇形统计图', '数与形']) assert.ok(!six.includes(t), t);
  ok('六上新目录：有确定位置、生活中的负数、鸽巢问题，没有比、扇形统计图、数与形');
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '鸽巢问题' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('button', { name: '随便放一次', exact: true }).click();
  await page.locator('.stage-result', { hasText: '确实不少于 3 个' }).waitFor();
  ok('鸽巢问题：7 个苹果随机放进 3 个抽屉，最多的抽屉确实不少于 3 个');
  await page.getByRole('button', { name: '返回课程目录' }).click();
  // 六年级圆
  await page.locator('li').filter({ has: page.locator('strong', { hasText: /^四 圆$/ }) }).getByRole('button', { name: '上课' }).click();
  await page.getByLabel('半径 r').fill('7');
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  await page.locator('.stage-result', { hasText: '153.86' }).waitFor();
  assert.ok((await page.locator('.stage-result').textContent()).includes('43.96'));
  ok('六年级：半径改为 7，周长 43.96、面积 153.86 实时更新');
  await page.screenshot({ path: `${out}/circle-desktop.png`, fullPage: true });
  // 科学：电路
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '四年级' }).click();
  await page.getByRole('group', { name: '学期' }).getByRole('button', { name: '下册' }).click();
  await page.getByRole('group', { name: '学科' }).getByRole('button', { name: '科学' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '电路' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('group', { name: '坏掉的灯泡' }).getByRole('button', { name: '第 1 个' }).click();
  await page.getByRole('button', { name: /第 3 步/ }).click();
  assert.ok((await page.locator('.stage-result').textContent()).includes('不亮'));
  await page.getByRole('group', { name: '连接方式' }).getByRole('button', { name: '并联' }).click();
  assert.ok((await page.locator('.stage-result').textContent()).includes('其他灯照样亮'));
  await page.getByText('安全提醒').waitFor();
  ok('科学：串联坏一个灯全灭，改并联后其余灯仍亮；有安全提醒');
  await page.screenshot({ path: `${out}/circuit-desktop.png`, fullPage: true });
  // v0.9：四上声音、摩擦力；六上杠杆、昼夜
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '学期' }).getByRole('button', { name: '上册' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '摩擦力' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('group', { name: '接触面' }).getByRole('button', { name: '毛巾' }).click();
  await page.getByRole('button', { name: /第 3 步/ }).click();
  const fr = await page.locator('.stage-result').textContent();
  assert.ok(fr.includes('1.4'), `毛巾 + 1 个钩码应约 1.4 牛：${fr}`);
  ok('四年级科学：换成毛巾表面，测力计读数变为 1.4 牛');
  await page.screenshot({ path: `${out}/friction-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '声音' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  await page.getByLabel('钢尺伸出长度').fill('6');
  await page.locator('.stage-result', { hasText: '音调高' }).waitFor();
  ok('四年级科学：钢尺伸出 6 厘米，显示音调高');
  await page.screenshot({ path: `${out}/sound-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '六年级' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '杠杆' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  await page.getByRole('button', { name: '用力点移到第 6 格' }).click();
  await page.locator('.stage-result', { hasText: '省力' }).waitFor();
  assert.ok((await page.locator('.stage-result').textContent()).includes('3×2 = 1×6'));
  await page.getByRole('button', { name: '用力点移到第 1 格' }).click();
  await page.locator('.stage-result', { hasText: '费力' }).waitFor();
  ok('六年级科学：点刻度把用力点移到第 6 格省力（3×2 = 1×6），移到第 1 格费力');
  await page.screenshot({ path: `${out}/lever-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '昼夜交替' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  await page.getByRole('slider', { name: '北京时间' }).first().fill('22');
  await page.locator('.stage svg text', { hasText: '22 时：黑夜' }).waitFor();
  await page.getByRole('slider', { name: '北京时间' }).first().fill('12');
  await page.locator('.stage svg text', { hasText: '太阳在南方' }).waitFor();
  ok('六年级科学：22 时北京是黑夜，12 时白天且太阳在南方');
  await page.screenshot({ path: `${out}/earth-desktop.png`, fullPage: true });
  // 二年级下：拖动分针认识时间
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '学科' }).getByRole('button', { name: '数学' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '二年级' }).click();
  await page.getByRole('group', { name: '学期' }).getByRole('button', { name: '下册' }).click();
  await page.locator('li').filter({ has: page.locator('strong', { hasText: '时间在哪里' }) }).getByRole('button', { name: '上课' }).click();
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  const ch = page.locator('.stage svg circle[style*="grab"]');
  const cb = await ch.boundingBox(); const csv = await page.locator('.stage svg').boundingBox();
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await page.mouse.down();
  await page.mouse.move(csv.x + csv.width * (140 / 440), csv.y + csv.height * (190 / 230), { steps: 12 }); await page.mouse.up();
  await page.locator('.stage-result', { hasText: '3 时 30 分' }).waitFor();
  ok('二年级：把分针拖到 6，显示 3 时 30 分');
  // AI 老师：用模拟接口验证（不使用真实密钥）
  await page.route('https://api.example.com/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON();
    const ok2 = body.messages[0].content.includes('2 年级') && route.request().headers()['authorization'] === 'Bearer test-key';
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { content: ok2 ? '<b>分针</b>指着 6，就是 30 分。' : '提示词不对' } }] }) });
  });
  assert.equal(await page.getByLabel('AI 服务').count(), 0, '平台 AI 预付费演示入口已下线');
  const aiCalls = [];
  page.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/api/ai/')) aiCalls.push(r.url()); });
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByLabel('开启 AI 老师').check();
  await page.getByLabel('服务地址').fill('https://api.example.com/v1');
  await page.getByLabel('API 密钥').fill('test-key');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByLabel('问老师').fill('为什么是 30 分？');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await page.locator('.tutor-bubble', { hasText: '分针指着 6，就是 30 分。' }).waitFor();
  assert.ok(!(await page.locator('.tutor-bubble').innerHTML()).includes('<b>'), 'AI 回复只显示纯文本');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '清除密钥' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('kaiqiao-ai')), null);
  assert.deepEqual(aiCalls, [], '课堂不再请求 /api/ai/*');
  ok('AI 老师（模拟接口）：按年级发送提示词，回复去掉 HTML 后显示；清除后不再保存密钥');
  // 随堂练习写入课堂记录
  await page.getByRole('button', { name: '开始随堂练习' }).click();
  const qz = page.locator('.quiz');
  if (await qz.locator('.quiz-choices button').count()) await qz.locator('.quiz-choices button').first().click(); else { await qz.getByLabel('填写答案').fill('60'); await qz.getByRole('button', { name: '提交' }).click(); }
  await qz.locator('.quiz-feedback').waitFor();
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.locator('.class-log li', { hasText: '认识时间' }).waitFor();
  ok('随堂练习结果写入“课堂练习记录”');
  // 导入资料
  await page.getByLabel('资料内容').fill('# 小数乘法\n1.2×0.5=\n1O+5=\n解方程 3x+4=19');
  await page.getByLabel('适用年级').selectOption('5');
  await page.getByRole('button', { name: '识别内容' }).click();
  await page.locator('.import-item', { hasText: '答案：0.6' }).waitFor();
  await page.locator('.import-item.is-needs-confirm', { hasText: '1O+5=' }).waitFor();
  await page.locator('.import-item.is-above-grade', { hasText: '解方程' }).waitFor();
  ok('导入资料：1.2×0.5 算出 0.6；“1O+5”标为需确认；解方程标为超出年级');
  // 原有功能回归
  await page.getByRole('button', { name: '首页' }).first().click();
  await page.getByRole('button', { name: '题库' }).first().click();
  await page.getByText('按知识点练').first().waitFor();
  await page.getByRole('button', { name: '课堂' }).first().click();
  await page.getByRole('button', { name: '进入理解实验室' }).click();
  await page.getByText('数学，自己想明白。').waitFor();
  assert.equal(await page.locator('.nav-item.is-active').first().innerText(), '课堂');
  ok('原有首页、题库正常；理解实验室并入课堂，导航高亮“课堂”');
  // 手机
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  m.on('pageerror', (e) => errors.push(String(e))); m.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  await m.goto(BASE);
  await m.getByRole('button', { name: '课堂' }).first().click();
  await m.getByRole('group', { name: '年级' }).getByRole('button', { name: '六年级' }).click();
  await m.getByRole('group', { name: '学期' }).getByRole('button', { name: '下册' }).click();
  await m.screenshot({ path: `${out}/class-mobile.png`, fullPage: true });
  await m.locator('li', { hasText: '圆柱与圆锥' }).getByRole('button', { name: '上课' }).click();
  await m.getByRole('button', { name: /第 3 步/ }).tap();
  await m.screenshot({ path: `${out}/cylinder-mobile.png`, fullPage: true });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false, '手机端没有横向溢出');
  ok('手机端 390px：课堂页无横向溢出');
  assert.deepEqual(errors, [], '页面没有报错');
  ok('全程没有页面错误');
} finally {
  await browser.close();
  console.log(`\n${results.length} 项浏览器交互检查通过`);
}
