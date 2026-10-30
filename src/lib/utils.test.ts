import test from 'node:test';
import assert from 'node:assert/strict';
import { cn } from './utils.ts';

const sorted = (s: string) => s.split(' ').sort().join(' ');

test('cn：同组类后写的覆盖先写的（与原 tailwind-merge 结果一致）', () => {
  assert.equal(sorted(cn('rounded-md text-sm font-medium', 'h-9 px-3 text-xs')), sorted('rounded-md font-medium h-9 px-3 text-xs'));
  assert.equal(sorted(cn('justify-center gap-2 text-sm', 'h-11 px-4', 'mt-5 w-full justify-between')), sorted('gap-2 text-sm h-11 px-4 mt-5 w-full justify-between'));
  assert.equal(sorted(cn('w-5 px-0 text-center text-sm text-muted-foreground', 'h-4 align-bottom text-xs text-lantern')), sorted('w-5 px-0 text-center h-4 align-bottom text-xs text-lantern'));
  assert.equal(cn('size-10', 'size-7'), 'size-7');
  assert.equal(sorted(cn('bg-primary hover:bg-primary/90', 'bg-card')), sorted('hover:bg-primary/90 bg-card'));
});
test('cn：字号和文字颜色不互相覆盖，条件类照常拼接', () => {
  assert.equal(sorted(cn('text-primary', 'text-xs')), sorted('text-primary text-xs'));
  assert.equal(cn('class-unit', false, undefined, 'has-demo'), 'class-unit has-demo');
  assert.equal(cn('a', 'a'), 'a');
});
