import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  ACHIEVEMENTS,
  addDays,
  buildLeaderboard,
  buildMonthCsv,
  buildMonthStats,
  compareMonths,
  currentMonthKey,
  downloadText,
  isWorkday,
  monthBounds,
  monthOptions,
  personalRecord,
  productSplit,
  registeredStreak,
  teamStats,
  todayISO,
  trend,
  weekToDate,
  weeklySeries,
  weekTotalsAll,
  workdaysBetween,
  workdaysInMonth,
  type Entry,
  type Goals,
} from '@/lib/calc';

const GOALS: Goals = { daily_sales: 7, daily_tb: 3000, weekly_sales: 35, weekly_tb: 15000, monthly_sales: 140, monthly_tb: 60000 };

function entry(date: string, sales: number, extra: Partial<Entry> = {}): Entry {
  return {
    id: Math.floor(Math.random() * 1e9),
    seller_username: 'stille',
    entry_date: date,
    sales,
    tb_sek: sales * 400,
    hours: 8,
    note: null,
    rating: null,
    mood: null,
    tags: [],
    brandkollen_sales: null,
    konsumentkollen_sales: null,
    brandkollen_tb: null,
    konsumentkollen_tb: null,
    ...extra,
  };
}

/** Workdays of 2026-11 (Mon–Fri, Swedish holidays) from Nov 2 up to and including Nov 20. */
function novWorkdays(from = 2, to = 20): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d++) {
    const iso = `2026-11-${String(d).padStart(2, '0')}`;
    if (isWorkday(iso)) out.push(iso);
  }
  return out;
}

