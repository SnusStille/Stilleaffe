import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPaceSeries } from '../lib/pace-chart';

const row = (entry_date: string, tb_sek: number) => ({ entry_date, tb_sek });

test('pace chart keeps missing weekdays unknown and breaks cumulative actuals there', () => {
  const series = buildPaceSeries('2026-10', [
    row('2026-10-01', 1_000),
    row('2026-10-03', 100), // A registered weekend is actual data, not a weekday coverage day.
    row('2026-10-05', 2_000),
  ], '2026-10-05');
  const byDate = new Map(series.points.map((point) => [point.date, point]));

  assert.equal(series.totalWorkdays, 22);
  assert.equal(series.registeredWorkdays, 2);
  assert.equal(series.missingWorkdays, 1);
  assert.equal(byDate.get('2026-10-02')?.status, 'missing');
  assert.equal(byDate.get('2026-10-02')?.cumulativeTb, null);
  assert.equal(byDate.get('2026-10-03')?.status, 'registered');
  assert.equal(byDate.get('2026-10-03')?.cumulativeTb, 1_100);
  assert.equal(byDate.get('2026-10-05')?.cumulativeTb, 3_100);
});

test('target pace advances on weekdays and stays flat over the weekend', () => {
  const series = buildPaceSeries('2026-10', [], '2026-10-01');
  const byDate = new Map(series.points.map((point) => [point.date, point]));
  const firstWorkdayPace = 80_000 / 22;

  const approximately = (actual: number | undefined, expected: number) => assert.ok(Math.abs((actual || 0) - expected) < 1e-7);
  approximately(byDate.get('2026-10-01')?.targetPace, firstWorkdayPace);
  approximately(byDate.get('2026-10-02')?.targetPace, firstWorkdayPace * 2);
  approximately(byDate.get('2026-10-03')?.targetPace, firstWorkdayPace * 2);
  approximately(byDate.get('2026-10-05')?.targetPace, firstWorkdayPace * 3);
});

test('future calendar days are not counted as missing and zero remains a real registration', () => {
  const series = buildPaceSeries('2026-10', [row('2026-10-01', 0)], '2026-10-01');
  const byDate = new Map(series.points.map((point) => [point.date, point]));

  assert.equal(byDate.get('2026-10-01')?.status, 'registered');
  assert.equal(byDate.get('2026-10-01')?.cumulativeTb, 0);
  assert.equal(byDate.get('2026-10-02')?.status, 'future');
  assert.equal(series.missingWorkdays, 0);
  assert.equal(series.registeredWorkdays, 1);
});
