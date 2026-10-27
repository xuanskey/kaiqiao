import type { Usage } from './billing.ts';
export const MODEL = 'deepseek-flash';
export const MAX_TOKENS = 400;
export const TIMEOUT_MS = 20000;
export const THINKING = 'disabled';
export const MOCK_USAGE: Usage = { prompt: 120, completion: 60, cached: 20 };
/** B 期只有 mock 实现。即使误设为 0，也直接拒绝，绝不联网。 */
export async function upstream(mock = process.env.MOCK_DEEPSEEK ?? '1') {
  if (mock !== '1') throw new Error('real_upstream_disabled');
  return { text: '我们先看看课堂中的已知条件，再一步一步想。试着说说你已经知道了什么。', usage: { ...MOCK_USAGE } };
}
