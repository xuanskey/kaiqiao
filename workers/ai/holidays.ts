// 国办发明电〔2025〕7号：仅收录放假日，不收录调休上班日。
// https://www.wuhan.gov.cn/zwgk/tzgg/202511/t20251105_2672471.shtml
// 当前日历覆盖 2026；其他年份需随国务院通知维护。
const ranges = [
  ['2026-01-01', '2026-01-03'], ['2026-02-15', '2026-02-23'],
  ['2026-04-04', '2026-04-06'], ['2026-05-01', '2026-05-05'],
  ['2026-06-19', '2026-06-21'], ['2026-09-25', '2026-09-27'],
  ['2026-10-01', '2026-10-07'],
];
export function isCnHoliday(date: Date): boolean {
  const beijing = new Date(date.getTime() + 8 * 3600000);
  if (!Number.isFinite(beijing.getTime())) return false;
  const day = beijing.toISOString().slice(0, 10);
  return ranges.some(([start, end]) => day >= start && day <= end);
}