describe('dates & Swedish calendar', () => {
  it('uses Europe/Stockholm for "today"', () => {
    // 22:30 UTC on 1 July is already 00:30 on 2 July in Stockholm (CEST).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T22:30:00Z'));
    expect(todayISO()).toBe('2026-07-02');
    expect(currentMonthKey()).toBe('2026-07');
    vi.useRealTimers();
  });

  it('treats weekends and Swedish holidays as non-workdays', () => {
    expect(isWorkday('2026-11-07')).toBe(false); // Saturday
    expect(isWorkday('2026-11-08')).toBe(false); // Sunday
    expect(isWorkday('2026-11-09')).toBe(true); // Monday
    expect(isWorkday('2026-12-24')).toBe(false); // Christmas Eve
    expect(isWorkday('2026-06-19')).toBe(false); // Midsummer Eve 2026 (Friday)
    expect(isWorkday('2026-04-03')).toBe(false); // Good Friday 2026
    expect(isWorkday('2026-04-06')).toBe(false); // Easter Monday 2026
  });

  it('counts workdays inclusive on both ends', () => {
    expect(workdaysBetween('2026-11-02', '2026-11-06')).toBe(5); // Mon–Fri
    expect(workdaysBetween('2026-11-06', '2026-11-02')).toBe(0);
    expect(workdaysInMonth('2026-11')).toBe(21);
    expect(monthBounds('2026-11')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('lists months up to the current month, oldest first, without gaps to the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
    const opts = monthOptions([{ entry_date: '2026-08-03' }, { entry_date: '2026-10-01' }, { entry_date: '2027-01-01' }]);
    expect(opts).toEqual(['2026-08', '2026-10', '2026-11']);
    vi.useRealTimers();
  });
});

describe('month stats — missing days are never zero, registered zero days are real zeros', () => {
  const TODAY = '2026-11-20';
  const days = novWorkdays(); // 15 workdays Nov 2–20
  const full = days.map((d, i) => entry(d, i % 5 === 0 ? 0 : 10)); // 3 registered zero days, 12 days × 10

  it('counts registered workdays and elapsed workdays', () => {
    const s = buildMonthStats('stille', 'Stille', full, GOALS, '2026-11', TODAY);
    expect(s.registeredWorkdays).toBe(15);
    expect(s.elapsedWorkdays).toBe(15);
    expect(s.coverageRatio).toBe(1);
    expect(s.paceReliable).toBe(true);
  });

  it('a registered zero day lowers the average (it is a real zero)', () => {
    const s = buildMonthStats('stille', 'Stille', full, GOALS, '2026-11', TODAY);
    expect(s.sales).toBe(120);
    expect(s.days).toBe(15);
    expect(s.avgPerWorkday).toBeCloseTo(8, 5); // 120 / 15 — zero days included
  });

  it('a missing day is excluded from the average instead of counting as zero', () => {
    const partial = full.filter((e) => e.entry_date !== '2026-11-02'); // 2 Nov (a zero day) never registered
    const s = buildMonthStats('stille', 'Stille', partial, GOALS, '2026-11', TODAY);
    expect(s.registeredWorkdays).toBe(14);
    expect(s.elapsedWorkdays).toBe(15);
    expect(s.avgPerWorkday).toBeCloseTo(120 / 14, 5);
    expect(s.projection).toBeCloseTo((120 / 14) * workdaysInMonth('2026-11'), 5);
  });

  it('does not project on thin coverage', () => {
    const thin = full.slice(0, 2); // 2 of 15 elapsed workdays
    const s = buildMonthStats('stille', 'Stille', thin, GOALS, '2026-11', TODAY);
    expect(s.paceReliable).toBe(false);
    expect(s.projection).toBeNull();
    expect(s.projectionReason).toMatch(/tunt/i);
  });

  it('requires at least 5 registered workdays for a projection', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z')); // 4 elapsed workdays
    const four = novWorkdays(2, 5).map((d) => entry(d, 10));
    const s = buildMonthStats('stille', 'Stille', four, GOALS, '2026-11', '2026-11-05');
    expect(s.paceReliable).toBe(true);
    expect(s.registeredWorkdays).toBe(4);
    expect(s.projection).toBeNull();
    expect(s.projectionReason).toMatch(/5/);
    vi.useRealTimers();
  });

  it('final months show the final result as projection; future months none', () => {
    const oct = buildMonthStats('stille', 'Stille', [entry('2026-10-01', 10), entry('2026-10-02', 5)], GOALS, '2026-10', TODAY);
    expect(oct.isFinal).toBe(true);
    expect(oct.projection).toBe(15);
    const dec = buildMonthStats('stille', 'Stille', [], GOALS, '2026-12', TODAY);
    expect(dec.projection).toBeNull();
    expect(dec.elapsedWorkdays).toBe(0);
  });

  it('remaining workdays include today; required pace excludes a registered today', () => {
    const s = buildMonthStats('stille', 'Stille', full, GOALS, '2026-11', TODAY);
    expect(s.remainingWorkdays).toBe(workdaysBetween(TODAY, '2026-11-30')); // 20, 23–27, 30 = 7
    // 20 Nov is already registered → open days = 6 → 20 remaining sales / 6
    expect(s.goalGap).toBe(20);
    expect(s.requiredPerRemaining).toBeCloseTo(20 / 6, 5);
    const withoutToday = buildMonthStats('stille', 'Stille', full.filter((e) => e.entry_date !== TODAY), GOALS, '2026-11', TODAY);
    expect(withoutToday.requiredPerRemaining).toBeCloseTo(30 / 7, 5); // today still open
  });

  it('goal attainment, TB goal and ahead-of-plan', () => {
    const s = buildMonthStats('stille', 'Stille', full, GOALS, '2026-11', TODAY);
    expect(s.goalPct).toBe(86);
    expect(s.tbGoalPct).toBe(80);
    expect(s.aheadOfPlan).toBeCloseTo(120 - 140 * (15 / 21), 5);
  });
});

describe('leaderboard & team — only sellers are ranked', () => {
  const TODAY = '2026-11-20';
  const members = [
    { username: 'stille', display_name: 'Stille', role: 'seller', goals: GOALS, entries: [entry('2026-11-02', 12), entry('2026-11-03', 8)] },
    { username: 'kvist', display_name: 'Kvist', role: 'seller', goals: GOALS, entries: [entry('2026-11-02', 15), entry('2026-11-03', 10), entry('2026-11-04', 5)] },
    { username: 'affe', display_name: 'Affe', role: 'manager', goals: GOALS, entries: [entry('2026-11-02', 99)] },
    { username: 'fredland', display_name: 'Fredland', role: 'manager', goals: GOALS, entries: [] },
  ];

  it('ranks sellers by sales, then TB', () => {
    const rows = buildLeaderboard(members, '2026-11', TODAY);
    expect(rows.map((r) => r.username)).toEqual(['kvist', 'stille']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
    expect(rows.some((r) => r.username === 'affe' || r.username === 'fredland')).toBe(false);
  });

  it('team totals ignore managers and sum only sellers, rows ranked by sales', () => {
    const t = teamStats(members, '2026-11', TODAY);
    expect(t.rows.map((r) => r.username)).toEqual(['kvist', 'stille']);
    expect(t.sales).toBe(50);
    expect(t.leader?.username).toBe('kvist');
    expect(t.goal).toBe(280);
    expect(t.goalPct).toBe(18);
    expect(t.rows).toHaveLength(2);
  });

  it('ties are flagged', () => {
    const tie = [
      { username: 'a', display_name: 'A', role: 'seller', goals: GOALS, entries: [entry('2026-11-02', 10, { tb_sek: 100 })] },
      { username: 'b', display_name: 'B', role: 'seller', goals: GOALS, entries: [entry('2026-11-02', 10, { tb_sek: 100 })] },
    ];
    const rows = buildLeaderboard(tie, '2026-11', TODAY);
    expect(rows[1].tied).toBe(true);
    expect(rows[0].tied).toBe(false);
  });
});

describe('compareMonths — same elapsed calendar window', () => {
  const TODAY = '2026-11-15';
  const entries = [
    entry('2026-09-02', 20), entry('2026-09-30', 20),
    entry('2026-10-01', 10), entry('2026-10-02', 10), entry('2026-10-15', 10), entry('2026-10-31', 1000),
    entry('2026-11-03', 5), entry('2026-11-10', 5),
  ];
  it('compares Nov 1–15 against Oct 1–15 only', () => {
    const c = compareMonths(entries, '2026-11', TODAY)!;
    expect(c.samePeriod).toBe(true);
    expect(c.previous.sales).toBe(30);
    expect(c.current.sales).toBe(10);
    expect(c.salesDiff).toBe(-20);
    expect(c.salesPct).toBe(-67);
  });
  it('final months compare whole months', () => {
    const c = compareMonths(entries, '2026-10', TODAY)!;
    expect(c.samePeriod).toBe(false);
    expect(c.current.sales).toBe(1030);
  });
  it('returns null without previous data', () => {
    expect(compareMonths([entry('2026-11-03', 5)], '2026-11', TODAY)).toBeNull();
  });
});

describe('product split — legacy rows stay "Ej uppdelat"', () => {
  it('never assigns legacy rows to a product', () => {
    const s = productSplit([entry('2026-11-02', 10), entry('2026-11-03', 4)]);
    expect(s).toMatchObject({ brandSales: 0, konsSales: 0, unsplitSales: 14, splitEntries: 0, totalEntries: 2 });
  });
  it('sums explicit splits and leaves the remainder unsplit', () => {
    const s = productSplit([
      entry('2026-11-02', 10, { brandkollen_sales: 6, konsumentkollen_sales: 3, brandkollen_tb: 100, konsumentkollen_tb: 50 }),
      entry('2026-11-03', 4, { brandkollen_sales: 0, konsumentkollen_sales: 0 }),
    ]);
    expect(s.brandSales).toBe(6);
    expect(s.konsSales).toBe(3);
    expect(s.unsplitSales).toBe(5); // 1 remainder + 4 explicit zeros
    expect(s.splitEntries).toBe(2);
    expect(s.brandTb).toBe(100);
  });
});

describe('trends, streaks, records', () => {
  it('7-day trend needs registered days in both windows', () => {
    expect(trend([entry('2026-11-19', 5)], 7, '2026-11-20').pct).toBeNull();
    const both = [
      entry('2026-11-10', 10), entry('2026-11-11', 10), entry('2026-11-12', 10),
      entry('2026-11-17', 20), entry('2026-11-18', 20), entry('2026-11-19', 20),
    ];
    const t = trend(both, 7, '2026-11-20');
    expect(t.previous).toBe(30);
    expect(t.current).toBe(60);
    expect(t.pct).toBe(100);
  });

  it('registered streak counts consecutive calendar days with a registration, ending today or yesterday', () => {
    const e = [entry('2026-11-17', 1), entry('2026-11-18', 1), entry('2026-11-19', 0)];
    expect(registeredStreak(e, '2026-11-20')).toBe(3);
    expect(registeredStreak(e, '2026-11-21')).toBe(0);
    expect(registeredStreak([], '2026-11-20')).toBe(0);
  });

  it('personal record is the single best day', () => {
    expect(personalRecord([entry('2026-11-02', 3), entry('2026-11-03', 9), entry('2026-11-04', 4)])?.sales).toBe(9);
    expect(personalRecord([])).toBeNull();
  });

  it('weekly series returns the requested number of weeks ending with the current one', () => {
    const w = weeklySeries([entry('2026-11-17', 5), entry('2026-11-10', 7)], 4, '2026-11-20');
    expect(w).toHaveLength(4);
    expect(w[3].sales).toBe(5);
    expect(w[2].sales).toBe(7);
    expect(w[0].sales).toBe(0);
  });
});

describe('CSV export', () => {
  it('produces BOM + semicolon-separated Swedish CSV with one row per registration', () => {
    const members = [
      { username: 'stille', display_name: 'Stille', role: 'seller', goals: GOALS, entries: [entry('2026-11-02', 10, { brandkollen_sales: 4, konsumentkollen_sales: 6, note: 'bra; dag "citat"' })] },
      { username: 'affe', display_name: 'Affe', role: 'manager', goals: GOALS, entries: [entry('2026-11-02', 1)] },
    ];
    const csv = buildMonthCsv('2026-11', members);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('datum;säljare;sälj;tb_sek;brandkollen_sälj;konsumentkollen_sälj;brandkollen_tb;konsumentkollen_tb;timmar;anteckning');
    expect(csv).toContain('2026-11-02;Stille;10;4000;4;6;;');
    expect(csv).toContain('"bra; dag ""citat"""');
    expect(csv).not.toContain(';Affe;'); // managers are not sellers
  });

  it('downloadText triggers a client download', () => {
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor), body: { appendChild: vi.fn() } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    downloadText('x.csv', 'a;b');
    expect(anchor.download).toBe('x.csv');
    expect(anchor.href).toBe('blob:x');
    expect(anchor.click).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('weekToDate — WoW on the same weekday window', () => {
  it('compares Mon→today against Mon→same weekday last week, registered days only', () => {
    // Today = Friday 2026-11-20. This week Mon–Fri: 10+10+10 (3 registered days). Last week Mon–Fri: 5+5+5+5 (4 days).
    const e = [
      entry('2026-11-16', 10), entry('2026-11-17', 10), entry('2026-11-18', 10),
      entry('2026-11-09', 5), entry('2026-11-10', 5), entry('2026-11-11', 5), entry('2026-11-12', 5), entry('2026-11-13', 999), // 13 Nov (Fri) is included, 14/15 (weekend) irrelevant
    ];
    const w = weekToDate(e, '2026-11-20');
    expect(w.sales).toBe(30);
    expect(w.previousSales).toBe(1019); // 5+5+5+5+999 → Fri included in both windows
    expect(w.days).toBe(3);
    expect(w.previousDays).toBe(5);
    expect(w.pct).toBe(Math.round(((30 - 1019) / 1019) * 100));
  });
  it('returns null with thin data', () => {
    expect(weekToDate([entry('2026-11-18', 10)], '2026-11-20').pct).toBeNull();
    expect(weekToDate([], '2026-11-20').pct).toBeNull();
  });
});

describe('achievements (new v1.2 set)', () => {
  const G: Goals = { ...GOALS };
  const week = (monday: string, values: number[]) => values.map((v, i) => entry(addDays(monday, i), v));
  it('weekTotalsAll groups per Monday with sales and day counts', () => {
    const rows = [...week('2026-11-16', [5, 5, 5, 5, 5]), entry('2026-11-23', 2)];
    const totals = weekTotalsAll(rows);
    expect(totals).toHaveLength(2);
    expect(totals[0]).toEqual({ key: '2026-11-16', sales: 25, days: 5 });
    expect(totals[1].sales).toBe(2);
  });
  it('week_goal needs ≥3 registered days and weekly sales ≥ goal', () => {
    const by = (k: string) => ACHIEVEMENTS.find((a) => a.key === k)!;
    // 40 sales on a single day in one week → weekly sum is enough but only 1 day → not unlocked.
    expect(by('week_goal').cond([entry('2026-11-16', 40)], G)).toBe(false);
    expect(by('week_goal').cond(week('2026-11-16', [12, 12, 12]), G)).toBe(true);
    expect(by('week_goal').cond(week('2026-11-16', [10, 10, 10]), G)).toBe(false);
  });
  it('perfect_week needs five consecutive goal days; totals badges count lifetime sales', () => {
    const by = (k: string) => ACHIEVEMENTS.find((a) => a.key === k)!;
    expect(by('perfect_week').cond(week('2026-11-16', [7, 7, 7, 7, 7]), G)).toBe(true);
    expect(by('perfect_week').cond(week('2026-11-16', [7, 7, 7, 7, 6]), G)).toBe(false);
    expect(by('sales_100').cond(week('2026-11-16', [20, 20, 20, 20, 20]), G)).toBe(true);
    expect(by('sales_100').cond(week('2026-11-16', [19, 20, 20, 20, 20]), G)).toBe(false);
    expect(by('sales_500').cond(week('2026-11-16', [100, 100, 100, 100, 100]), G)).toBe(true);
    expect(by('entries_25').cond(Array.from({ length: 25 }, (_, i) => entry(addDays('2026-10-01', i), 1)), G)).toBe(true);
  });
  it('every achievement key is unique', () => {
    const keys = ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
