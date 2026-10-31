import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('Vercel Hobby cron entries are no more frequent than daily and cover Stockholm 07:00 DST offsets', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons: { path: string; schedule: string }[] };
  assert.equal(config.crons.length, 3);
  assert.deepEqual(config.crons.map((cron) => cron.schedule), ['0 5 * * *', '0 6 * * *', '0 7 * * *']);
  for (const cron of config.crons) {
    assert.equal(cron.path, '/api/cron/morning-briefing');
    assert.match(cron.schedule, /^0 \d{1,2} \* \* \*$/);
  }
});
