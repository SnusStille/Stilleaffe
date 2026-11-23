import type { Entry, Goals, Mood, PublicEntry } from './types';

/* ------------------------------------------------------------------ *
 * Brand & shared constants
 * ------------------------------------------------------------------ */
export const BRAND = {
  name: 'Label Lab',
  tagline: 'Sales Performance',
  company: 'Label Lab',
  partner: 'ViPo Säkerhetstjänster',
} as const;

export const DEFAULT_GOALS: Goals = {
  daily_sales: 7,
  daily_tb: 3000,
  weekly_sales: 35,
  weekly_tb: 15000,
  monthly_sales: 140,
  monthly_tb: 60000,
};

export const MOOD_EMOJI: Record<string, string> = {
  fire: '🔥',
  great: '😄',
  ok: '🙂',
  tired: '😴',
  bad: '😩',
};

export const MOOD_LABEL: Record<string, string> = {
  fire: 'På topp',
  great: 'Bra',
  ok: 'Okej',
  tired: 'Trött',
  bad: 'Dålig',
};

export const PRODUCT_LABEL: Record<string, string> = {
  brandkollen: 'Brandkollen',
  konsumentkollen: 'Konsumentkollen',
  unsplit: 'Ej uppdelat',
};

/* ------------------------------------------------------------------ *
 * Date helpers — all date math is UTC-noon based so DST never shifts a day.
 * ------------------------------------------------------------------ */
const STOCKHOLM = 'Europe/Stockholm';

