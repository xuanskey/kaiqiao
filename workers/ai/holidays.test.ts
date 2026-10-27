import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCnHoliday } from './holidays.ts';
import { isPeak } from './billing.ts';

test('2026 全部 33 个放假日及调休上班日', () => {
  const ranges = [[1, 1, 3], [2, 15, 23], [4, 4, 6], [5, 1, 5], [6, 19, 21], [9, 25, 27], [10, 1, 7]];
  let count = 0;
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= new Date(Date.UTC(2026, month, 0)).getUTCDate(); day++) {
      const expected = ranges.some(([m, first, last]) => month === m && day >= first && day <= last);
      assert.equal(isCnHoliday(new Date(Date.UTC(2026, month - 1, day, 1))), expected, `${month}-${day}`);
      if (expected) count++;
    }
  }
  assert.equal(count, 33);
  for (const date of ['01-04', '02-14', '02-28', '05-09', '09-20', '10-10']) {
    assert.equal(isCnHoliday(new Date(`2026-${date}T01:00:00Z`)), false);
  }
});

test('北京时间跨日边界、假日工作日高峰及普通工作日', () => {
  assert.equal(isCnHoliday(new Date('2025-12-31T15:59:59Z')), false);
  assert.equal(isCnHoliday(new Date('2025-12-31T16:00:00Z')), true);
  assert.equal(isCnHoliday(new Date('2026-10-07T15:59:59Z')), true);
  assert.equal(isCnHoliday(new Date('2026-10-07T16:00:00Z')), false);
  for (const [stamp, expected] of [['2026-10-01T01:00:00Z', false], ['2026-10-27T01:00:00Z', true]] as const) {
    const date = new Date(stamp);
    assert.equal(isPeak(date, isCnHoliday(date)), expected);
  }
  assert.equal(isCnHoliday(new Date('invalid')), false);
});
