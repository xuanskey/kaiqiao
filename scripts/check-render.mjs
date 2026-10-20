import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

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
  useMath.getState().go('report'); render('备份与恢复');
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
  for (const text of ['一年级', '六年级', '上册', '下册', '数学', '科学', '人教版', '分数的初步认识']) assert.ok(classHtml.includes(text), text);
  const { LessonView } = await server.ssrLoadModule('/src/components/lesson/classroom.tsx');
  const { DEMO_LIST, defaultParams } = await server.ssrLoadModule('/src/lib/lesson/demos.ts');
  const stages = await server.ssrLoadModule('/src/components/lesson/stages-math.tsx');
  const sci = await server.ssrLoadModule('/src/components/lesson/stages-science.tsx');
  let lessonCount = 0;
  for (const demo of DEMO_LIST) for (const grade of demo.grades) {
    const html = renderToString(createElement(LessonView, { demo: demo.id, grade, unitTitle: '测试单元', onBack() {} }));
    for (const text of [demo.title, '播放', '上一步', '下一步', '重新开始', '完整过程', '老师，再讲一遍', '换一种方法讲', '调节参数', '开始随堂练习']) assert.ok(html.includes(text), `${demo.id}@${grade}: ${text}`);
    assert.ok(!/>(Play|Pause|Reset|Next|Back)</.test(html), `${demo.id} 不应出现英文按钮`);
    if (demo.subject === 'science') for (const text of ['实验目的', '所需器材', '实验步骤', '观察结果', '结果解释', '想一想']) assert.ok(html.includes(text), `${demo.id}: ${text}`);
    lessonCount++;
  }
  const stageOf = { 'add-sub': stages.AddSubStage, 'group-share': stages.GroupShareStage, fraction: stages.FractionStage, 'perimeter-area': stages.PerimeterAreaStage, angle: stages.AngleStage, law: stages.LawStage, 'decimal-mul': stages.DecimalMulStage, balance: stages.BalanceStage, circle: stages.CircleStage, cylinder: stages.CylinderStage, magnet: sci.MagnetStage, shadow: sci.ShadowStage, circuit: sci.CircuitStage, pendulum: sci.PendulumStage };
  for (const demo of DEMO_LIST) {
    const html = renderToString(createElement(stageOf[demo.id], { params: defaultParams(demo.id), scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
    assert.ok(html.includes('<svg') || html.includes('dec-row'), demo.id);
  }
  // 参数联动：半径改变后，画面里的周长和面积随之更新
  const c5 = renderToString(createElement(stages.CircleStage, { params: { r: 5, n: 8 }, scene: {}, interactive: true, setParam() {}, reduceMotion: true }));
  assert.ok(c5.includes('31.4') && c5.includes('78.5'));
  console.log(`Classroom: ${lessonCount} lesson pages and ${DEMO_LIST.length} interactive stages rendered`);
  console.log('Existing screens, 18 unit lessons, 3 lab types, unit completion/report and 5 input-state render checks passed (not browser interaction tests)');
} finally {
  await server.close();
}
