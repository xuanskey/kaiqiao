import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_LIST } from "./demos.ts";
import { initialQuiz, practiceFamily, reduceQuiz, type QuizState } from "./quiz-state.ts";
import { verifyPractice } from "./practice.ts";

const source = { demo: "decimal-div" as const, grade: 5 as const, nonce: 1 };
const start = () => initialQuiz(source, 2, 13217);
const submit = (state: QuizState, given = state.question.answer) => reduceQuiz(state, { type: "submit", questionId: state.question.id, given });

test("提交锁定同一个 PracticeQ，重复和空白提交不改变历史", () => {
  const initial = start();
  assert.equal(submit(initial, "  "), initial);
  const state = submit(initial);
  assert.equal(state.question, initial.question);
  assert.equal(state.result?.q, initial.question);
  assert.equal(state.result?.ok, true);
  assert.deepEqual(state.history, [true]);
  assert.equal(submit(state, "999"), state);
  assert.equal(reduceQuiz(state, { type: "draft", questionId: state.question.id, value: "999" }), state);
});

test("下一题使用待用难度，旧题事件不能写入新题", () => {
  const old = submit(start());
  const next = reduceQuiz(old, { type: "next", level: 3 });
  assert.equal(next.question.level, 3);
  assert.notEqual(next.question.id, old.question.id);
  assert.equal(next.result, null);
  assert.equal(next.draft, "");
  assert.deepEqual(next.history, [true]);
  for (const action of [
    { type: "submit" as const, questionId: old.question.id, given: old.question.answer },
    { type: "draft" as const, questionId: old.question.id, value: old.question.answer },
  ]) assert.equal(reduceQuiz(next, action), next);
  assert.equal(submit(next).result?.q, next.question);
  assert.equal(reduceQuiz(next, { type: "next", level: 1 }), next, "未提交不能误触下一题");
});

test("主动换题同时清除草稿/反馈，保留本次历史；切课才开始新会话", () => {
  const old = submit(start(), "999");
  const editing = reduceQuiz(reduceQuiz(old, { type: "next", level: 2 }), { type: "replace", source: { ...source, nonce: 2 }, level: 1 });
  const draft = reduceQuiz(editing, { type: "draft", questionId: editing.question.id, value: "123" });
  for (const state of [old, draft]) {
    const next = reduceQuiz(state, { type: "replace", source: { ...source, nonce: 3 }, level: 3 });
    assert.equal(next.question.level, 3);
    assert.equal(next.draft, "");
    assert.equal(next.result, null);
    assert.deepEqual(next.history, [false]);
  }
  const changed = reduceQuiz(old, { type: "replace", source: { demo: "fraction-mul", grade: 6, nonce: 1 }, level: 2 });
  assert.equal(changed.question.demo, "fraction-mul");
  assert.deepEqual(changed.history, []);
});

test("同类再练保留原题难度和教学分支；36 个演示所有难度的有界生成仍有效", () => {
  for (const demo of DEMO_LIST) for (const level of [1, 2, 3]) for (const seed of [7, 13217, 20261021]) {
    const old = submit(initialQuiz({ demo: demo.id, grade: demo.grades[0], nonce: 1 }, level, seed), "not-an-answer");
    const next = reduceQuiz(old, { type: "retry" });
    assert.equal(next.question.level, old.question.level);
    assert.equal(practiceFamily(next.question), practiceFamily(old.question));
    assert.notEqual(next.question.id, old.question.id);
    assert.deepEqual(verifyPractice(next.question), [], `${demo.id}@${level}`);
    assert.equal(next.result, null);
    assert.equal(next.draft, "");
    assert.deepEqual(next.history, [false]);
    if (demo.id === "decimal-div") assert.notEqual(next.question.prompt, old.question.prompt);
  }
});
