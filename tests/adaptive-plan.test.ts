import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAdaptivePlan } from '../lib/adaptive-plan';

function weekdayHistory(): { entry_date: string; tb_sek: number }[] {
  const rows: { entry_date: string; tb_sek: number }[] = [];
  const values = [5_000, 2_000, 4_000, 3_000, 6_000];
  const start = new Date('2026-09-01T12:00:00Z');
  for (let i = 0; rows.length < 25; i++) {
    const day = new Date(start); day.setUTCDate(start.getUTCDate() + i);
    const weekday = day.getUTCDay();
    if (weekday < 1 || weekday > 5) continue;
    rows.push({ entry_date: day.toISOString().slice(0, 10), tb_sek: values[weekday - 1] });
  }
  return rows;
}

test('sparse weekday history falls back to an even plan', () => {
  const plan = buildAdaptivePlan(9_000, ['2026-10-05', '2026-10-06', '2026-10-07'], [
    { entry_date: '2026-09-01', tb_sek: 9_000 },
  ]);
  assert.equal(plan.basis, 'even');
  assert.deepEqual(plan.targets.map((day) => day.targetTb), [3_000, 3_000, 3_000]);
});

test('reliable personal weekday patterns adapt targets but preserve the exact monthly gap', () => {
  const plan = buildAdaptivePlan(80_000, ['2026-10-05', '2026-10-06'], weekdayHistory());
  assert.equal(plan.basis, 'weekday-history');
  assert.ok(plan.targets[0].targetTb > plan.targets[1].targetTb);
  assert.equal(plan.targets.reduce((sum, day) => sum + day.targetTb, 0), 80_000);
  assert.equal(plan.targets[0].relativeWeight, 1.25);
  assert.equal(plan.targets[1].relativeWeight, 0.75);
});

test('unregistered dates are never inserted into the historical sample', () => {
  const history = weekdayHistory();
  const plan = buildAdaptivePlan(10_000, ['2026-10-05'], history);
  assert.equal(plan.historySampleDays, history.length);
  assert.equal(plan.weekdaySamples[1], history.filter((row) => new Date(`${row.entry_date}T12:00:00Z`).getUTCDay() === 1).length);
});
