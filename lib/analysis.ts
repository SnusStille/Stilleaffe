/**
 * Analysis layer — everything here is pure, local and evidence-based.
 * No AI, no network: insights, the weekly duel, the month planner, open-day
 * detection and the year heatmap are all computed from registered entries.
 * A day without a registration is never treated as a zero.
 */
import {
  addDays,
  buildMonthStats,
  fmtMoney,
  isWorkday,
  isoWeekKey,
  monthBounds,
  monthOf,
  parseISO,
  pct,
  personalRecord,
  previousWorkday,
  productSplit,
  todayISO,
  weekMonday,
  weekdayShort,
  workdaysBetween,
  type Entry,
  type Goals,
} from './calc';

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

const n1 = (v: number) => v.toLocaleString('sv-SE', { maximumFractionDigits: 1 });
const n0 = (v: number) => Math.round(v).toLocaleString('sv-SE');
const DAY_LONG = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
const dow = (iso: string) => parseISO(iso).getUTCDay();
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

function nextWorkday(iso: string): string {
  let d = addDays(iso, 1);
  for (let i = 0; i < 10; i++) {
    if (isWorkday(d)) return d;
    d = addDays(d, 1);
  }
  return d;
}

function previousMonthKey(monthKey: string): string {
  return monthOf(addDays(monthBounds(monthKey).start, -1));
}

export type MemberLike = { username: string; display_name: string; role: string; goals: Goals; entries: Entry[] };

/* ------------------------------------------------------------------ *
 * Insights
 * ------------------------------------------------------------------ */

export type InsightTone = 'good' | 'warn' | 'info';
export type Insight = { id: string; tone: InsightTone; emoji: string; title: string; body: string; weight: number };

/** Longest run of consecutive workdays with a registration (today counts if registered). */
export function bestRegisteredStreak(entries: Entry[]): number {
  const set = new Set(entries.map((e) => e.entry_date));
  let best = 0;
  for (const key of set) {
    let n = 0;
    let cursor = key;
    while (set.has(cursor)) {
      n += 1;
      cursor = previousWorkday(cursor);
    }
    best = Math.max(best, n);
  }
  return best;
}

/**
 * Rule-based insights for one seller. Every rule has a minimum-evidence
 * threshold so a new account never gets confident-sounding nonsense.
 */
