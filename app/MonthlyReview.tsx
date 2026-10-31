'use client';

import { useMemo, useState } from 'react';
import { Row, fmt, fmtMoney, f1, today } from '@/lib/calc';

type Props = { rows: Row[]; aiEnabled: boolean; onOpenAi: (question: string) => void };
const goals = [60_000, 80_000, 100_000];
const labelMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const weekdayIndex = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay();
const mondayOf = (key: string) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
const weekdayNames = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

export default function MonthlyReview({ rows, aiEnabled, onOpenAi }: Props) {
  const currentMonth = today().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const monthOptions = useMemo(() => {
    const months = new Set(rows.map((r) => r.entry_date.slice(0, 7)));
    months.add(currentMonth);
    return [...months].sort().slice(-36);
  }, [rows, currentMonth]);

  const review = useMemo(() => {
    const dateRows = rows.filter((r) => r.entry_date.startsWith(month) && r.entry_date <= today());
    const sales = dateRows.reduce((n, r) => n + Number(r.sales || 0), 0);
    const tb = dateRows.reduce((n, r) => n + Number(r.tb_sek || 0), 0);
    const avg = sales > 0 ? tb / sales : null;
    const isCurrent = month === currentMonth;
    const dayCount = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    const allMonthDates = Array.from({ length: dayCount }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
    const totalWorkdays = allMonthDates.filter((d) => weekdayIndex(d) > 0 && weekdayIndex(d) < 6).length;
    const elapsed = allMonthDates.filter((d) => weekdayIndex(d) > 0 && weekdayIndex(d) < 6 && d <= today()).length;
    const registeredDays = new Set(dateRows.filter((r) => weekdayIndex(r.entry_date) > 0 && weekdayIndex(r.entry_date) < 6).map((r) => r.entry_date)).size;
    const coverageBase = month < currentMonth ? totalWorkdays : elapsed;
    const coverage = coverageBase > 0 ? registeredDays / coverageBase : 0;
    const sortedTb = [...dateRows].sort((a, b) => b.tb_sek - a.tb_sek);
    const sortedSales = [...dateRows].sort((a, b) => b.sales - a.sales);
    const weekMap = new Map<string, Row[]>();
    for (const r of dateRows) {
      const key = mondayOf(r.entry_date);
      const week = weekMap.get(key) || [];
      week.push(r);
      weekMap.set(key, week);
    }
    const weeks = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, week]) => ({
      key,
      sales: week.reduce((n, r) => n + r.sales, 0),
      tb: week.reduce((n, r) => n + r.tb_sek, 0),
      days: week.length,
    }));
    const dailyGroups = new Map<number, Row[]>();
    for (const r of dateRows) {
      const d = weekdayIndex(r.entry_date);
      if (d < 1 || d > 5) continue;
      const values = dailyGroups.get(d) || [];
      values.push(r);
      dailyGroups.set(d, values);
    }
    const weekdayAverages = [...dailyGroups.entries()].map(([day, values]) => ({
      day, name: weekdayNames[day], count: values.length,
      sales: values.reduce((n, r) => n + r.sales, 0) / values.length,
      tb: values.reduce((n, r) => n + r.tb_sek, 0) / values.length,
    })).sort((a, b) => b.sales - a.sales);
    const firstHalf = dateRows.filter((r) => Number(r.entry_date.slice(8)) <= 15);
    const secondHalf = dateRows.filter((r) => Number(r.entry_date.slice(8)) > 15);
    const half = (values: Row[]) => ({ sales: values.reduce((n, r) => n + r.sales, 0), tb: values.reduce((n, r) => n + r.tb_sek, 0), days: values.length });
    const first = half(firstHalf), second = half(secondHalf);
    const [year, monthNo] = month.split('-').map(Number);
    const prevDate = new Date(Date.UTC(year, monthNo - 2, 1, 12));
    const previousMonth = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const previousRows = rows.filter((r) => r.entry_date.startsWith(previousMonth));
    const previousDates = Array.from({ length: new Date(Date.UTC(Number(previousMonth.slice(0, 4)), Number(previousMonth.slice(5, 7)), 0)).getUTCDate() }, (_, i) => `${previousMonth}-${String(i + 1).padStart(2, '0')}`);
    const previousExpected = previousDates.filter((d) => weekdayIndex(d) > 0 && weekdayIndex(d) < 6 && d <= today()).length;
    const previousRegistered = new Set(previousRows.filter((r) => weekdayIndex(r.entry_date) > 0 && weekdayIndex(r.entry_date) < 6).map((r) => r.entry_date)).size;
    const previous = previousRows.length ? {
      sales: previousRows.reduce((n, r) => n + r.sales, 0),
      tb: previousRows.reduce((n, r) => n + r.tb_sek, 0),
      days: previousRows.length,
      registeredWeekdays: previousRegistered,
      expectedWeekdays: previousExpected,
      complete: previousExpected > 0 && previousRegistered === previousExpected,
    } : null;
    const biggestDropWeek = weeks.length > 1 ? [...weeks].sort((a, b) => a.tb - b.tb)[0] : null;
    const signal = !dateRows.length ? 'Saknar registreringar för den här månaden.'
      : isCurrent && coverage < 0.7 ? `Underlaget är ofullständigt: ${registeredDays}/${elapsed} passerade vardagar registrerade.`
        : !isCurrent && month < currentMonth && coverage < 0.7 ? `Historiken är ofullständig: ${registeredDays}/${totalWorkdays} vardagar har registreringar.`
          : dateRows.length < 5 ? 'Färre än fem registrerade dagar — mönster är osäkra.'
            : 'Summering baserad på registrerade dagar; luckor är inte räknade som noll.';
    return { dateRows, sales, tb, avg, elapsed, registeredDays, totalWorkdays, coverage, isCurrent, sortedTb, sortedSales, weeks, weekdayAverages, first, second, previousMonth, previous, biggestDropWeek, signal };
  }, [rows, month, currentMonth]);

  const topWeek = review.weeks.reduce<(typeof review.weeks)[number] | null>((best, w) => !best || w.tb > best.tb ? w : best, null);
  const targetReached = goals.filter((n) => review.tb >= n).length;
  const previousComparable = !!review.previous?.complete && !review.isCurrent && month < currentMonth && review.coverage === 1;
  const trendMax = Math.max(1, ...review.weeks.map((w) => w.tb));
  const question = `Gör en rak månadsgenomgång för ${labelMonth(month)} utifrån de här beräknade Supabase-fakta. Returnera: resultat mot 60k/80k/100k, försäljningar, TB, TB per försäljning, bästa/svagaste registrerade period, utveckling mellan första och andra halvan, rekord, en konkret förbättring och realistiska TB-mål för nästa månad baserade på jämförbar historik. Säg om underlaget är för tunt för målförslag. Ange osäkerhet och datatäckning. Jämför månadsresultat som helperioder endast om båda perioderna är stängda och fullständigt registrerade; annars markera jämförelsen som ej likvärdig. Saknade dagar är inte noll. Hitta inte på orsaker eller siffror. Fakta: ${JSON.stringify({ month, totals: { sales: review.sales, tb: Math.round(review.tb), average_tb_per_sale: review.avg == null ? null : Math.round(review.avg) }, registered_days: review.dateRows.length, registered_weekdays: review.registeredDays, elapsed_weekdays: review.elapsed, coverage_pct: Math.round(review.coverage * 100), first_half: review.first, second_half: review.second, weeks: review.weeks.map((w) => ({ week_of: w.key, sales: w.sales, tb: Math.round(w.tb), registered_days: w.days })), weekday_averages: review.weekdayAverages.map((w) => ({ day: w.name, registered_days: w.count, average_sales: f1(w.sales), average_tb: Math.round(w.tb) })), selected_period_closed_and_complete: month < currentMonth && review.coverage === 1, previous_month: review.previous ? { month: review.previousMonth, ...review.previous } : null, top_days: review.sortedTb.slice(0, 2).map((r) => ({ date: r.entry_date, sales: r.sales, tb: Math.round(r.tb_sek) })), daily_rows: review.dateRows.map((r) => [Number(r.entry_date.slice(8)), r.sales, Math.round(r.tb_sek)]) })}`;

  return <div className="monthly-review-page">
    <header className="mission-header">
      <div><div className="mission-eyebrow"><span className="mission-live-dot"/> MONTHLY REVIEW · DATA AUTOPSY</div><h1>Monthly Review</h1><p>Vad hände, vad går att belägga och vad ska ändras nästa månad?</p></div>
      <label className="mission-month-picker"><span>GRANSKAD PERIOD</span><select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Välj granskningsmånad">{monthOptions.map((m) => <option key={m} value={m}>{labelMonth(m)}</option>)}</select></label>
    </header>

    <section className="c review-overview">
      <div className="review-summary-top"><div><div className="mission-eyebrow">REGISTERED RESULT · {review.dateRows.length} DATES</div><strong>{fmtMoney(review.tb)}</strong><span>{fmt(review.sales)} försäljningar · {review.avg == null ? 'TB-snitt saknas' : `${fmtMoney(review.avg)} TB/försäljning`}</span></div><div className="review-status"><b>{review.isCurrent ? `${review.registeredDays}/${review.elapsed} vardagar registrerade` : `${review.registeredDays} registrerade vardagar`}</b><small>{review.signal}</small></div></div>
      <div className="review-tier-bars">{goals.map((target, i) => <div key={target} className={`review-tier-row t${i}`}><span>{['MINIMUM','TARGET','BEAST MODE'][i]}</span><div className="mission-track"><i style={{width:`${Math.min(100,review.tb/target*100)}%`}}/></div><b>{Math.round(review.tb/target*100)}%</b><small>{review.tb >= target ? 'Nått' : `${fmtMoney(target-review.tb)} kvar`}</small></div>)}</div>
    </section>

    <div className="review-kpis">
      <article className="c"><span>FÖRSÄLJNINGAR</span><b>{fmt(review.sales)}</b><small>{review.dateRows.length} registrerade dagar</small></article>
      <article className="c"><span>BÄSTA TB-DAG</span><b>{review.sortedTb[0] ? fmtMoney(review.sortedTb[0].tb_sek) : '—'}</b><small>{review.sortedTb[0]?.entry_date || 'Ingen data'}</small></article>
      <article className="c"><span>BÄSTA SÄLJDAG</span><b>{review.sortedSales[0] ? `${review.sortedSales[0].sales} avslut` : '—'}</b><small>{review.sortedSales[0]?.entry_date || 'Ingen data'}</small></article>
      <article className="c"><span>ARBETSDAGAR</span><b>{review.isCurrent ? `${review.registeredDays}/${review.elapsed}` : review.registeredDays}</b><small>{review.isCurrent ? 'registrerade / passerade' : 'registrerade i vald månad'}</small></article>
    </div>

    <div className="review-columns">
      <section className="c review-chart"><div className="mission-section-top"><div><div className="mission-eyebrow">WEEKLY TB</div><h2>Utveckling under månaden</h2></div></div>
        {review.weeks.length ? <div className="review-week-list">{review.weeks.map((w) => <div className="review-week" key={w.key}><span>{w.key}</span><div className="mission-track"><i style={{width:`${Math.max(1,w.tb/trendMax*100)}%`}}/></div><b>{fmtMoney(w.tb)}</b><small>{w.sales} avslut · {w.days} dagar</small></div>)}</div> : <p className="s">Ingen veckodata finns för perioden.</p>}
      </section>
      <section className="c review-insights"><div className="mission-section-top"><div><div className="mission-eyebrow">PERFORMANCE SIGNALS</div><h2>Mönster med underlag</h2></div></div>
        {review.weekdayAverages.length ? <div className="review-weekday-list">{review.weekdayAverages.map((w, i) => <div key={w.day}><span>{w.name}{i===0?' · högst snitt':''}</span><b>{f1(w.sales)} sälj/dag</b><small>{fmtMoney(w.tb)} TB/dag · {w.count} registrerade dagar</small></div>)}</div> : <p className="s">Inget veckodagssnitt kan räknas ut än.</p>}
        {review.previous ? <div className="review-compare"><span>FÖREGÅENDE MÅNAD · {labelMonth(review.previousMonth)}</span><b>{fmtMoney(review.previous.tb)} TB</b><small>{review.previous.days} registrerade dagar · vardagstäckning {review.previous.registeredWeekdays}/{review.previous.expectedWeekdays}. Endast registrerade summor.</small>{previousComparable ? <small>Skillnad mellan fullständiga månader: {review.tb >= review.previous.tb ? '+' : '−'}{fmtMoney(Math.abs(review.tb-review.previous.tb))} TB.</small> : <small>Inte direkt jämförbart: vald eller föregående månad är öppen/ofullständigt registrerad.</small>}</div> : <div className="review-compare"><span>FÖREGÅENDE MÅNAD</span><small>Ingen jämförbar registrerad period hittades.</small></div>}
      </section>
    </div>

    <section className="c review-halves"><div className="mission-section-top"><div><div className="mission-eyebrow">MONTH DEVELOPMENT</div><h2>Första och andra halvan</h2></div></div><div className="review-halves-grid"><div><span>DAG 1–15</span><b>{fmtMoney(review.first.tb)}</b><small>{review.first.sales} försäljningar · {review.first.days} registrerade dagar</small></div><div><span>DAG 16–SLUT</span><b>{fmtMoney(review.second.tb)}</b><small>{review.second.sales} försäljningar · {review.second.days} registrerade dagar</small></div><div><span>SVAGASTE VECKA · TB</span><b>{review.biggestDropWeek ? fmtMoney(review.biggestDropWeek.tb) : '—'}</b><small>{review.biggestDropWeek ? `${review.biggestDropWeek.key} · ${review.biggestDropWeek.days} registrerade dagar` : 'Minst två veckor krävs för trend.'}</small></div></div></section>

    <section className="c review-ai"><div><div className="mission-eyebrow">NEXT-MONTH ACTION</div><h2>Monthly Autopsy</h2><p>Den deterministiska sammanställningen ovan är alltid tillgänglig. AI:n får samma registrerade perioddata och ska skilja fakta från osäkerhet.</p><div className="review-ai-basis">Uppnådda fasta nivåer: <b>{targetReached}/3</b> · Underlag: <b>{review.dateRows.length}</b> registrerade dagar.</div></div><button type="button" className="b pri" disabled={!aiEnabled || !review.dateRows.length} onClick={() => onOpenAi(question)}>✦ Skapa AI-genomgång</button></section>
  </div>;
}