export function todayISO(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function isoOf(d: Date): string {
  return (
    d.getUTCFullYear() +
    '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getUTCDate()).padStart(2, '0')
  );
}

/** Parse YYYY-MM-DD at UTC noon (avoids DST off-by-one). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoOf(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

export const monthOf = (iso: string) => iso.slice(0, 7);
export const yearOf = (iso: string) => iso.slice(0, 4);

export function monthBounds(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const start = `${monthKey}-01`;
  const last = new Date(Date.UTC(y, m, 0, 12));
  return { start, end: isoOf(last) };
}

export function monthLabel(monthKey: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 15, 12));
  return d.toLocaleDateString('sv-SE', { month: style, year: 'numeric', timeZone: 'UTC' });
}

export function monthShort(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15, 12)).toLocaleDateString('sv-SE', {
    month: 'short',
    timeZone: 'UTC',
  });
}

export function currentMonthKey(): string {
  return monthOf(todayISO());
}

export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
}

/** All month keys from the first entry up to the current month, oldest first. */
export function monthOptions(entries: { entry_date: string }[], upTo = currentMonthKey()): string[] {
  const set = new Set<string>([upTo]);
  for (const e of entries) {
    const k = monthOf(e.entry_date);
    if (k <= upTo) set.add(k);
  }
  return [...set].sort();
}

/* ------------------------------------------------------------------ *
 * Swedish calendar
 * ------------------------------------------------------------------ */
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const holidayCache = new Map<number, Set<string>>();

/**
 * Non-selling days in the Swedish calendar. Official holidays plus the eves
 * that are de facto closed in Swedish offices (Christmas Eve, New Year's Eve
 * and Midsummer Eve).
 */
export function holidaysFor(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const set = new Set<string>();
  const add = (m: number, d: number) => set.add(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  add(1, 1); // nyårsdagen
  add(1, 6); // trettondedag jul
  add(5, 1); // första maj
  add(6, 6); // nationaldagen
  add(12, 24); // julafton
  add(12, 25); // juldagen
  add(12, 26); // annandag jul
  add(12, 31); // nyårsafton

  const easter = easterSunday(year);
  const easterIso = `${year}-${String(easter.month).padStart(2, '0')}-${String(easter.day).padStart(2, '0')}`;
  set.add(addDays(easterIso, -2)); // långfredagen
  set.add(easterIso); // påskdagen
  set.add(addDays(easterIso, 1)); // annandag påsk
  set.add(addDays(easterIso, 39)); // kristi himmelsfärd

  // Midsommarafton: fredagen mellan 19 och 25 juni.
  for (let d = 19; d <= 25; d++) {
    const date = new Date(Date.UTC(year, 5, d, 12));
    if (date.getUTCDay() === 5) {
      add(6, d);
      break;
    }
  }

  holidayCache.set(year, set);
  return set;
}

export function isWorkday(iso: string): boolean {
  const date = parseISO(iso);
  const wd = date.getUTCDay();
  if (wd === 0 || wd === 6) return false;
  return !holidaysFor(date.getUTCFullYear()).has(iso);
}

export function workdaysBetween(from: string, to: string): number {
  if (from > to) return 0;
  let count = 0;
  const d = parseISO(from);
  const end = parseISO(to);
  while (d <= end) {
    if (isWorkday(isoOf(d))) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

export function workdaysInMonth(monthKey: string): number {
  const { start, end } = monthBounds(monthKey);
  return workdaysBetween(start, end);
}

export function elapsedWorkdays(today = todayISO()): number {
  const { start } = monthBounds(monthOf(today));
  return workdaysBetween(start, today);
}

export function remainingWorkdays(today = todayISO()): number {
  const { end } = monthBounds(monthOf(today));
  return workdaysBetween(today, end);
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */
export const fmt = (n: number) => Math.round(n).toLocaleString('sv-SE');
export const fmtMoney = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';
export const fmtKronor = (n: number) => Math.round(n).toLocaleString('sv-SE');
export const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('sv-SE');
export const f2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString('sv-SE');
export const pct = (a: number, b: number) => (b > 0 ? Math.min(999, Math.round((a / b) * 100)) : 0);
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const sum = <T>(a: T[], k: keyof T) => a.reduce((s, r) => s + Number(r[k] || 0), 0);

export function signed(n: number, decimals = 0): string {
  const v = decimals ? f2(n) : String(Math.round(n));
  return n > 0 ? `+${v}` : v;
}

/* ------------------------------------------------------------------ *
 * Weeks
 * ------------------------------------------------------------------ */
export function isoWeekKey(iso: string): string {
  const date = parseISO(iso);
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function weekMonday(iso: string): string {
  const date = parseISO(iso);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return isoOf(date);
}

export type WeekPoint = { key: string; label: string; sales: number; tb: number; days: number };

export function weeklySeries(entries: { entry_date: string; sales: number; tb_sek: number }[], count = 8, today = todayISO()): WeekPoint[] {
  const monday = weekMonday(today);
  const weeks: WeekPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = addDays(monday, -7 * i);
    const key = isoWeekKey(start);
    const inWeek = entries.filter((e) => {
      const d = e.entry_date;
      return d >= start && d <= addDays(start, 6) && d <= today;
    });
    weeks.push({
      key,
      label: key.slice(5),
      sales: inWeek.reduce((s, e) => s + Number(e.sales || 0), 0),
      tb: inWeek.reduce((s, e) => s + Number(e.tb_sek || 0), 0),
      days: inWeek.length,
    });
  }
  return weeks;
}

export type WeekToDate = { sales: number; previousSales: number; pct: number | null; days: number; previousDays: number };

/**
 * Week-over-week: Monday→today this week against Monday→same weekday last week.
 * Only registered days count; null when either window has fewer than 2 registered days.
 */
export function weekToDate(entries: Entry[], today = todayISO()): WeekToDate {
  const monday = weekMonday(today);
  const lastMonday = addDays(monday, -7);
  const span = diffDays(monday, today);
  const cur = entries.filter((e) => e.entry_date >= monday && e.entry_date <= today);
  const prev = entries.filter((e) => e.entry_date >= lastMonday && e.entry_date <= addDays(lastMonday, span));
  const sales = cur.reduce((s, e) => s + Number(e.sales || 0), 0);
  const previousSales = prev.reduce((s, e) => s + Number(e.sales || 0), 0);
  const ok = cur.length >= 2 && prev.length >= 2 && previousSales > 0;
  return { sales, previousSales, pct: ok ? Math.round(((sales - previousSales) / previousSales) * 100) : null, days: cur.length, previousDays: prev.length };
}

export function bestWeek(entries: Entry[]): WeekPoint | null {
  const map = new Map<string, WeekPoint>();
  for (const e of entries) {
    const key = isoWeekKey(e.entry_date);
    const cur = map.get(key) || { key, label: key.slice(5), sales: 0, tb: 0, days: 0 };
    cur.sales += Number(e.sales || 0);
    cur.tb += Number(e.tb_sek || 0);
    cur.days += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.sales - a.sales)[0] || null;
}

/* ------------------------------------------------------------------ *
 * Streaks
 * ------------------------------------------------------------------ */
function previousWorkday(iso: string): string {
  let d = addDays(iso, -1);
  for (let i = 0; i < 10; i++) {
    if (isWorkday(d)) return d;
    d = addDays(d, -1);
  }
  return d;
}

export function registeredStreak(entries: Entry[], today = todayISO()): number {
  const set = new Set(entries.map((e) => e.entry_date));
  let cursor = set.has(today) ? today : previousWorkday(today);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    if (set.has(cursor)) n++;
    else break;
    cursor = previousWorkday(cursor);
  }
  return n;
}

export function goalStreak(entries: Entry[], goals: Goals, today = todayISO()): number {
  const byDate = new Map(entries.map((e) => [e.entry_date, Number(e.sales || 0)]));
  const target = Number(goals.daily_sales || 0);
  let cursor = byDate.has(today) ? today : previousWorkday(today);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    if (target > 0 && (byDate.get(cursor) || 0) >= target) n++;
    else break;
    cursor = previousWorkday(cursor);
  }
  return n;
}

export function bestGoalStreak(entries: Entry[], goals: Goals): number {
  const byDate = new Map(entries.map((e) => [e.entry_date, Number(e.sales || 0)]));
  const target = Number(goals.daily_sales || 0);
  if (target <= 0) return 0;
  let best = 0;
  for (const key of byDate.keys()) {
    let n = 0;
    let cursor = key;
    while ((byDate.get(cursor) || 0) >= target) {
      n++;
      cursor = previousWorkday(cursor);
    }
    if (n > best) best = n;
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * Aggregation
 * ------------------------------------------------------------------ */
export type MonthAgg = {
  entries: Entry[];
  sales: number;
  tb: number;
  brandSales: number;
  konsSales: number;
  brandTb: number;
  konsTb: number;
  splitEntries: number;
  unsplitEntries: number;
  unsplitSales: number;
  days: number;
  salesDays: number;
  avgTbPerSale: number | null;
  avgPerDay: number | null;
  avgPerWorkday: number | null;
  bestDay: Entry | null;
  hours: number;
  salesPerHour: number | null;
};

export function aggregate(entries: Entry[]): MonthAgg {
  const sales = entries.reduce((s, e) => s + Number(e.sales || 0), 0);
  const tb = entries.reduce((s, e) => s + Number(e.tb_sek || 0), 0);
  const brandSales = entries.reduce((s, e) => s + Number(e.brandkollen_sales || 0), 0);
  const konsSales = entries.reduce((s, e) => s + Number(e.konsumentkollen_sales || 0), 0);
  const brandTb = entries.reduce((s, e) => s + Number(e.brandkollen_tb || 0), 0);
  const konsTb = entries.reduce((s, e) => s + Number(e.konsumentkollen_tb || 0), 0);
  const splitEntries = entries.filter((e) => e.brandkollen_sales != null || e.konsumentkollen_sales != null).length;
  const unsplitEntries = entries.length - splitEntries;
  const splitSales = brandSales + konsSales;
  const unsplitSales = sales - splitSales;
  const hours = entries.reduce((s, e) => s + Number(e.hours || 0), 0);
  const bestDay = entries.reduce<Entry | null>((b, e) => (!b || Number(e.sales) > Number(b.sales) ? e : b), null);
  return {
    entries,
    sales,
    tb,
    brandSales,
    konsSales,
    brandTb,
    konsTb,
    splitEntries,
    unsplitEntries,
    unsplitSales,
    days: entries.length,
    salesDays: entries.filter((e) => Number(e.sales) > 0).length,
    avgTbPerSale: sales > 0 ? tb / sales : null,
    avgPerDay: entries.length ? sales / entries.length : null,
    avgPerWorkday: 0,
    bestDay,
    hours,
    salesPerHour: hours > 0 ? sales / hours : null,
  };
}

export function productSplit(entries: Entry[]): {
  brandSales: number;
  konsSales: number;
  brandTb: number;
  konsTb: number;
  unsplitSales: number;
  splitEntries: number;
  totalEntries: number;
} {
  return {
    brandSales: entries.reduce((s, e) => s + Number(e.brandkollen_sales || 0), 0),
    konsSales: entries.reduce((s, e) => s + Number(e.konsumentkollen_sales || 0), 0),
    brandTb: entries.reduce((s, e) => s + Number(e.brandkollen_tb || 0), 0),
    konsTb: entries.reduce((s, e) => s + Number(e.konsumentkollen_tb || 0), 0),
    unsplitSales: entries.reduce(
      (s, e) =>
        s +
        (e.brandkollen_sales == null && e.konsumentkollen_sales == null
          ? Number(e.sales || 0)
          : Math.max(0, Number(e.sales || 0) - Number(e.brandkollen_sales || 0) - Number(e.konsumentkollen_sales || 0))),
      0,
    ),
    splitEntries: entries.filter((e) => e.brandkollen_sales != null || e.konsumentkollen_sales != null).length,
    totalEntries: entries.length,
  };
}

/* ------------------------------------------------------------------ *
 * Seller / month model
 * ------------------------------------------------------------------ */
export type MonthStats = MonthAgg & {
  username: string;
  display_name: string;
  monthKey: string;
  goals: Goals;
  isCurrent: boolean;
  isFinal: boolean;
  registeredWorkdays: number;
  elapsedWorkdays: number;
  remainingWorkdays: number;
  totalWorkdays: number;
  coverageRatio: number;
  paceReliable: boolean;
  projection: number | null;
  projectionReason: string | null;
  requiredPerRemaining: number | null;
  aheadOfPlan: number | null;
  goalPct: number;
  tbGoalPct: number;
  goalGap: number;
  tbGoalGap: number;
};

export function monthEntries(entries: Entry[], monthKey: string, today = todayISO()): Entry[] {
  const { start, end } = monthBounds(monthKey);
  const isCurrent = monthKey === monthOf(today);
  return entries.filter((e) => e.entry_date >= start && e.entry_date <= end && (!isCurrent || e.entry_date <= today));
}

export function buildMonthStats(
  username: string,
  displayName: string,
  entries: Entry[],
  goals: Goals,
  monthKey: string,
  today = todayISO(),
): MonthStats {
  const isCurrent = monthKey === monthOf(today);
  const isFuture = monthKey > monthOf(today);
  const monthRows = monthEntries(entries, monthKey, today);
  const agg = aggregate(monthRows);
  const registeredWorkdays = monthRows.filter((e) => isWorkday(e.entry_date)).length;
  const { start, end } = monthBounds(monthKey);
  const totalWorkdays = workdaysBetween(start, end);
  const elapsedWorkdays = isCurrent ? workdaysBetween(start, today) : isFuture ? 0 : totalWorkdays;
  const remainingWorkdays = isCurrent ? workdaysBetween(today, end) : 0;
  const coverageRatio = elapsedWorkdays > 0 ? registeredWorkdays / elapsedWorkdays : 0;
  const paceReliable =
    !isFuture &&
    elapsedWorkdays > 0 &&
    registeredWorkdays >= Math.min(3, elapsedWorkdays) &&
    coverageRatio >= 0.7;

  let projection: number | null = null;
  let projectionReason: string | null = null;
  if (isFuture) {
    projectionReason = 'Månaden har inte börjat.';
  } else if (!isCurrent) {
    projection = agg.sales;
    projectionReason = 'Slutresultat.';
  } else if (!paceReliable) {
    projectionReason = `Underlaget är för tunt: ${registeredWorkdays} av ${elapsedWorkdays} passerade arbetsdagar registrerade.`;
  } else if (registeredWorkdays < 5) {
    projectionReason = 'Minst 5 registrerade arbetsdagar krävs för en prognos.';
  } else {
    projection = (agg.sales / registeredWorkdays) * totalWorkdays;
    projectionReason = `Baserat på ${registeredWorkdays} registrerade arbetsdagar.`;
  }

  const goalGap = Math.max(0, Number(goals.monthly_sales || 0) - agg.sales);
  const tbGoalGap = Math.max(0, Number(goals.monthly_tb || 0) - agg.tb);
  // Days still open for selling = remaining calendar workdays, minus today when today already has a registration.
  const todayRegistered = isCurrent && monthRows.some((e) => e.entry_date === today);
  const openWorkdays = isCurrent ? workdaysBetween(todayRegistered ? addDays(today, 1) : today, end) : 0;
  const requiredPerRemaining = isCurrent && paceReliable && openWorkdays > 0 ? goalGap / openWorkdays : null;

  const aheadOfPlan =
    paceReliable && totalWorkdays > 0
      ? agg.sales - Number(goals.monthly_sales || 0) * (elapsedWorkdays / totalWorkdays)
      : null;

  return {
    ...agg,
    username,
    display_name: displayName,
    monthKey,
    goals,
    isCurrent,
    isFinal: !isCurrent && !isFuture,
    registeredWorkdays,
    elapsedWorkdays,
    remainingWorkdays,
    totalWorkdays,
    coverageRatio,
    paceReliable,
    projection,
    projectionReason,
    requiredPerRemaining,
    aheadOfPlan,
    goalPct: pct(agg.sales, Number(goals.monthly_sales || 0)),
    tbGoalPct: pct(agg.tb, Number(goals.monthly_tb || 0)),
    goalGap,
    tbGoalGap,
    avgPerWorkday: registeredWorkdays > 0 ? agg.sales / registeredWorkdays : null,
  };
}

export type LeaderRow = MonthStats & { rank: number; tied: boolean };

/**
 * Only sellers belong in the sales ranking. Managers are deliberately excluded.
 */
export function buildLeaderboard(members: { username: string; display_name: string; role: string; goals: Goals; entries: Entry[] }[], monthKey: string, today = todayISO()): LeaderRow[] {
  const sellers = members.filter((m) => m.role === 'seller');
  const rows = sellers.map((m) => buildMonthStats(m.username, m.display_name, m.entries, m.goals, monthKey, today));
  rows.sort(
    (a, b) =>
      b.sales - a.sales ||
      b.tb - a.tb ||
      (b.avgTbPerSale || 0) - (a.avgTbPerSale || 0) ||
      a.display_name.localeCompare(b.display_name),
  );
  return rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    tied: i > 0 && r.sales === rows[i - 1].sales && r.tb === rows[i - 1].tb,
  }));
}

export function teamStats(members: { username: string; display_name: string; role: string; goals: Goals; entries: Entry[] }[], monthKey: string, today = todayISO()) {
  const sellers = members.filter((m) => m.role === 'seller');
  const rows = sellers.map((m) => buildMonthStats(m.username, m.display_name, m.entries, m.goals, monthKey, today));
  // Rows are returned ranked (sales, then TB) so every view lists sellers in ranking order.
  rows.sort((a, b) => b.sales - a.sales || b.tb - a.tb || a.display_name.localeCompare(b.display_name));
  const sales = rows.reduce((s, r) => s + r.sales, 0);
  const tb = rows.reduce((s, r) => s + r.tb, 0);
  const goal = rows.reduce((s, r) => s + Number(r.goals.monthly_sales || 0), 0);
  const tbGoal = rows.reduce((s, r) => s + Number(r.goals.monthly_tb || 0), 0);
  const leader = [...rows].sort((a, b) => b.sales - a.sales || b.tb - a.tb)[0] || null;
  const projections = rows.filter((r) => r.projection != null);
  const projection = projections.length ? projections.reduce((s, r) => s + (r.projection || 0), 0) : null;
  const reliableRows = rows.filter((r) => r.paceReliable);
  return {
    rows,
    sales,
    tb,
    goal,
    tbGoal,
    goalPct: pct(sales, goal),
    tbGoalPct: pct(tb, tbGoal),
    leader,
    projection,
    projectionReliable: reliableRows.length === rows.length && rows.length > 0,
    remainingWorkdays: rows[0]?.remainingWorkdays ?? remainingWorkdays(today),
    registeredWorkdays: rows.reduce((s, r) => s + r.registeredWorkdays, 0),
    elapsedWorkdays: rows[0]?.elapsedWorkdays ?? elapsedWorkdays(today),
  };
}

/* ------------------------------------------------------------------ *
 * Comparison / trends
 * ------------------------------------------------------------------ */
export type MonthComparison = {
  current: { label: string; sales: number; tb: number; days: number };
  previous: { label: string; sales: number; tb: number; days: number };
  salesDiff: number;
  tbDiff: number;
  salesPct: number | null;
  tbPct: number | null;
  samePeriod: boolean;
};

/** Compares a month with the previous one. For the running month only the same
 *  elapsed calendar period is used, never a whole month against a partial one. */
export function compareMonths(entries: Entry[], monthKey: string, today = todayISO()): MonthComparison | null {
  const isCurrent = monthKey === monthOf(today);
  const prevKey = previousMonthKey(monthKey);
  const curRows = monthEntries(entries, monthKey, today);
  if (!curRows.length) return null;

  let prevRows: Entry[] = [];
  if (isCurrent) {
    const day = Number(today.slice(8, 10));
    const prevLast = monthBounds(prevKey).end;
    const through = `${prevKey}-${String(Math.min(day, Number(prevLast.slice(8, 10)))).padStart(2, '0')}`;
    prevRows = entries.filter((e) => e.entry_date >= `${prevKey}-01` && e.entry_date <= through);
  } else {
    prevRows = monthEntries(entries, prevKey, today);
  }
  if (!prevRows.length) return null;

  const cur = {
    label: monthLabel(monthKey),
    sales: curRows.reduce((s, e) => s + Number(e.sales || 0), 0),
    tb: curRows.reduce((s, e) => s + Number(e.tb_sek || 0), 0),
    days: curRows.length,
  };
  const prev = {
    label: monthLabel(prevKey),
    sales: prevRows.reduce((s, e) => s + Number(e.sales || 0), 0),
    tb: prevRows.reduce((s, e) => s + Number(e.tb_sek || 0), 0),
    days: prevRows.length,
  };
  return {
    current: cur,
    previous: prev,
    salesDiff: cur.sales - prev.sales,
    tbDiff: cur.tb - prev.tb,
    salesPct: prev.sales ? Math.round(((cur.sales - prev.sales) / prev.sales) * 100) : null,
    tbPct: prev.tb ? Math.round(((cur.tb - prev.tb) / prev.tb) * 100) : null,
    samePeriod: isCurrent,
  };
}

export type TrendResult = {
  current: number;
  previous: number;
  pct: number | null;
  currentDays: number;
  previousDays: number;
  reliable: boolean;
  windowDays: number;
};

/** Last N days versus the N days before. Only registered days are counted —
 *  a missing day is never a zero. */
export function trend(entries: Entry[], days: 7 | 30, today = todayISO()): TrendResult {
  const start = addDays(today, -(days - 1));
  const prevStart = addDays(today, -(days * 2 - 1));
  const prevEnd = addDays(start, -1);
  const cur = entries.filter((e) => e.entry_date >= start && e.entry_date <= today);
  const prev = entries.filter((e) => e.entry_date >= prevStart && e.entry_date <= prevEnd);
  const cs = cur.reduce((s, e) => s + Number(e.sales || 0), 0);
  const ps = prev.reduce((s, e) => s + Number(e.sales || 0), 0);
  const minDays = days === 7 ? 3 : 5;
  const reliable = cur.length >= minDays && prev.length >= minDays && ps > 0;
  return {
    current: cs,
    previous: ps,
    pct: reliable && ps > 0 ? Math.round(((cs - ps) / ps) * 100) : null,
    currentDays: cur.length,
    previousDays: prev.length,
    reliable,
    windowDays: days,
  };
}

export function personalRecord(entries: Entry[]): Entry | null {
  return entries.reduce<Entry | null>((b, e) => (!b || Number(e.sales) > Number(b.sales) ? e : b), null);
}

export function bestDay(entries: Entry[]): Entry | null {
  return personalRecord(entries);
}

/* ------------------------------------------------------------------ *
 * CSV
 * ------------------------------------------------------------------ */
const csvCell = (v: unknown): string => {
  const s = String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildMonthCsv(monthKey: string, members: { username: string; display_name: string; role: string; goals: Goals; entries: Entry[] }[]): string {
  const rows = members
    .filter((m) => m.role === 'seller')
    .flatMap((m) =>
      monthEntries(m.entries, monthKey).map((e) => ({
        datum: e.entry_date,
        säljare: m.display_name,
        sälj: e.sales,
        tb_sek: e.tb_sek,
        brandkollen_sälj: e.brandkollen_sales ?? '',
        konsumentkollen_sälj: e.konsumentkollen_sales ?? '',
        brandkollen_tb: e.brandkollen_tb ?? '',
        konsumentkollen_tb: e.konsumentkollen_tb ?? '',
        timmar: e.hours ?? '',
        anteckning: e.note ?? '',
      })),
    )
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.säljare.localeCompare(b.säljare));

  const head = ['datum', 'säljare', 'sälj', 'tb_sek', 'brandkollen_sälj', 'konsumentkollen_sälj', 'brandkollen_tb', 'konsumentkollen_tb', 'timmar', 'anteckning'];
  const lines = [head.join(';')];
  for (const r of rows) lines.push(head.map((k) => csvCell((r as any)[k])).join(';'));
  return '\uFEFF' + lines.join('\r\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ------------------------------------------------------------------ *
 * Achievements (per seller)
 * ------------------------------------------------------------------ */
export type AchievementDef = {
  key: string;
  name: string;
  emoji: string;
  desc: string;
  cond: (rows: Entry[], goals: Goals) => boolean;
};

/** Sales per ISO week (Monday key) across the whole history — used by achievements. */
export function weekTotalsAll(entries: { entry_date: string; sales: number }[]): { key: string; sales: number; days: number }[] {
  const map = new Map<string, { sales: number; days: number }>();
  for (const e of entries) {
    const k = weekMonday(e.entry_date);
    const cur = map.get(k) || { sales: 0, days: 0 };
    cur.sales += Number(e.sales || 0);
    cur.days += 1;
    map.set(k, cur);
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => a.key.localeCompare(b.key));
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_entry', name: 'Första steget', emoji: '🌱', desc: 'Du registrerade din första dag.', cond: (r) => r.length >= 1 },
  { key: 'first_goal', name: 'Dagsmål nått', emoji: '🎯', desc: 'Du nådde dagsmålet en dag.', cond: (r, g) => g.daily_sales > 0 && r.some((x) => x.sales >= g.daily_sales) },
  { key: 'entries_10', name: '10 dagar', emoji: '📅', desc: '10 registrerade dagar.', cond: (r) => r.length >= 10 },
  { key: 'entries_25', name: 'Raster', emoji: '🗓️', desc: '25 registrerade dagar.', cond: (r) => r.length >= 25 },
  { key: 'entries_50', name: 'Disciplin', emoji: '📚', desc: '50 registrerade dagar.', cond: (r) => r.length >= 50 },
  {
    key: 'week_goal',
    name: 'Veckomål nått',
    emoji: '📈',
    desc: 'En vecka (minst 3 registrerade dagar) där veckomålet nåddes.',
    cond: (r, g) => g.weekly_sales > 0 && weekTotalsAll(r).some((w) => w.days >= 3 && w.sales >= g.weekly_sales),
  },
  {
    key: 'perfect_week',
    name: 'Perfekt vecka',
    emoji: '🌟',
    desc: 'Fem arbetsdagar i rad där dagsmålet nåddes.',
    cond: (r, g) => bestGoalStreak(r, g) >= 5,
  },
  { key: 'sales_100', name: 'Hundraklubben', emoji: '💯', desc: '100 sälj totalt.', cond: (r) => r.reduce((s, x) => s + Number(x.sales || 0), 0) >= 100 },
  { key: 'sales_500', name: 'Femhundraklubben', emoji: '🎖️', desc: '500 sälj totalt.', cond: (r) => r.reduce((s, x) => s + Number(x.sales || 0), 0) >= 500 },
  { key: 'streak_3', name: 'I form', emoji: '🔥', desc: '3 arbetsdagar i rad med mål.', cond: (r, g) => bestGoalStreak(r, g) >= 3 },
  { key: 'streak_7', name: 'En hel vecka', emoji: '💪', desc: '7 arbetsdagar i rad med mål.', cond: (r, g) => bestGoalStreak(r, g) >= 7 },
  { key: 'streak_14', name: 'Två veckor', emoji: '🏅', desc: '14 arbetsdagar i rad med mål.', cond: (r, g) => bestGoalStreak(r, g) >= 14 },
  { key: 'streak_30', name: 'Månadens kung', emoji: '👑', desc: '30 arbetsdagar i rad med mål.', cond: (r, g) => bestGoalStreak(r, g) >= 30 },
  { key: 'ten_sales', name: 'Dubbel siffra', emoji: '🚀', desc: 'En dag med 10+ sälj.', cond: (r) => r.some((x) => x.sales >= 10) },
  { key: 'fifteen_sales', name: 'Monsterdag', emoji: '💎', desc: 'En dag med 15+ sälj.', cond: (r) => r.some((x) => x.sales >= 15) },
  { key: 'twenty_sales', name: 'Legendarisk', emoji: '⚡', desc: 'En dag med 20+ sälj.', cond: (r) => r.some((x) => x.sales >= 20) },
  {
    key: 'month_goal',
    name: 'Månadsmästare',
    emoji: '🏆',
    desc: 'Du nådde månadsmålet.',
    cond: (r, g) => {
      if (!(g.monthly_sales > 0)) return false;
      const mk = monthOf(todayISO());
      return r.filter((x) => monthOf(x.entry_date) === mk).reduce((s, x) => s + x.sales, 0) >= g.monthly_sales;
    },
  },
  {
    key: 'tb_100k_month',
    name: 'Sexsiffrigt',
    emoji: '💰',
    desc: 'Över 100 000 kr TB på en månad.',
    cond: (r) => {
      const byMonth = new Map<string, number>();
      for (const x of r) byMonth.set(monthOf(x.entry_date), (byMonth.get(monthOf(x.entry_date)) || 0) + x.tb_sek);
      return [...byMonth.values()].some((v) => v >= 100000);
    },
  },
];

export function unlockedAchievements(rows: Entry[], goals: Goals, unlocked: Set<string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => unlocked.has(a.key) || a.cond(rows, goals));
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */
export function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('sv-SE', { timeZone: STOCKHOLM, hour: 'numeric', hour12: false }).format(new Date()),
  );
  if (hour < 5) return 'God natt';
  if (hour < 10) return 'God morgon';
  if (hour < 18) return 'Hej';
  if (hour < 23) return 'God kväll';
  return 'God natt';
}

export function dateLabel(iso: string): string {
  return parseISO(iso).toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

export function dateLabelShort(iso: string): string {
  return parseISO(iso).toLocaleDateString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function weekdayShort(iso: string): string {
  return parseISO(iso).toLocaleDateString('sv-SE', { weekday: 'short', timeZone: 'UTC' });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function moodEmoji(mood: Mood): string {
  return mood ? MOOD_EMOJI[mood] || '' : '';
}

export type { Entry, Goals, Mood, PublicEntry, TeamMember, Activity, AuthUser } from './types';