export function buildInsights(entries: Entry[], goals: Goals, today = todayISO()): Insight[] {
  const out: Insight[] = [];
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const mk = monthOf(today);
  const prevMk = previousMonthKey(mk);
  const ms = buildMonthStats('x', 'x', sorted, goals, mk, today);
  const monthRows = sorted.filter((e) => monthOf(e.entry_date) === mk);
  const prevRows = sorted.filter((e) => monthOf(e.entry_date) === prevMk);
  const since30 = addDays(today, -29);
  const last30 = sorted.filter((e) => e.entry_date >= since30 && e.entry_date <= today);
  const byDate = new Map(sorted.map((e) => [e.entry_date, Number(e.sales || 0)]));
  const good = (id: string, emoji: string, title: string, body: string, weight: number): Insight => ({ id, tone: 'good', emoji, title, body, weight });
  const warn = (id: string, emoji: string, title: string, body: string, weight: number): Insight => ({ id, tone: 'warn', emoji, title, body, weight });
  const info = (id: string, emoji: string, title: string, body: string, weight: number): Insight => ({ id, tone: 'info', emoji, title, body, weight });

  const monthGoal = Number(goals.monthly_sales || 0);

  // 1 · Pace / projection
  if (ms.isCurrent && ms.projection != null && monthGoal > 0) {
    const of = Math.round((ms.projection / monthGoal) * 100);
    if (ms.projection >= monthGoal) {
      out.push(good('pace', '🚀', `Takten räcker – prognos ${n0(ms.projection)} sälj`, `I din nuvarande takt landar du på ${of} % av månadsmålet (${n0(monthGoal)} sälj).`, 100));
    } else {
      const req = ms.requiredPerRemaining != null ? ` Det krävs ${n1(ms.requiredPerRemaining)} sälj per återstående arbetsdag.` : '';
      out.push(warn('pace', '🐢', `Prognosen hamnar ${n0(monthGoal - ms.projection)} sälj kort`, `I nuvarande takt: ${n0(ms.projection)} av ${n0(monthGoal)} sälj.${req}`, 100));
    }
  }

  // 2 · Coverage this month
  if (ms.isCurrent && ms.elapsedWorkdays >= 5) {
    const missing = ms.elapsedWorkdays - ms.registeredWorkdays;
    if (missing === 0) {
      out.push(good('coverage', '✅', 'Alla arbetsdagar registrerade', `${ms.registeredWorkdays} av ${ms.elapsedWorkdays} arbetsdagar denna månad – snitt och prognoser bygger på komplett underlag.`, 90));
    } else if (ms.coverageRatio < 0.8 && (ms.registeredWorkdays > 0 || ms.elapsedWorkdays <= 5)) {
      out.push(warn('coverage', '⚠️', `${missing} arbetsdagar saknar registrering`, `${ms.registeredWorkdays} av ${ms.elapsedWorkdays} arbetsdagar denna månad är registrerade. Saknade dagar räknas inte som noll – men de gör prognosen osäker.`, 95));
    }
  }

  // 3 · Best weekday (lifetime)
  const byWd = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  for (const e of sorted) {
    const d = dow(e.entry_date);
    byWd[d].sum += Number(e.sales || 0);
    byWd[d].count += 1;
  }
  const wdCandidates = [1, 2, 3, 4, 5].filter((d) => byWd[d].count >= 2);
  if (sorted.length >= 6 && wdCandidates.length >= 2) {
    const avgs = wdCandidates.map((d) => ({ d, a: byWd[d].sum / byWd[d].count }));
    const bestWd = avgs.reduce((b, x) => (x.a > b.a ? x : b));
    const worstWd = avgs.reduce((w, x) => (x.a < w.a ? x : w));
    if (worstWd.a > 0 && bestWd.a / worstWd.a >= 1.3) {
      out.push(info('weekday', '📅', `Din bästa dag är ${DAY_LONG[bestWd.d]}`, `Snitt ${n1(bestWd.a)} sälj på ${DAY_LONG[bestWd.d]}ar mot ${n1(worstWd.a)} på ${DAY_LONG[worstWd.d]}ar (${byWd[bestWd.d].count} respektive ${byWd[worstWd.d].count} registrerade dagar).`, 70));
    }
  }

  // 4 · Momentum the workday after a goal hit
  const after = { hit: [] as number[], miss: [] as number[] };
  const daily = Number(goals.daily_sales || 0);
  if (daily > 0) {
    for (const e of sorted) {
      const next = byDate.get(nextWorkday(e.entry_date));
      if (next == null) continue;
      (Number(e.sales || 0) >= daily ? after.hit : after.miss).push(next);
    }
  }
  if (after.hit.length >= 3 && after.miss.length >= 3) {
    const ah = avg(after.hit);
    const am = avg(after.miss);
    if (am > 0 && ah / am >= 1.15) {
      out.push(good('momentum', '🔥', `${Math.round((ah / am - 1) * 100)} % fler sälj efter en målträff`, `Dagen efter att du nått dagsmålet säljer du i snitt ${n1(ah)} sälj mot ${n1(am)} sälj efter övriga dagar (${after.hit.length} + ${after.miss.length} dagar).`, 65));
    } else if (am > 0 && ah / am <= 0.85) {
      out.push(info('momentum', '📉', 'Dagen efter en målträff dippar', `Snitt ${n1(ah)} sälj dagen efter en målträff mot ${n1(am)} efter övriga dagar – värt att se över uppföljningen.`, 55));
    }
  }

  // 5 · Registration streak
  const set = new Set(sorted.map((e) => e.entry_date));
  let cursor = set.has(today) ? today : previousWorkday(today);
  let streak = 0;
  while (set.has(cursor) && streak < 400) {
    streak += 1;
    cursor = previousWorkday(cursor);
  }
  const bestStreak = bestRegisteredStreak(sorted);
  if (streak >= 3) {
    out.push(good('streak', '🔥', `${streak} arbetsdag${streak === 1 ? '' : 'ar'} i rad med registrering`, bestStreak > streak ? `Rekordet är ${bestStreak} dagar – fortsätt!` : 'Det är ditt längsta svit hittills.', 62));
  } else if (isWorkday(today) && !set.has(today) && set.has(previousWorkday(today))) {
    out.push(info('streak', '📌', 'Idag saknar registrering', 'Igår är registrerat – registrera dagens siffror innan dagen är slut så håller sviten.', 60));
  }

  // 6 · Zero days lately
  if (last30.length >= 6) {
    const zeros = last30.filter((e) => Number(e.sales || 0) === 0).length;
    if (zeros / last30.length >= 0.3) {
      out.push(info('zero', '💤', `${zeros} av ${last30.length} registrerade dagar hade 0 sälj`, 'Senaste 30 dagarna. Dagar utan registrering räknas inte med.', 55));
    }
  }

  // 7 · Product mix shift month over month
  const mixNow = productSplit(monthRows);
  const mixPrev = productSplit(prevRows);
  const splitNow = mixNow.brandSales + mixNow.konsSales;
  const splitPrev = mixPrev.brandSales + mixPrev.konsSales;
  if (mixNow.splitEntries >= 3 && mixPrev.splitEntries >= 3 && splitNow > 0 && splitPrev > 0) {
    const kkNow = Math.round((mixNow.konsSales / splitNow) * 100);
    const kkPrev = Math.round((mixPrev.konsSales / splitPrev) * 100);
    if (Math.abs(kkNow - kkPrev) >= 10) {
      const up = kkNow > kkPrev;
      out.push(info('mix', '🧩', `Konsumentkollenandelen har gått ${up ? 'upp' : 'ner'} ${Math.abs(kkNow - kkPrev)} enheter`, `${kkPrev} % → ${kkNow} % av de uppdelade säljen (${mixPrev.splitEntries} → ${mixNow.splitEntries} registreringar).`, 50));
    }
  }

  // 8 · TB per sale month over month
  const tbNow = monthRows.reduce((s, e) => s + Number(e.tb_sek || 0), 0) / Math.max(1, monthRows.reduce((s, e) => s + Number(e.sales || 0), 0));
  const salesNow = monthRows.reduce((s, e) => s + Number(e.sales || 0), 0);
  const salesPrev = prevRows.reduce((s, e) => s + Number(e.sales || 0), 0);
  const tbPrev = prevRows.reduce((s, e) => s + Number(e.tb_sek || 0), 0) / Math.max(1, salesPrev);
  if (salesNow >= 3 && salesPrev >= 3 && tbPrev > 0) {
    const delta = Math.round(((tbNow - tbPrev) / tbPrev) * 100);
    if (Math.abs(delta) >= 10) {
      const up = delta > 0;
      out.push(
        up
          ? good('tb', '💰', `TB per sälj är uppe ${delta} %`, `${fmtMoney(tbPrev)} → ${fmtMoney(tbNow)} per sälj mot förra månaden.`, 50)
          : warn('tb', '🧮', `TB per sälj är nere ${Math.abs(delta)} %`, `${fmtMoney(tbPrev)} → ${fmtMoney(tbNow)} per sälj mot förra månaden – fler billigare affärer denna månad.`, 50),
      );
    }
  }

  // 9 · Personal record within reach
  const pr = personalRecord(sorted);
  const bestThisMonth = monthRows.reduce((b, e) => Math.max(b, Number(e.sales || 0)), 0);
  if (pr && Number(pr.sales) >= 5 && bestThisMonth < Number(pr.sales) && bestThisMonth >= Number(pr.sales) * 0.8) {
    out.push(info('record', '🏅', `${n0(Number(pr.sales) - bestThisMonth)} sälj från ditt personliga rekord`, `Din bästa dag denna månad är ${n0(bestThisMonth)} sälj – rekordet är ${n0(Number(pr.sales))} (${pr.entry_date}).`, 58));
  }

  // 10 · Consistency over 30 days
  const vals30 = last30.map((e) => Number(e.sales || 0));
  if (vals30.length >= 8) {
    const mean = avg(vals30);
    if (mean > 0) {
      const sd = Math.sqrt(avg(vals30.map((v) => (v - mean) ** 2)));
      const cv = sd / mean;
      if (cv <= 0.35) out.push(good('steady', '🎯', 'Jämn och stabil försäljning', `Snitt ${n1(mean)} sälj per registrerad dag senaste 30 dagarna med liten spridning.`, 60));
      else if (cv >= 0.8) out.push(info('swing', '🎢', 'Stora svängningar dag till dag', `Mellan ${Math.min(...vals30)} och ${Math.max(...vals30)} sälj per dag – snitt ${n1(mean)}. Letar du efter vad som skiljer dagarna?`, 55));
    }
  }

  // 11 · Pace per hour when hours are registered
  const hours30 = last30.filter((e) => Number(e.hours || 0) > 0);
  if (hours30.length >= 3) {
    const h = hours30.reduce((s, e) => s + Number(e.hours || 0), 0);
    const s = hours30.reduce((s, e) => s + Number(e.sales || 0), 0);
    out.push(info('hours', '⏱️', `${n1(s / h)} sälj per timme`, `Baserat på ${n1(h)} timmar och ${n0(s)} sälj senaste 30 dagarna.`, 40));
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/** Manager view: what the numbers say about the team right now. */
export function buildTeamInsights(members: MemberLike[], monthKey: string, today = todayISO()): Insight[] {
  const out: Insight[] = [];
  const sellers = members.filter((m) => m.role === 'seller');
  const rows = sellers.map((m) => buildMonthStats(m.username, m.display_name, m.entries, m.goals, monthKey, today));
  const isCurrent = monthKey === monthOf(today);
  if (!rows.length) return out;
  const warn = (id: string, emoji: string, title: string, body: string, weight: number): Insight => ({ id, tone: 'warn', emoji, title, body, weight });
  const info = (id: string, emoji: string, title: string, body: string, weight: number): Insight => ({ id, tone: 'info', emoji, title, body, weight });
  const good = (id: string, emoji: string, title: string, body: string, weight: number): Insight => ({ id, tone: 'good', emoji, title, body, weight });

  if (isCurrent) {
    for (const r of rows) {
      const missing = r.elapsedWorkdays - r.registeredWorkdays;
      if (r.elapsedWorkdays >= 1 && r.registeredWorkdays === 0) {
        out.push(warn(`team-coverage-${r.username}`, '⚠️', `${r.display_name} har inte registrerat än`, `0 av ${r.elapsedWorkdays} arbetsdagar denna månad. En påminnelse kan räcka.`, 96));
      } else if (r.elapsedWorkdays >= 3 && missing > 0 && r.coverageRatio < 0.8) {
        out.push(warn(`team-coverage-${r.username}`, '⚠️', `${r.display_name}: ${missing} arbetsdagar utan registrering`, `${r.registeredWorkdays} av ${r.elapsedWorkdays} registrerade denna månad – prognosen för ${r.display_name} är osäker.`, 90));
      }
    }
    const complete = rows.filter((r) => r.elapsedWorkdays >= 3 && r.elapsedWorkdays === r.registeredWorkdays);
    if (complete.length === rows.length) {
      out.push(good('team-coverage', '✅', 'Hela teamet är komplett registrerat', `${rows.map((r) => r.registeredWorkdays).reduce((s, x) => s + x, 0)} registrerade arbetsdagar denna månad – alla prognoser bygger på fullt underlag.`, 85));
    }
  }

  const ranked = [...rows].sort((a, b) => b.sales - a.sales || b.tb - a.tb);
  if (ranked.length >= 2 && ranked[0].sales > 0) {
    const gap = ranked[0].sales - ranked[1].sales;
    if (gap >= 10) out.push(info('team-gap', '🏆', `${ranked[0].display_name} leder med ${n0(gap)} sälj`, `${n0(ranked[0].sales)} mot ${n0(ranked[1].sales)} sälj denna månad. ${ranked[1].goalPct < 50 ? `${ranked[1].display_name} ligger på ${ranked[1].goalPct} % av målet – ett samtal kan lösa ut det.` : ''}`.trim(), 60));
    else if (gap > 0 && gap <= 3) out.push(info('team-gap', '⚔️', 'Det är jämnt i toppen', `${ranked[0].display_name} leder med bara ${n0(gap)} sälj före ${ranked[1].display_name}.`, 60));
  }

  const paces = rows.filter((r) => r.avgPerWorkday != null && r.registeredWorkdays >= 3);
  if (paces.length >= 2) {
    const hi = paces.reduce((b, r) => ((r.avgPerWorkday ?? 0) > (b.avgPerWorkday ?? 0) ? r : b));
    const lo = paces.reduce((b, r) => ((r.avgPerWorkday ?? 0) < (b.avgPerWorkday ?? 0) ? r : b));
    if ((lo.avgPerWorkday ?? 0) > 0 && (hi.avgPerWorkday ?? 0) / (lo.avgPerWorkday ?? 1) >= 1.25) {
      out.push(info('team-pace', '📈', `${hi.display_name} säljer ${n1(hi.avgPerWorkday ?? 0)} per arbetsdag – ${lo.display_name} ${n1(lo.avgPerWorkday ?? 0)}`, 'Skillnaden per arbetsdag är stor nog för att en gemensam genomgång ska vara värd tiden.', 55));
    }
  }

  // Team week over week (Monday → same weekday last week, summed over sellers)
  if (isCurrent) {
    const monday = weekMonday(today);
    const lastMonday = addDays(monday, -7);
    const span = workdaysBetween(monday, today);
    const sumRange = (from: string) =>
      sellers.reduce((s, m) => s + m.entries.filter((e) => e.entry_date >= from && e.entry_date < addDays(from, 7) && workdaysBetween(from, e.entry_date) <= span).reduce((t, e) => t + Number(e.sales || 0), 0), 0);
    const now = sumRange(monday);
    const before = sumRange(lastMonday);
    if (span >= 2 && before > 0) {
      const d = Math.round(((now - before) / before) * 100);
      if (Math.abs(d) >= 10) out.push((d > 0 ? good : warn)('team-wow', d > 0 ? '📈' : '📉', `Teamet säljer ${Math.abs(d)} % ${d > 0 ? 'mer' : 'mindre'} än samma dagar förra veckan`, `${n0(now)} sälj mot ${n0(before)} sälj måndag–${weekdayShort(today)}.`, 70));
    }
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/* ------------------------------------------------------------------ *
 * Weekly duel — sellers head to head, this week and recent history
 * ------------------------------------------------------------------ */

export type DuelSeller = { username: string; display_name: string; week: number; days: number; avg: number | null };
export type DuelDay = { date: string; label: string; future: boolean; values: (number | null)[] };
export type DuelWeek = { key: string; label: string; current: boolean; totals: number[]; winner: number | null };
export type Duel = {
  weekKey: string;
  rangeLabel: string;
  sellers: DuelSeller[];
  days: DuelDay[];
  daysWon: number[];
  leader: number | null;
  margin: number;
  history: DuelWeek[];
};

/** "23–29 nov" within a month, "30 nov–6 dec" across months. */
export function weekRangeLabel(monday: string): string {
  const a = parseISO(monday);
  const b = parseISO(addDays(monday, 6));
  const day = (d: Date) => d.toLocaleDateString('sv-SE', { day: 'numeric', timeZone: 'UTC' });
  const mon = (d: Date) => d.toLocaleDateString('sv-SE', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  return a.getUTCMonth() === b.getUTCMonth() ? `${day(a)}–${day(b)} ${mon(a)}` : `${day(a)} ${mon(a)}–${day(b)} ${mon(b)}`;
}

/** A day is "won" only when at least two sellers registered it and exactly one of them has the top figure. */
export function dayWinner(d: DuelDay): number | null {
  const present = d.values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v != null);
  if (present.length < 2) return null;
  const best = Math.max(...present.map((x) => x.v));
  const tops = present.filter((x) => x.v === best);
  return tops.length === 1 ? tops[0].i : null;
}

export function weekDuel(members: MemberLike[], today = todayISO()): Duel | null {
  const sellers = members.filter((m) => m.role === 'seller');
  if (sellers.length < 2) return null;
  const monday = weekMonday(today);
  const bySeller = sellers.map((m) => new Map(m.entries.map((e) => [e.entry_date, Number(e.sales || 0)])));
  const days: DuelDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return {
      date,
      label: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'][i],
      future: date > today,
      values: bySeller.map((map) => (date > today || !map.has(date) ? null : map.get(date)!)),
    };
  });
  const rows = sellers.map((m, i) => {
    const week = days.filter((d) => !d.future).reduce((s, d) => s + (d.values[i] ?? 0), 0);
    const count = days.filter((d) => !d.future && d.values[i] != null).length;
    return { username: m.username, display_name: m.display_name, week, days: count, avg: count ? week / count : null };
  });
  const daysWon = sellers.map((_, i) => days.filter((d) => !d.future && dayWinner(d) === i).length);
  const top = Math.max(...rows.map((r) => r.week));
  const leaders = rows.filter((r) => r.week === top);
  const leader = top > 0 && leaders.length === 1 ? rows.indexOf(leaders[0]) : null;
  const sorted = [...rows].sort((a, b) => b.week - a.week);
  const margin = sorted.length > 1 ? sorted[0].week - sorted[1].week : sorted[0]?.week ?? 0;

  const history: DuelWeek[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = addDays(monday, -7 * w);
    const end = addDays(start, 6);
    const totals = sellers.map((m, i) => m.entries.filter((e) => e.entry_date >= start && e.entry_date <= end).reduce((s, e) => s + Number(e.sales || 0), 0));
    const best = Math.max(...totals);
    const winners = totals.filter((t) => t === best);
    history.push({ key: isoWeekKey(start), label: isoWeekKey(start).slice(5), current: w === 0, totals, winner: best > 0 && winners.length === 1 ? totals.indexOf(best) : null });
  }
  return { weekKey: isoWeekKey(monday), rangeLabel: weekRangeLabel(monday), sellers: rows, days, daysWon, leader, margin, history };
}

/* ------------------------------------------------------------------ *
 * Month planner — "what if I sell X per remaining workday?"
 * ------------------------------------------------------------------ */

export type PlannerRow = { key: string; label: string; sales: number; tb: number; avgTbPerSale: number | null; openWorkdays: number; days: number };
export type Verdict = 'reached' | 'close' | 'short';

export function simulateMonth(rows: PlannerRow[], perDay: number, goalSales: number, goalTb: number, dailySales = 7, dailyTb = 3000) {
  const fallbackTb = dailySales > 0 ? dailyTb / dailySales : 0;
  let sales = 0;
  let tb = 0;
  let currentSales = 0;
  let currentTb = 0;
  let open = 0;
  for (const r of rows) {
    currentSales += r.sales;
    currentTb += r.tb;
    open += r.openWorkdays;
    sales += r.sales + perDay * r.openWorkdays;
    tb += r.tb + perDay * r.openWorkdays * (r.avgTbPerSale ?? fallbackTb);
  }
  const goalPct = pct(sales, goalSales);
  const verdict: Verdict = goalSales > 0 && sales >= goalSales ? 'reached' : goalPct >= 90 ? 'close' : 'short';
  return {
    sales,
    tb,
    goalPct,
    tbGoalPct: pct(tb, goalTb),
    gap: Math.max(0, goalSales - sales),
    currentSales,
    currentTb,
    openWorkdays: open,
    requiredPerDay: open > 0 ? Math.max(0, goalSales - currentSales) / open : null,
    verdict,
  };
}

/* ------------------------------------------------------------------ *
 * Open days — recent workdays without a registration
 * ------------------------------------------------------------------ */

/** Workdays (most recent first) in the last `lookback` workdays that have no registration. Today is excluded. */
export function openWorkdays(entries: Entry[], today = todayISO(), lookback = 10): string[] {
  const set = new Set(entries.map((e) => e.entry_date));
  const out: string[] = [];
  let cursor = previousWorkday(today);
  for (let i = 0; i < lookback; i++) {
    if (!set.has(cursor)) out.push(cursor);
    cursor = previousWorkday(cursor);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Heatmap grid — GitHub-style, goal-relative levels
 * ------------------------------------------------------------------ */

export type HeatState = 'none' | 'miss' | 'zero' | 'l1' | 'l2' | 'l3' | 'l4';
export type HeatCell = { date: string; state: HeatState; sales: number; future: boolean };
export type HeatGrid = {
  columns: { key: string; cells: HeatCell[] }[];
  months: { col: number; label: string }[];
  registered: number;
  hits: number;
  activeDays: number;
  total: number;
};

export function heatmapGrid(entries: Entry[], goal: number, weeks = 53, today = todayISO()): HeatGrid {
  const by = new Map(entries.map((e) => [e.entry_date, Number(e.sales || 0)]));
  const start = addDays(weekMonday(today), -7 * (weeks - 1));
  const columns: HeatGrid['columns'] = [];
  const months: HeatGrid['months'] = [];
  let registered = 0;
  let hits = 0;
  let activeDays = 0;
  let total = 0;
  let prevMonth = '';
  for (let w = 0; w < weeks; w++) {
    const monday = addDays(start, 7 * w);
    const cells: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const future = date > today;
      const weekend = !isWorkday(date);
      const v = by.get(date);
      let state: HeatState = future || weekend ? 'none' : 'miss';
      if (!future && v != null) {
        registered += 1;
        total += v;
        if (v > 0) activeDays += 1;
        if (goal > 0 && v >= goal) hits += 1;
        state = v === 0 ? 'zero' : goal > 0 && v >= goal * 1.5 ? 'l4' : goal > 0 && v >= goal ? 'l3' : goal > 0 && v >= goal * 0.5 ? 'l2' : 'l1';
      }
      cells.push({ date, state, sales: v ?? 0, future });
    }
    const mk = monthOf(monday);
    if (mk !== prevMonth && !(w === 0 && parseISO(monday).getUTCDate() > 7)) {
      months.push({ col: w, label: parseISO(monday).toLocaleDateString('sv-SE', { month: 'short', timeZone: 'UTC' }).replace('.', '') });
    }
    prevMonth = mk;
    columns.push({ key: isoWeekKey(monday), cells });
  }
  return { columns, months, registered, hits, activeDays, total };
}

/* ------------------------------------------------------------------ *
 * Small formatting helpers shared by the cards
 * ------------------------------------------------------------------ */

export const VERDICT_TEXT: Record<Verdict, { label: string; emoji: string }> = {
  reached: { label: 'Målet nås', emoji: '✅' },
  close: { label: 'Vidhängande', emoji: '🤏' },
  short: { label: 'Bortom räckhåll', emoji: '🫥' },
};

export const TONE_LABEL: Record<InsightTone, string> = { good: 'Styrka', warn: 'Att se över', info: 'Mönster' };
