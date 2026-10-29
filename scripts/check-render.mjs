import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

// 课堂在应用里按需加载（React.lazy），服务端一次性渲染只会得到占位；这里用单文件构建的静态别名直接渲染课堂。
process.env.KAIQIAO_SINGLE_FILE = '1';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { Game } = await server.ssrLoadModule('/src/components/math/game.tsx');
  const { useMath } = await server.ssrLoadModule('/src/store/math.ts');
  // Render the selected store state on the server; effects and browser behavior
  // are deliberately outside this smoke test.
  const initial = useMath.getInitialState();
  const render = (expected) => {
    Object.assign(initial, useMath.getState());
    const html = renderToString(createElement(Game));
    assert.ok(html.includes(expected), expected);
    return html;
  };
  render('练习年级');
  useMath.getState().go('map'); render('题库与闯关');
  useMath.getState().go('review'); render('还没有错题');
  useMath.setState({ skillStats: { add: { seen: 4, correct: 3, sumMs: 1000, firstSeen: 3, firstCorrect: 2, retrySeen: 1, retryCorrect: 1 } } });
  useMath.getState().go('report');
  const splitReport = render('备份与恢复');
  assert.ok(splitReport.includes('首答正确率 67%（2/3 题）'));
  assert.ok(splitReport.includes('巩固正确率 100%（1/1 题）'));
  useMath.getState().startDaily(); render('准备');
  useMath.getState().startDuel(); render('和电脑练一练');
  useMath.getState().tickDuel(60); render('平手');
  // The redesign must not hide older wrong items or imply a perfect empty report.
  useMath.setState({ selectedGrade: 3, stats: { answered: 0, correct: 0 }, wrong: Array.from({ length: 14 }, (_, i) => ({ chapterId: 'warmup', prompt: `待复习题目 ${i + 1}`, given: '0', answer: '1', explain: '先想清楚题意', at: i + 1 })) });
  useMath.getState().go('review');
  const review = render('待复习题目 14');
  assert.equal((review.match(/class="wrong-card"/g) ?? []).length, 14);
  useMath.getState().setGrade(1);
  useMath.getState().go('review'); render('还没有错题');
  useMath.getState().go('report');
  const report = render('等待第一次练习');
  assert.ok(report.includes('练一组一年级'));
  assert.ok(!report.includes('重做本年级错题'));
  useMath.getState().go('learn'); render('数学，自己想明白。');
  const { UnitLesson, UnitProgress } = await server.ssrLoadModule('/src/components/math/learning.tsx');
  const { LEARNING_UNITS } = await server.ssrLoadModule('/src/lib/math/units.ts');
  for (const unit of LEARNING_UNITS) {
    const html = renderToString(createElement(UnitLesson, { unit, onBack() {} }));
    assert.ok(html.includes(unit.title) && html.includes(unit.example), unit.id);
    assert.ok(html.includes('单元自测') && html.includes('下载原创练习单'));
    if (unit.lab) assert.ok(html.includes('动手理解小实验'));
  }
  useMath.getState().startUnit('u-clock', true); render('准备');
  let guard=30;
  while (useMath.getState().screen==='play' && guard-->0) {
    const state=useMath.getState();
    state.submit(state.session.questions[state.session.index].answer); state.advance();
  }
  render('这次记录已写入学情');
  useMath.getState().go('report'); render('知识单元学习记录');
  Object.assign(initial,useMath.getState());
  assert.ok(renderToString(createElement(UnitProgress)).includes('导出家长建议'));
  const { chaptersOfGrade } = await server.ssrLoadModule('/src/lib/math/chapters.ts');
  for (const grade of [1,2,4,5,6]) {
    useMath.getState().setGrade(grade); useMath.getState().go('map');
    const html=render('按知识点练');
    for (const chapter of chaptersOfGrade(grade)) assert.ok(html.includes(chapter.name), chapter.id);
    assert.equal((html.match(/class="unit-card"/g)??[]).length,chaptersOfGrade(grade).length);
  }
  const { Keypad } = await server.ssrLoadModule('/src/components/math/keypad.tsx');
  for (const [kind, value, enabled] of [['int', '', false], ['int', '0', true], ['dec', '0.5', true], ['remainder', '7余', false], ['remainder', '7余2', true]]) {
    const html = renderToString(createElement(Keypad, { kind, value, onChange() {}, onSubmit() {} }));
    const submit = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].find((m) => m[2].includes('确定'));
    assert.ok(submit);
    assert.equal(!submit[1].includes('disabled'), enabled, `${kind}: ${value}`);
  }
  // 互动课堂：目录页、每个演示在每个适用年级的课堂页，以及“动手模式”下的演示画面
  useMath.getState().setGrade(3); useMath.getState().go('class');
  const classHtml = render('互动课堂');
  for (const text of ['一年级', '六年级', '上册', '下册', '数学', '科学', '人教版（2024 新版）', '分数的初步认识', '导入学习资料', '课堂练习记录']) assert.ok(classHtml.includes(text), text);
  const { LessonView } = await server.ssrLoadModule('/src/components/lesson/classroom.tsx');
  const { DEMO_LIST, defaultParams } = await server.ssrLoadModule('/src/lib/lesson/demos.ts');
  const stages = await server.ssrLoadModule('/src/components/lesson/stages-math.tsx');
  const sci = await server.ssrLoadModule('/src/components/lesson/stages-science.tsx');
  const more = await server.ssrLoadModule('/src/components/lesson/stages-more.tsx');
  const lab = await server.ssrLoadModule('/src/components/lesson/stages-lab.tsx');
  const v10 = await server.ssrLoadModule('/src/components/lesson/stages-v10.tsx');
  const v12 = await server.ssrLoadModule('/src/components/lesson/stages-v12.tsx');
  let lessonCount = 0;
  for (const demo of DEMO_LIST) for (const grade of demo.grades) {
    const html = renderToString(createElement(LessonView, { demo: demo.id, grade, unitTitle: '测试单元', onBack() {} }));
    for (const text of [demo.title, '播放', '上一步', '下一步', '重新开始', '完整过程', '老师，再讲一遍', '换一种方法讲', '调节参数', '开始随堂练习']) assert.ok(html.includes(text), `${demo.id}@${grade}: ${text}`);
    assert.ok(!/>(Play|Pause|Reset|Next|Back)</.test(html), `${demo.id} 不应出现英文按钮`);
    if (demo.subject === 'science') for (const text of ['实验目的', '所需器材', '实验步骤', '观察结果', '结果解释', '想一想']) assert.ok(html.includes(text), `${demo.id}: ${text}`);
    lessonCount++;
  }
  const stageOf = { 'add-sub': stages.AddSubStage, 'group-share': stages.GroupShareStage, fraction: stages.FractionStage, 'perimeter-area': stages.PerimeterAreaStage, angle: stages.AngleStage, law: stages.LawStage, 'decimal-mul': stages.DecimalMulStage, balance: stages.BalanceStage, circle: stages.CircleStage, cylinder: stages.CylinderStage, magnet: sci.MagnetStage, shadow: sci.ShadowStage, circuit: sci.CircuitStage, pendulum: sci.PendulumStage, water: more.WaterStage, shapes: more.ShapesStage, rmb: more.RmbStage, ruler: more.RulerStage, clock: more.ClockStage, parallel: more.ParallelStage, chance: more.ChanceStage, 'number-line': more.NumberLineStage, percent: more.PercentStage, pigeonhole: more.PigeonholeStage, scale: more.ScaleStage, 'make-ten': v10.MakeTenStage, 'bar-chart': v10.BarChartStage, 'poly-area': v10.PolyAreaStage, 'decimal-div': v12.DecimalDivStage, 'fraction-mul': v12.FractionMulStage, lever: lab.LeverStage, slope: lab.SlopeStage, sound: lab.SoundStage, earth: lab.EarthStage, friction: lab.FrictionStage, plant: lab.PlantStage };
  for (const demo of DEMO_LIST) assert.ok(stageOf[demo.id], `缺少演示画面：${demo.id}`);
  for (const demo of DEMO_LIST) {
    const html = renderToString(createElement(stageOf[demo.id], { params: defaultParams(demo.id), scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
    assert.ok(html.includes('<svg') || html.includes('dec-row'), demo.id);
  }
  // 参数联动：半径改变后，画面里的周长和面积随之更新
  const c5 = renderToString(createElement(stages.CircleStage, { params: { r: 5, n: 8 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(c5.includes('31.4') && c5.includes('78.5'));
  const mt = renderToString(createElement(v10.MakeTenStage, { params: { a: 9, b: 4 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(mt.includes('10 + 3 = 13'), '凑十法画面');
  const bc = renderToString(createElement(v10.BarChartStage, { params: { c0: 8, c1: 5, c2: 10, c3: 3, unit: 0 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(bc.includes('相差 7 票') && bc.includes('共 26 人'), '条形统计图画面');
  const pa = renderToString(createElement(v10.PolyAreaStage, { params: { shape: 2, a: 8, b: 4, h: 5 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(pa.includes('(4 + 8) × 5 ÷ 2 = 30'), '梯形面积画面');
  const dd = renderToString(createElement(v12.DecimalDivStage, { params: { a: 72, b: 4 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(dd.includes('同时 ×10') && dd.includes('32 ÷ 4') && dd.includes('被除数加 0.1'), '小数除法画面');
  const dd2 = renderToString(createElement(v12.DecimalDivStage, { params: { a: 100, b: 30 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(dd2.includes('循环小数') && dd2.includes('3.33'), '小数除法循环小数');
  const fm = renderToString(createElement(v12.FractionMulStage, { params: { mode: 1, n1: 3, d1: 4, k: 3, n2: 2, d2: 3 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(fm.includes('3/4 × 2/3 = 1/2') && fm.includes('第一个分数取 2/4'), '分数乘法面积模型');
  const fm0 = renderToString(createElement(v12.FractionMulStage, { params: { mode: 0, n1: 2, d1: 9, k: 3, n2: 1, d2: 2 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(fm0.includes('= 2/3') && fm0.includes('3 个 2/9'), '分数乘整数画面');
  // v0.13：演示画面里的结果与参考实现（reference.ts，独立算法）一致——动画和公式同步
  const ref = await server.ssrLoadModule('/src/lib/lesson/reference.ts');
  const stage = (C, params) => renderToString(createElement(C, { params, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  let synced = 0;
  for (let a = 1; a <= 999; a += 37) for (let b = 1; b <= 99; b += 7) {
    const q = ref.rat(a, b), exact = ref.terminating(q);
    const html = stage(v12.DecimalDivStage, { a, b });
    assert.ok(html.includes(exact ?? ref.roundHalfUp(q, 2)), `小数除法画面 ${a}/${b}`);
    if (!exact) { const period = ref.expand(q).period; assert.ok(html.includes(period.length <= 6 ? `循环节是 ${period}` : `循环节有 ${period.length} 位`), `循环节 ${a}/${b}`); }
    synced++;
  }
  for (let d1 = 2; d1 <= 9; d1++) for (let n1 = 1; n1 < d1; n1++) for (const [mode, k, n2, d2] of [[0, 4, 1, 2], [1, 3, 2, 3], [1, 3, 5, 9]]) {
    const q = mode === 0 ? ref.mul(ref.rat(n1, d1), ref.rat(k)) : ref.mul(ref.rat(n1, d1), ref.rat(n2, d2));
    assert.ok(stage(v12.FractionMulStage, { mode, n1, d1, k, n2, d2 }).includes(ref.fracText(q)), `分数乘法画面 ${n1}/${d1}`);
    synced++;
  }
  for (let a = 5; a <= 9; a++) for (let b = 2; b <= 9; b++) { assert.ok(stage(v10.MakeTenStage, { a, b }).includes(`= ${a + b}`), `凑十法画面 ${a}+${b}`); synced++; }
  for (const shape of [0, 1, 2]) for (let a = 3; a <= 12; a += 3) for (let h = 2; h <= 7; h += 2) {
    const b = 2, twice = shape === 0 ? 2 * a * h : shape === 1 ? a * h : (a + b) * h;
    assert.ok(stage(v10.PolyAreaStage, { shape, a, b, h }).includes(`= ${ref.terminating(ref.rat(twice, 2))} cm²`), `多边形面积画面 ${shape} ${a} ${h}`); synced++;
  }
  assert.ok(stage(v10.BarChartStage, { c0: 4, c1: 4, c2: 4, c3: 4, unit: 0 }).includes('一样多'));
  assert.ok(stage(v12.DecimalDivStage, { a: 408, b: 40 }).includes('0 ÷ 4'), '商中间的 0');
  console.log(`Stage/formula sync: ${synced} parameter sets checked against the independent reference`);
  console.log(`Classroom: ${lessonCount} lesson pages and ${DEMO_LIST.length} interactive stages rendered`);
  console.log('Existing screens, 18 unit lessons, 3 lab types, unit completion/report and 5 input-state render checks passed (not browser interaction tests)');
} finally {
  await server.close();
}
