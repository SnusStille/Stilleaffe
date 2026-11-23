import { describe, expect, it } from 'vitest';
import {
  bestRegisteredStreak,
  buildInsights,
  buildTeamInsights,
  dayWinner,
  heatmapGrid,
  openWorkdays,
  simulateMonth,
  weekDuel,
  type Insight,
  type PlannerRow,
} from '@/lib/analysis';
import { isoWeekKey, workdaysBetween, type Entry, type Goals } from '@/lib/calc';

const GOALS: Goals = { daily_sales: 7, daily_tb: 3000, weekly_sales: 35, weekly_tb: 15000, monthly_sales: 140, monthly_tb: 60000 };
const WED = '2026-11-25'; // Wednesday

function entry(date: string, sales: number, u = 'stille', extra: Partial<Entry> = {}): Entry {
  return {
    id: Math.floor(Math.random() * 1e9),
    seller_username: u,
    entry_date: date,
    sales,
    tb_sek: sales * 400,
    hours: null,
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

/** Every workday from 2026-11-02 up to and including `to`, with `sales` each. */
function allWorkdays(to: string, sales: number, u = 'stille'): Entry[] {
  const out: Entry[] = [];
  for (let d = 2; d <= 30; d++) {
    const iso = `2026-11-${String(d).padStart(2, '0')}`;
    if (iso > to) break;
    if (workdaysBetween(iso, iso) === 1) out.push(entry(iso, sales, u));
  }
  return out;
}

const byId = (list: Insight[], id: string) => list.find((x) => x.id === id);

describe('buildInsights — evidence-gated rules', () => {
  it('says nothing without evidence', () => {
    expect(buildInsights([], GOALS, WED)).toEqual([]);
  });

  it('pace: a strong month projects above goal, a weak one spells out the required pace', () => {
    const strong = buildInsights(allWorkdays('2026-11-24', 10), GOALS, WED);
    const pace = byId(strong, 'pace')!;
    expect(pace.tone).toBe('good');
    expect(pace.title).toBe('Takten räcker – prognos 210 sälj'); // 21 workdays in November 2026 × 10
    expect(pace.body).toContain('150 % av månadsmålet');

    const weak = buildInsights(allWorkdays('2026-11-24', 5), GOALS, WED);
    const w = byId(weak, 'pace')!;
    expect(w.tone).toBe('warn');
    expect(w.title).toBe('Prognosen hamnar 35 sälj kort'); // 105 projected vs 140
    expect(w.body).toContain('13,8 sälj per återstående arbetsdag'); // (140 − 85 actual) / 4 open days (25, 26, 27, 30)
  });

  it('coverage: complete months are praised, gaps are flagged, never as zeros', () => {
    const complete = buildInsights(allWorkdays(WED, 8), GOALS, WED);
    expect(byId(complete, 'coverage')?.title).toBe('Alla arbetsdagar registrerade');

    const gap = allWorkdays(WED, 8).filter((e) => !['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'].includes(e.entry_date));
    const flagged = byId(buildInsights(gap, GOALS, WED), 'coverage')!;
    expect(flagged.tone).toBe('warn');
    expect(flagged.title).toBe('4 arbetsdagar saknar registrering');
    expect(flagged.body).toContain('räknas inte som noll');
  });

  it('weekday: the best weekday needs a 30 % edge and at least two samples per day', () => {
    const rows: Entry[] = [];
    const add = (monday: string, offs: number, sales: number) => {
      const d = new Date(monday + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + offs);
      rows.push(entry(d.toISOString().slice(0, 10), sales));
    };
    for (const monday of ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']) {
      [10, 10, 2, 2, 5].forEach((s, i) => add(monday, i, s));
    }
    const wd = byId(buildInsights(rows, GOALS, WED), 'weekday')!;
    expect(wd.title).toBe('Din bästa dag är måndag');
    expect(wd.body).toContain('onsdagar');

    // Only one sample per weekday → no claim.
    const thin = [entry('2026-11-02', 10), entry('2026-11-03', 10), entry('2026-11-04', 1)];
    expect(byId(buildInsights(thin, GOALS, WED), 'weekday')).toBeUndefined();
  });

  it('momentum after goal hits and streaks are reported with their evidence', () => {
    // Workday after a hit averages 9 (Nov 5→6, 6→9, 16→17); after a miss 7 (Nov 2→3, 11→12, 19→20). Gaps are skipped.
    const rows = ['2026-11-02:3', '2026-11-03:7', '2026-11-05:9', '2026-11-06:9', '2026-11-09:9', '2026-11-11:3', '2026-11-12:7', '2026-11-16:9', '2026-11-17:9', '2026-11-19:3', '2026-11-20:7']
      .map((x) => { const [d, v] = x.split(':'); return entry(d, Number(v)); });
    const mo = byId(buildInsights(rows, GOALS, WED), 'momentum')!;
    expect(mo.tone).toBe('good');
    expect(mo.title).toBe('29 % fler sälj efter en målträff');
    expect(mo.body).toContain('9 sälj');
    expect(mo.body).toContain('7 sälj');

    // Negative variant: alternating hit / soft day.
    const rows2 = allWorkdays('2026-11-20', 0).map((e, i) => ({ ...e, sales: i % 2 === 0 ? 8 : 3 }));
    expect(byId(buildInsights(rows2, GOALS, WED), 'momentum')?.title).toBe('Dagen efter en målträff dippar');
  });

  it('streak: counts consecutive registered workdays and nudges when today is still open', () => {
    const through = allWorkdays('2026-11-17', 4);
    expect(byId(buildInsights(through.slice(-2), GOALS, '2026-11-18'), 'streak')?.title).toBe('Idag saknar registrering');
    const s = byId(buildInsights([...through, entry('2026-11-18', 4)], GOALS, '2026-11-18'), 'streak')!;
    expect(s.title).toBe('13 arbetsdagar i rad med registrering'); // Nov 2–18
    expect(s.body).toBe('Det är ditt längsta svit hittills.');
  });

  it('product mix shift month over month (≥ 10 points, ≥ 3 split entries per month)', () => {
    const rows = [
      ...['2026-10-05', '2026-10-06', '2026-10-07'].map((d) => entry(d, 10, 'stille', { brandkollen_sales: 10, konsumentkollen_sales: 0 })),
      ...['2026-11-02', '2026-11-03', '2026-11-04'].map((d) => entry(d, 10, 'stille', { brandkollen_sales: 4, konsumentkollen_sales: 6 })),
    ];
    const mix = byId(buildInsights(rows, GOALS, WED), 'mix')!;
    expect(mix.title).toBe('Konsumentkollenandelen har gått upp 60 enheter');
    expect(mix.body).toContain('0 % → 60 %');
  });

  it('zero days and consistency use the last 30 days only', () => {
    const rows = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10'].map((d) => entry(d, 0));
    const list = buildInsights(rows, GOALS, WED);
    expect(byId(list, 'zero')?.title).toBe('7 av 7 registrerade dagar hade 0 sälj');

    const steady = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-12'].map((d) => entry(d, 7));
    expect(byId(buildInsights(steady, GOALS, WED), 'steady')?.title).toBe('Jämn och stabil försäljning');
  });

  it('is sorted by weight, descending', () => {
    const list = buildInsights(allWorkdays('2026-11-24', 5), GOALS, WED);
    const weights = list.map((x) => x.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
    expect(list.length).toBeGreaterThan(0);
  });
});

describe('buildTeamInsights', () => {
  const member = (u: string, role: 'seller' | 'manager', rows: Entry[]) => ({ username: u, display_name: u[0].toUpperCase() + u.slice(1), role, goals: GOALS, entries: rows });

  it('flags sellers without registrations and names the leader when the gap is clear', () => {
    const members = [
      member('stille', 'seller', allWorkdays('2026-11-24', 10)),
      member('kvist', 'seller', []),
      member('affe', 'manager', []),
    ];
    const list = buildTeamInsights(members, '2026-11', WED);
    const kvist = list.find((x) => x.id === 'team-coverage-kvist')!;
    expect(kvist.title).toBe('Kvist har inte registrerat än');
    expect(list.find((x) => x.id === 'team-gap')?.title).toBe('Stille leder med 170 sälj');
    expect(list.some((x) => x.id.includes('affe'))).toBe(false); // managers never appear
  });

  it('praises a fully registered team', () => {
    const members = [member('stille', 'seller', allWorkdays(WED, 6)), member('kvist', 'seller', allWorkdays(WED, 6, 'kvist'))];
    const list = buildTeamInsights(members, '2026-11', WED);
    expect(list.find((x) => x.id === 'team-coverage')?.tone).toBe('good');
  });
});

describe('weekDuel', () => {
  const member = (u: string, role: 'seller' | 'manager', rows: Entry[]) => ({ username: u, display_name: u[0].toUpperCase() + u.slice(1), role, goals: GOALS, entries: rows });

  it('needs two sellers', () => {
    expect(weekDuel([member('stille', 'seller', [entry('2026-11-23', 5)])], WED)).toBeNull();
  });

  it('totals this week, counts won days (ties and solo days do not count) and keeps eight weeks of history', () => {
    const members = [
      member('stille', 'seller', [entry('2026-11-23', 5), entry('2026-11-24', 7), entry('2026-11-25', 3), entry('2026-11-16', 9), entry('2026-11-17', 9)]),
      member('kvist', 'seller', [entry('2026-11-23', 5), entry('2026-11-24', 4), entry('2026-11-16', 20)]),
    ];
    const d = weekDuel(members, WED)!;
    expect(d.weekKey).toBe(isoWeekKey('2026-11-23'));
    expect(d.rangeLabel).toBe('23–29 nov');
    expect(d.sellers.map((s) => [s.display_name, s.week, s.days])).toEqual([['Stille', 15, 3], ['Kvist', 9, 2]]);
    expect(d.leader).toBe(0);
    expect(d.margin).toBe(6);
    expect(d.daysWon).toEqual([1, 0]); // Monday is a tie, Wednesday Kvist did not register
    expect(d.days.map((x) => x.future)).toEqual([false, false, false, true, true, true, true]);
    expect(d.days[0].values).toEqual([5, 5]);
    expect(d.days[3].values).toEqual([null, null]);
    expect(d.history).toHaveLength(8);
    expect(d.history[7]).toMatchObject({ key: isoWeekKey('2026-11-23'), current: true, winner: 0 });
    expect(d.history[6]).toMatchObject({ key: isoWeekKey('2026-11-16'), current: false, totals: [18, 20], winner: 1 });
  });

  it('reports a tie at the top instead of inventing a leader', () => {
    const members = [member('stille', 'seller', [entry('2026-11-23', 5)]), member('kvist', 'seller', [entry('2026-11-23', 5)])];
    const d = weekDuel(members, WED)!;
    expect(d.leader).toBeNull();
    expect(d.margin).toBe(0);
  });

  it('dayWinner: needs two registered sellers and a unique maximum', () => {
    expect(dayWinner({ date: '2026-11-23', label: 'Mån', future: false, values: [5, null] })).toBeNull();
    expect(dayWinner({ date: '2026-11-23', label: 'Mån', future: false, values: [5, 5] })).toBeNull();
    expect(dayWinner({ date: '2026-11-23', label: 'Mån', future: false, values: [5, 8] })).toBe(1);
  });
});

describe('simulateMonth — the planner', () => {
  const row = (over: Partial<PlannerRow> = {}): PlannerRow => ({ key: 'stille', label: 'Stille', sales: 100, tb: 40000, avgTbPerSale: 400, openWorkdays: 10, days: 20, ...over });

  it('projects sales and TB from the chosen pace', () => {
    const s = simulateMonth([row()], 5, 140, 56000);
    expect(s.sales).toBe(150);
    expect(s.tb).toBe(60000);
    expect(s.goalPct).toBe(107);
    expect(s.tbGoalPct).toBe(107);
    expect(s.requiredPerDay).toBe(4);
    expect(s.verdict).toBe('reached');
    expect(simulateMonth([row()], 3, 140, 56000).verdict).toBe('close'); // 130 = 93 %
    expect(simulateMonth([row()], 1, 140, 56000).verdict).toBe('short'); // 110 = 79 %
  });

  it('sums several sellers and falls back to the daily TB ratio when a seller has no sales yet', () => {
    const s = simulateMonth([row(), row({ key: 'kvist', label: 'Kvist', sales: 0, tb: 0, avgTbPerSale: null, days: 0 })], 4, 280, 112000, 7, 3500);
    expect(s.sales).toBe(100 + 40 + 40);
    expect(s.tb).toBe(40000 + 40 * 400 + 40 * 500);
    expect(s.openWorkdays).toBe(20);
    expect(s.requiredPerDay).toBe(9); // (280 − 100) / 20
  });

  it('has nothing to require when no workdays remain', () => {
    const s = simulateMonth([row({ openWorkdays: 0 })], 5, 140, 56000);
    expect(s.requiredPerDay).toBeNull();
    expect(s.sales).toBe(100);
    expect(s.verdict).toBe('short');
  });
});

describe('openWorkdays — recent workdays without a registration', () => {
  it('lists most recent first, excludes today and weekends, and stops at the lookback', () => {
    const rows = [entry('2026-11-24', 1), entry('2026-11-23', 1), entry('2026-11-18', 1), entry('2026-11-21', 1)];
    expect(openWorkdays(rows, WED, 7)).toEqual(['2026-11-20', '2026-11-19', '2026-11-17', '2026-11-16']);
    expect(openWorkdays(rows, WED, 4)).toEqual(['2026-11-20', '2026-11-19']);
    expect(openWorkdays(rows, WED, 2)).toEqual([]); // window = Nov 24–23, both registered
    expect(openWorkdays(allWorkdays(WED, 1), WED, 10)).toEqual([]);
  });
});

describe('heatmapGrid — goal-relative year map', () => {
  it('builds one column per week with future/weekend/missing/zero/level states', () => {
    const rows = [entry('2026-11-23', 3), entry('2026-11-24', 4), entry('2026-11-25', 7), entry('2026-11-20', 11), entry('2026-11-19', 0)];
    const g = heatmapGrid(rows, 7, 53, WED);
    expect(g.columns).toHaveLength(53);
    expect(g.columns[52].key).toBe(isoWeekKey('2026-11-23'));
    const cell = (date: string) => g.columns.flatMap((c) => c.cells).find((c) => c.date === date)!;
    expect(cell('2026-11-23').state).toBe('l1'); // 3 of 7 = 43 %
    expect(cell('2026-11-24').state).toBe('l2'); // 4 of 7 = 57 %
    expect(cell('2026-11-25').state).toBe('l3'); // 100 %
    expect(cell('2026-11-20').state).toBe('l4'); // 157 %
    expect(cell('2026-11-19').state).toBe('zero');
    expect(cell('2026-11-18').state).toBe('miss'); // workday, no registration
    expect(cell('2026-11-21').state).toBe('none'); // Saturday
    expect(cell('2026-11-26')).toMatchObject({ state: 'none', future: true });
    expect(g.registered).toBe(5);
    expect(g.hits).toBe(2);
    expect(g.activeDays).toBe(4);
    expect(g.total).toBe(25);
    expect(g.months.length).toBeGreaterThanOrEqual(12);
    expect(g.months.map((m) => m.label)).toContain('nov');
  });

  it('shorter grids still end on the current week', () => {
    const g = heatmapGrid([], 7, 16, WED);
    expect(g.columns).toHaveLength(16);
    expect(g.columns[15].cells[0].date).toBe('2026-11-23');
  });
});

describe('bestRegisteredStreak', () => {
  it('counts consecutive workdays, skipping weekends', () => {
    expect(bestRegisteredStreak(allWorkdays('2026-11-10', 1))).toBe(7); // Nov 2–10 = 7 workdays
    expect(bestRegisteredStreak([entry('2026-11-02', 1), entry('2026-11-04', 1)])).toBe(1);
  });
});
