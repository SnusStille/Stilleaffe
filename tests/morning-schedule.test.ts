import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMorningSchedule, stockholmParts } from '../lib/morning-schedule';

test('Stockholm wall clock follows CET and CEST without a hard-coded UTC offset', () => {
  assert.deepEqual(stockholmParts(new Date('2026-01-15T06:00:00.000Z')), { date: '2026-01-15', hour: 7, minute: 0 });
  assert.deepEqual(stockholmParts(new Date('2026-07-15T05:00:00.000Z')), { date: '2026-07-15', hour: 7, minute: 0 });
});

test('the selected whole hour is the only first-send hour and retries are bounded to two later hours', () => {
  const onTime = resolveMorningSchedule({ date: '2026-10-12', hour: 7, minute: 0 }, 7);
  assert.equal(onTime.scheduledNow, true);
  assert.equal(onTime.withinRetryWindow, true);
  assert.equal(onTime.reportDate, '2026-10-12');

  assert.equal(resolveMorningSchedule({ date: '2026-10-12', hour: 8, minute: 0 }, 7).withinRetryWindow, true);
  assert.equal(resolveMorningSchedule({ date: '2026-10-12', hour: 9, minute: 0 }, 7).withinRetryWindow, true);
  assert.equal(resolveMorningSchedule({ date: '2026-10-12', hour: 10, minute: 0 }, 7).withinRetryWindow, false);
  assert.equal(resolveMorningSchedule({ date: '2026-10-12', hour: 6, minute: 0 }, 7).scheduledNow, false);
});

test('late-evening schedules retry against the prior report date after midnight', () => {
  const at23 = resolveMorningSchedule({ date: '2026-10-12', hour: 23, minute: 0 }, 23);
  assert.equal(at23.scheduledNow, true);
  assert.equal(at23.reportDate, '2026-10-12');

  const afterMidnight = resolveMorningSchedule({ date: '2026-10-13', hour: 0, minute: 0 }, 23);
  assert.equal(afterMidnight.reportDate, '2026-10-12');
  assert.equal(afterMidnight.withinRetryWindow, true);
  assert.equal(afterMidnight.scheduledNow, false);

  const lastRetry = resolveMorningSchedule({ date: '2026-10-13', hour: 1, minute: 0 }, 23);
  assert.equal(lastRetry.reportDate, '2026-10-12');
  assert.equal(lastRetry.withinRetryWindow, true);
  assert.equal(resolveMorningSchedule({ date: '2026-10-13', hour: 2, minute: 0 }, 23).withinRetryWindow, false);

  const tenPm = resolveMorningSchedule({ date: '2026-10-13', hour: 0, minute: 0 }, 22);
  assert.equal(tenPm.reportDate, '2026-10-12');
  assert.equal(tenPm.withinRetryWindow, true);
});

test('the repeated autumn DST hour remains one Stockholm calendar date for idempotency', () => {
  const firstTwoAm = stockholmParts(new Date('2026-10-25T00:00:00.000Z'));
  const secondTwoAm = stockholmParts(new Date('2026-10-25T01:00:00.000Z'));
  assert.deepEqual(firstTwoAm, { date: '2026-10-25', hour: 2, minute: 0 });
  assert.deepEqual(secondTwoAm, { date: '2026-10-25', hour: 2, minute: 0 });
});
