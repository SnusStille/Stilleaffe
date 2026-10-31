export type StockholmParts = { date: string; hour: number; minute: number };

/** Convert an instant to the local wall clock used by the seller, across CET/CEST. */
export function stockholmParts(date = new Date()): StockholmParts {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function previousDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

/** Resolve the daily key and safe retry window for an hourly Vercel Cron invocation. */
export function resolveMorningSchedule(parts: StockholmParts, scheduledHour: number) {
  const rolloverRetryEnd = scheduledHour + 2 - 24;
  const retryingAfterMidnight = scheduledHour >= 22 && parts.hour <= rolloverRetryEnd;
  const reportDate = retryingAfterMidnight ? previousDate(parts.date) : parts.date;
  const hoursElapsed = retryingAfterMidnight ? 24 - scheduledHour + parts.hour : parts.hour - scheduledHour;
  return {
    reportDate,
    scheduledNow: !retryingAfterMidnight && parts.hour === scheduledHour,
    withinRetryWindow: hoursElapsed >= 0 && hoursElapsed <= 2,
    retryingAfterMidnight,
    hoursElapsed,
  };
}
