import assert from 'node:assert/strict';
import test from 'node:test';
import type { Row } from '../lib/calc';
import { getMorningMetrics, morningFallbackAnalysis, renderMorningEmail } from '../lib/morning-report';

function row(entry_date: string, sales: number, tb_sek: number, note: string | null = null): Row {
  return { id: Number(entry_date.replaceAll('-', '')), entry_date, sales, tb_sek, hours: null, note, rating: null, mood: null, tags: [] };
}

test('actuals use registered rows only and never turn a missing date into zero', () => {
  const metrics = getMorningMetrics([
    row('2026-10-05', 5, 1_000),
    row('2026-10-06', 0, 0),
    row('2026-10-12', 4, 2_000),
    row('2026-10-13', 99, 99_000), // Future rows must not leak into the report.
  ], '2026-10-12');

  assert.equal(metrics.monthSales, 9);
  assert.equal(metrics.monthTb, 3_000);
  assert.equal(metrics.registeredDays, 3);
  assert.equal(metrics.todayRow?.sales, 4);
  assert.equal(metrics.completeness, 3 / 8);
  assert.equal(metrics.projection, null);
  const missingToday = getMorningMetrics([row('2026-10-05', 5, 1_000), row('2026-10-06', 0, 0)], '2026-10-12');
  assert.equal(missingToday.todayRow, null);
  assert.match(morningFallbackAnalysis(missingToday), /saknas; den behandlas inte som noll/i);
});

test('a registered zero counts as covered and the already-registered current day is not double-counted in pace', () => {
  const metrics = getMorningMetrics([
    row('2026-10-05', 5, 1_000),
    row('2026-10-06', 0, 0),
    row('2026-10-12', 4, 2_000),
  ], '2026-10-12');

  assert.equal(metrics.registeredDays, 3);
  assert.equal(metrics.remainingWorkdays, 15); // Includes today for calendar context.
  assert.equal(metrics.planWorkdaysRemaining, 14); // Today's registered result is already in month TB.
  assert.equal(metrics.avgTbPerSale, 3_000 / 9);
  assert.equal(metrics.avgTbPerSaleBasis, 'period');
  assert.equal(metrics.dailyTbNeed, (80_000 - 3_000) / 14);
});

test('projection is shown only after the minimum sample and 70% weekday coverage are met', () => {
  const enoughRows = [
    row('2026-10-01', 5, 1_000),
    row('2026-10-02', 5, 1_000),
    row('2026-10-05', 5, 1_000),
    row('2026-10-06', 5, 1_000),
    row('2026-10-07', 5, 1_000),
  ];
  const enough = getMorningMetrics(enoughRows, '2026-10-08');
  assert.equal(enough.registeredDays, 5);
  assert.equal(enough.elapsedWorkdays, 6);
  assert.equal(enough.projection, 22_000);

  const thin = getMorningMetrics(enoughRows.slice(0, 3), '2026-10-08');
  assert.equal(thin.projection, null);
});

test('historical TB-per-sale is clearly identified when the selected period has no sales', () => {
  const metrics = getMorningMetrics([
    row('2026-09-30', 10, 5_000),
    row('2026-10-05', 0, 0),
  ], '2026-10-05');
  assert.equal(metrics.monthSales, 0);
  assert.equal(metrics.avgTbPerSale, 500);
  assert.equal(metrics.avgTbPerSaleBasis, 'history');
});

test('email HTML escapes analysis content before rendering', () => {
  const metrics = getMorningMetrics([row('2026-10-05', 2, 1_000)], '2026-10-05');
  const html = renderMorningEmail(metrics, '<script>alert("x")</script>', 'ai').html;
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;script&gt;'));
});
