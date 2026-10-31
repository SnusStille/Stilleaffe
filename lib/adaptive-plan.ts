import type { Row } from './calc';

export type WorkdayTarget = { date: string; weekday: number; targetTb: number; relativeWeight: number };
export type AdaptivePlan = {
  basis: 'weekday-history' | 'even';
  historySampleDays: number;
  weekdaySamples: Record<number, number>;
  targets: WorkdayTarget[];
};

const weekdayOf = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return -1;
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.toISOString().slice(0, 10) === date ? value.getUTCDay() : -1;
};

/** Allocate a fixed TB gap over future weekdays, using only observed rows and a bounded personal weekday pattern. */
export function buildAdaptivePlan(gapTb: number, remainingDates: string[], historyRows: Pick<Row, 'entry_date' | 'tb_sek'>[]): AdaptivePlan {
  const gap = Math.max(0, Number.isFinite(gapTb) ? gapTb : 0);
  const dates = remainingDates.filter((date) => {
    const day = weekdayOf(date);
    return day > 0 && day < 6;
  }).sort();
  const rowsByWeekday = new Map<number, number[]>();
  for (const row of historyRows) {
    const day = weekdayOf(row.entry_date);
    const value = Number(row.tb_sek);
    if (day < 1 || day > 5 || !Number.isFinite(value) || value < 0) continue;
    const values = rowsByWeekday.get(day) || [];
    values.push(value);
    rowsByWeekday.set(day, values);
  }
  const weekdaySamples: Record<number, number> = {};
  for (let day = 1; day <= 5; day++) weekdaySamples[day] = rowsByWeekday.get(day)?.length || 0;
  const historySampleDays = Object.values(weekdaySamples).reduce((sum, count) => sum + count, 0);
  const historyTb = [...rowsByWeekday.values()].flat().reduce((sum, value) => sum + value, 0);
  const averageTb = historySampleDays ? historyTb / historySampleDays : 0;
  const neededWeekdays = [...new Set(dates.map(weekdayOf))];
  const reliable = dates.length > 0 && historySampleDays >= 20 && averageTb > 0
    && neededWeekdays.every((day) => (weekdaySamples[day] || 0) >= 3);
  const rawWeights = dates.map((date) => {
    if (!reliable) return 1;
    const day = weekdayOf(date);
    const values = rowsByWeekday.get(day)!;
    const weekdayAverage = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.min(1.25, Math.max(0.75, weekdayAverage / averageTb));
  });
  const weightTotal = rawWeights.reduce((sum, weight) => sum + weight, 0);
  const targets = dates.map((date, index) => ({
    date,
    weekday: weekdayOf(date),
    targetTb: weightTotal ? Math.round(gap * rawWeights[index] / weightTotal) : 0,
    relativeWeight: rawWeights[index],
  }));
  if (targets.length) {
    const delta = Math.round(gap) - targets.reduce((sum, day) => sum + day.targetTb, 0);
    targets[0].targetTb = Math.max(0, targets[0].targetTb + delta);
  }
  return { basis: reliable ? 'weekday-history' : 'even', historySampleDays, weekdaySamples, targets };
}
