'use client';

import { useMemo, useState } from 'react';
import { Row, fmt, fmtMoney, f1, today } from '@/lib/calc';
import PaceMap from './PaceMap';

type MissionControlProps = {
  rows: Row[];
  onOpenAi: (question: string) => void;
  aiEnabled: boolean;
  canRegister: boolean;
  onRegister: (date: string) => void;
};

type Tier = { id: string; label: string; value: number; tone: string };
const TIERS: Tier[] = [
  { id: 'minimum', label: 'MINIMUM', value: 60_000, tone: 'minimum' },
  { id: 'target', label: 'TARGET', value: 80_000, tone: 'target' },
  { id: 'beast', label: 'BEAST MODE', value: 100_000, tone: 'beast' },
];
const moneyInput = (n: number) => Math.round(n).toLocaleString('sv-SE');
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
};
const weekday = (key: string) => {
  const d = new Date(`${key}T12:00:00`);
  return d.getDay() > 0 && d.getDay() < 6;
};
const mondayKey = (key: string) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function dateKeysForMonth(key: string) {
  const [year, month] = key.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => `${key}-${String(i + 1).padStart(2, '0')}`);
}

export default function MissionControl({ rows, onOpenAi, aiEnabled, canRegister, onRegister }: MissionControlProps) {
  const now = today();
  const currentMonth = now.slice(0, 7);
  // Ahead of November, open the November plan by default; the month picker keeps October available.
  const launchMonth = currentMonth.endsWith('-10') && now.slice(8) >= '25'
    ? `${currentMonth.slice(0, 4)}-11` : currentMonth;
  const [month, setMonth] = useState(launchMonth);
  const [tierId, setTierId] = useState('target');
  const [scenarioSales, setScenarioSales] = useState(3);
  const [scenarioTb, setScenarioTb] = useState(900);
  const [extraDays, setExtraDays] = useState(0);
  const [finalWeek, setFinalWeek] = useState(0);

  const monthOptions = useMemo(() => {
    const values = new Set(rows.map((r) => r.entry_date.slice(0, 7)));
    values.add(currentMonth);
    const [y, m] = currentMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    values.add(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    return [...values].sort().slice(-14);
  }, [rows, currentMonth]);

  const data = useMemo(() => {
    const keys = dateKeysForMonth(month);
    const first = keys[0];
    const last = keys[keys.length - 1];
    const monthRows = rows.filter((r) => r.entry_date >= first && r.entry_date <= last);
    const workdays = keys.filter(weekday);
    const elapsed = workdays.filter((d) => d <= now).length;
    const remaining = workdays.filter((d) => d >= now).length;
    const monthTb = monthRows.reduce((n, r) => n + Number(r.tb_sek || 0), 0);
    const monthSales = monthRows.reduce((n, r) => n + Number(r.sales || 0), 0);
    const registeredDays = new Set(monthRows.filter((r) => weekday(r.entry_date) && r.entry_date <= now).map((r) => r.entry_date)).size;
    const completeness = elapsed ? registeredDays / elapsed : 0;
    const historicForAverage = rows.filter((r) => r.entry_date < first && r.sales > 0);
    const historicSales = historicForAverage.reduce((n, r) => n + Number(r.sales), 0);
    const avgTbPerSale = monthSales > 0
      ? monthTb / monthSales
      : historicSales > 0 ? historicForAverage.reduce((n, r) => n + Number(r.tb_sek), 0) / historicSales : 0;
    const avgTbPerSaleBasis = monthSales > 0 ? 'period' : historicSales > 0 ? 'history' : 'none';
    const hunterTodayRow = rows.find((r) => r.entry_date === now);
    const todayRow = month === now.slice(0, 7) ? hunterTodayRow : undefined;
    const planDaysRemaining = Math.max(0, remaining - (todayRow && weekday(now) ? 1 : 0));
    const currentWeek = mondayKey(now);
    const thisWeekRows = rows.filter((r) => mondayKey(r.entry_date) === currentWeek);
    const weekSales = thisWeekRows.reduce((n, r) => n + Number(r.sales), 0);
    const weekTb = thisWeekRows.reduce((n, r) => n + Number(r.tb_sek), 0);
    const weekStartDate = new Date(`${currentWeek}T12:00:00`);
    const elapsedWeekdays = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStartDate); d.setDate(d.getDate() + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }).filter((d) => d <= now).length;
    const registeredWeekdays = new Set(thisWeekRows.filter((r) => weekday(r.entry_date) && r.entry_date <= now).map((r) => r.entry_date)).size;
    const currentWeekComplete = elapsedWeekdays > 0 && registeredWeekdays === elapsedWeekdays;
    const weekMap = new Map<string, { sales: number; tb: number; registeredWeekdays: Set<string> }>();
    for (const row of rows) {
      const k = mondayKey(row.entry_date);
      const item = weekMap.get(k) || { sales: 0, tb: 0, registeredWeekdays: new Set<string>() };
      item.sales += Number(row.sales || 0);
      item.tb += Number(row.tb_sek || 0);
      if (weekday(row.entry_date)) item.registeredWeekdays.add(row.entry_date);
      weekMap.set(k, item);
    }
    const historicalWeeks = [...weekMap.entries()].filter(([key, value]) => key < currentWeek && value.registeredWeekdays.size === 5);
    const bestWeek = historicalWeeks.reduce<{ key: string; sales: number; tb: number } | null>((best, [key, value]) =>
      !best || value.sales > best.sales ? { key, ...value } : best, null);
    const bestWeekTb = historicalWeeks.reduce<{ key: string; sales: number; tb: number } | null>((best, [key, value]) =>
      !best || value.tb > best.tb ? { key, ...value } : best, null);
    const bestDay = rows.filter((r) => r.entry_date !== now).reduce<Row | null>((best, row) => !best || row.sales > best.sales ? row : best, null);
    const bestTbDay = rows.filter((r) => r.entry_date !== now).reduce<Row | null>((best, row) => !best || row.tb_sek > best.tb_sek ? row : best, null);
    const bestTbPerSale = rows.filter((r) => r.sales > 0 && r.entry_date !== now).reduce<Row | null>((best, row) =>
      !best || row.tb_sek / row.sales > best.tb_sek / best.sales ? row : best, null);
    const bestMonth = [...new Set(rows.filter((r) => r.entry_date.slice(0, 7) < currentMonth).map((r) => r.entry_date.slice(0, 7)))].map((m) => {
      const monthKeys = dateKeysForMonth(m);
      const expectedWorkdays = monthKeys.filter(weekday).length;
      const monthEntries = rows.filter((r) => r.entry_date.startsWith(m));
      const registeredWorkdays = new Set(monthEntries.filter((r) => weekday(r.entry_date)).map((r) => r.entry_date)).size;
      return { month: m, tb: monthEntries.reduce((n, r) => n + Number(r.tb_sek), 0), complete: expectedWorkdays > 0 && registeredWorkdays === expectedWorkdays };
    }).filter((item) => item.complete).reduce<{ month: string; tb: number } | null>((best, item) => !best || item.tb > best.tb ? { month: item.month, tb: item.tb } : best, null);
    const targetIsFuture = first > now;
    const targetIsPast = last < now;
    const enoughForForecast = !targetIsFuture && !targetIsPast && elapsed > 0 && registeredDays >= Math.min(3, elapsed) && completeness >= 0.7;
    const projection = targetIsPast ? monthTb : enoughForForecast && registeredDays > 0 ? monthTb / registeredDays * workdays.length : null;
    return {
      monthRows, monthTb, monthSales, workdays: workdays.length, elapsed, remaining, planDaysRemaining,
      registeredDays, completeness, avgTbPerSale, avgTbPerSaleBasis, todayRow, hunterTodayRow, weekSales, weekTb, currentWeekComplete,
      bestWeek, bestWeekTb, bestDay, bestTbDay, bestTbPerSale, bestMonth, projection,
      targetIsFuture, targetIsPast,
    };
  }, [rows, month, now]);

  const tier = TIERS.find((item) => item.id === tierId) || TIERS[1];
  const gap = Math.max(0, tier.value - data.monthTb);
  const perWorkday = data.planDaysRemaining > 0 ? gap / data.planDaysRemaining : 0;
  const salesNeededToday = data.avgTbPerSale > 0 ? Math.ceil(perWorkday / data.avgTbPerSale) : null;
  const idealToDate = data.workdays ? tier.value * data.elapsed / data.workdays : 0;
  const paceGap = data.monthTb - idealToDate;
  const requiredRatio = data.planDaysRemaining > 0 && tier.value > data.monthTb
    ? (gap / data.planDaysRemaining) / (tier.value / Math.max(data.workdays, 1))
    : data.monthTb >= tier.value ? 0 : Infinity;
  const pressure = data.targetIsFuture ? 'UPCOMING'
    : data.monthTb >= tier.value ? 'TARGET HIT'
      : data.targetIsPast || data.planDaysRemaining === 0 ? 'MONTH CLOSED'
        : requiredRatio <= 1.08 ? 'ON TRACK'
          : requiredRatio <= 1.5 ? 'CATCH UP' : 'HIGH PRESSURE';
  const forecastUsable = data.projection !== null;
  const forecastCopy = data.targetIsFuture ? 'Månaden har inte börjat.'
    : data.targetIsPast ? 'Slutresultat · månaden är stängd.'
      : forecastUsable ? `${data.registeredDays} registrerade vardagar av ${data.elapsed} hittills.`
        : `Prognos döljs: underlaget är tunt (${data.registeredDays}/${data.elapsed} passerade vardagar registrerade).`;
  const observedAvg = data.avgTbPerSale > 0 ? data.avgTbPerSale : null;
  const simulatedWorkdays = data.planDaysRemaining + extraDays;
  const simulatedOutcome = data.monthTb + simulatedWorkdays * scenarioSales * scenarioTb + finalWeek;
  const activeTier = [...TIERS].reverse().find((item) => data.monthTb >= item.value)?.id || null;
  const nextTier = TIERS.find((item) => item.value > data.monthTb) || null;
  const recordDaySalesGap = data.bestDay && data.hunterTodayRow ? Math.max(0, data.bestDay.sales + 1 - data.hunterTodayRow.sales) : null;
  const recordDayTbGap = data.bestTbDay && data.hunterTodayRow ? Math.max(0, data.bestTbDay.tb_sek + 1 - data.hunterTodayRow.tb_sek) : null;
  const meterProgress = data.targetIsFuture || data.targetIsPast || data.planDaysRemaining === 0 || gap === 0
    ? 0 : Math.min(100, Number.isFinite(requiredRatio) ? requiredRatio / 2 * 100 : 100);
  const weekRecordGap = data.bestWeek && data.currentWeekComplete ? Math.max(0, data.bestWeek.sales + 1 - data.weekSales) : null;
  const askedForNextTier = data.monthTb < tier.value ? tier.value : nextTier?.value || tier.value;

  return <div className="mission-page">
    <header className="mission-header">
      <div>
        <div className="mission-eyebrow"><span className="mission-live-dot"/> STILLEAFFE · PERFORMANCE DESK</div>
        <h1>Mission Control</h1>
        <p>En rak lägesbild, beräknad från registrerade siffror.</p>
      </div>
      <label className="mission-month-picker"><span>PERIOD</span>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Välj månad">
          {monthOptions.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
        </select>
      </label>
    </header>

    <section className={`mission-hero c mission-pressure-${pressure.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="mission-hero-top">
        <div><div className="mission-eyebrow">{monthLabel(month)} · TB COMMAND</div><h2>Månadens läge</h2></div>
        <div className={`pressure-pill pressure-${pressure.toLowerCase().replaceAll(' ', '-')}`}><span/>{pressure}</div>
      </div>
      <div className="mission-score-row">
        <div className="mission-score"><span>REGISTRERAT TB</span><strong>{fmtMoney(data.monthTb)}</strong><small>{data.monthSales} försäljningar · {data.monthRows.length} registrerade dagar</small></div>
        <div className="mission-score-side"><span>PROGNOS VID NUVARANDE REGISTRERINGSTAKT</span><strong>{forecastUsable ? fmtMoney(data.projection!) : '—'}</strong><small>{forecastCopy}</small></div>
      </div>
      <div className="mission-tier-list" aria-label="Framsteg mot samtliga TB-mål">
        {TIERS.map((item) => {
          const reached = data.monthTb >= item.value;
          const progress = Math.min(100, data.monthTb / item.value * 100);
          return <button type="button" key={item.id} className={`mission-tier ${item.tone} ${tierId === item.id ? 'selected' : ''}`} onClick={() => setTierId(item.id)} aria-pressed={tierId === item.id}>
            <span className="mission-tier-head"><b>{item.label}</b><strong>{fmtMoney(item.value)}</strong></span>
            <span className="mission-track"><i style={{ width: `${progress}%` }}/></span>
            <span className="mission-tier-foot"><span>{Math.round(progress)}% uppnått</span><b>{reached ? 'UPPNÅTT' : `${fmtMoney(item.value - data.monthTb)} kvar`}</b></span>
          </button>;
        })}
      </div>
      <div className="mission-hero-footer">
        <div><span>KVAR TILL VALT MÅL</span><b>{fmtMoney(gap)}</b></div>
        <div><span>ARBETSdagar kvar</span><b>{data.targetIsPast ? '0' : fmt(data.remaining)}</b></div>
        <div><span>REGISTRERINGSTÄCKNING</span><b>{data.targetIsFuture ? 'Kommande period' : `${data.registeredDays}/${data.elapsed} vardagar`}</b></div>
      </div>
    </section>

    <PaceMap month={month} rows={rows} asOf={now} canRegister={canRegister} onRegister={onRegister}/>

    <div className="mission-grid">
      <section className="c mission-plan">
        <div className="mission-section-top"><div><div className="mission-eyebrow">DAILY BATTLE PLAN</div><h2>{data.targetIsFuture ? 'Startplan' : 'Dagens takt'}</h2></div><span className="mission-section-icon">↗</span></div>
        {<>
            <div className="mission-daily-number"><strong>{data.planDaysRemaining > 0 ? fmtMoney(perWorkday) : '—'}</strong><span>TB per arbetsdag för {tier.label}</span></div>
            <div className="mission-plan-grid">
              <div><span>FÖRSÄLJNINGAR / DAG</span><b>{data.targetIsPast || data.remaining === 0 ? '—' : salesNeededToday == null ? 'Saknar TB-snitt' : `≈ ${fmt(salesNeededToday)}`}</b></div>
              <div><span>{data.avgTbPerSaleBasis === 'history' ? 'TB / SÄLJ · HISTORIK' : 'TB / FÖRSÄLJNING'}</span><b>{observedAvg == null ? 'Saknar underlag' : fmtMoney(observedAvg)}</b></div>
              <div><span>MOT JÄMN PLAN</span><b className={paceGap >= 0 ? 'mission-positive' : 'mission-negative'}>{paceGap >= 0 ? '+' : '−'}{fmtMoney(Math.abs(paceGap))}</b></div>
              <div><span>DAGENS REGISTRERING</span><b>{data.targetIsFuture ? 'Perioden har inte startat' : data.todayRow ? `${fmtMoney(data.todayRow.tb_sek)} · ${data.todayRow.sales} sälj` : 'Saknas — ej noll'}</b></div>
            </div>
            <p className="mission-recommendation">
              {data.targetIsFuture ? `Startplan: ${fmtMoney(perWorkday)} TB per arbetsdag under ${data.remaining} arbetsdagar${salesNeededToday == null ? '.' : ` (cirka ${fmt(salesNeededToday)} försäljningar per dag vid historiskt snitt).`}`
                : data.targetIsPast ? 'Månaden är avslutad. Slutresultatet jämförs ovan.'
                : gap <= 0 ? `Målet ${tier.label} är nått. ${nextTier ? `Nästa nivå är ${nextTier.label}: ${fmtMoney(nextTier.value - data.monthTb)} kvar.` : 'Alla tre nivåer är passerade.'}`
                  : data.planDaysRemaining === 0 ? `${fmtMoney(gap)} saknas, men inga arbetsdagar återstår för ny produktion i den valda månaden.`
                    : `För att nå ${tier.label}: sikta på ${fmtMoney(perWorkday)} TB per återstående produktionsdag${salesNeededToday == null ? '.' : `, cirka ${fmt(salesNeededToday)} avslut per dag vid ditt ${data.avgTbPerSaleBasis === 'history' ? 'historiska' : 'registrerade'} TB-snitt.`}${data.todayRow ? ` Dagens registrering är redan medräknad (${fmtMoney(data.todayRow.tb_sek)} TB).` : ''}`}
            </p>
            <div className="mission-plan-meta"><span>{data.targetIsFuture ? 'STARTSTATUS' : 'PLANSTATUS'}</span><b className={`mission-status-text pressure-text-${pressure.toLowerCase().replaceAll(' ', '-')}`}>{pressure}</b><span>{data.targetIsFuture ? `Riktmärke: ${fmtMoney(perWorkday)} per arbetsdag.` : `${paceGap >= 0 ? 'Över' : 'Under'} jämn plan med ${fmtMoney(Math.abs(paceGap))}`}</span></div>
          </>}
      </section>

      <section className="c mission-reality">
        <div className="mission-section-top"><div><div className="mission-eyebrow">THE REALITY CHECK</div><h2>Vad krävs?</h2></div><span className="mission-section-icon">⌁</span></div>
        <div className="mission-reality-main"><strong>{fmtMoney(gap)}</strong><span>saknas till {tier.label}</span></div>
        <div className="mission-pressure-meter" role="meter" aria-label="Nödvändigt tempo" aria-valuemin={0} aria-valuemax={200} aria-valuenow={Number.isFinite(requiredRatio) ? Math.min(200, Math.round(requiredRatio * 100)) : 200}>
          <i className="mission-meter-baseline"/><i className="mission-meter-fill" style={{ width: `${meterProgress}%` }}/>
          <span className="mission-meter-pin" style={{ left: '50%' }}/>
        </div>
        <div className="mission-meter-labels"><span>0×</span><span>Normal takt · 1×</span><span>2×+</span></div>
        <p>{data.targetIsFuture ? 'Målet är förberett för nästa period.' : data.planDaysRemaining > 0 && gap > 0
          ? `Nödvändig takt är ${f1(requiredRatio)}× normal månadstakt (${fmtMoney(perWorkday)} per arbetsdag). ${paceGap < 0 ? `Du ligger ${fmtMoney(Math.abs(paceGap))} under jämn plan.` : `Du ligger ${fmtMoney(paceGap)} över jämn plan.`}`
          : data.planDaysRemaining === 0 && gap > 0 ? 'Tiden för att nå målet inom den valda månaden har gått ut.' : 'Ingen extra produktion krävs för den valda nivån.'}</p>
        <div className="mission-data-note">{data.targetIsFuture ? 'Kommande period · ingen registrerad data förutsätts.' : `Underlag: ${data.monthRows.length} registrerade datum. Frånvaro räknas inte som nollförsäljning.`}</div>
      </section>
    </div>

    <section className="c mission-simulator">
      <div className="mission-section-top"><div><div className="mission-eyebrow">FUTURE PROJECTION · WHAT IF</div><h2>Testa ett scenario</h2></div><span className="mission-section-icon">◌</span></div>
      <p className="mission-intro">Simuleringen är privat i den här vyn och påverkar inte din försäljningshistorik.</p>
      <div className="mission-sim-layout">
        <div className="mission-controls">
          <label><span><b>Försäljningar per dag</b><output>{scenarioSales}</output></span><input type="range" min="0" max="12" step="1" value={scenarioSales} onChange={(e) => setScenarioSales(Number(e.target.value))}/></label>
          <label><span><b>TB per försäljning</b><output>{fmtMoney(scenarioTb)}</output></span><input type="range" min="100" max="3000" step="50" value={scenarioTb} onChange={(e) => setScenarioTb(Number(e.target.value))}/></label>
          <label><span><b>Extra arbetsdagar</b><output>+{extraDays}</output></span><input type="range" min="0" max="10" step="1" value={extraDays} onChange={(e) => setExtraDays(Number(e.target.value))}/></label>
          <label><span><b>Stark sista vecka · extra TB</b><output>+{fmtMoney(finalWeek)}</output></span><input type="range" min="0" max="30000" step="500" value={finalWeek} onChange={(e) => setFinalWeek(Number(e.target.value))}/></label>
        </div>
        <div className="mission-sim-result">
          <span>SIMULERAT MÅNADSSLUT</span><strong>{fmtMoney(simulatedOutcome)}</strong>
          <div className="mission-sim-bar"><i style={{ width: `${Math.min(100, simulatedOutcome / tier.value * 100)}%` }}/></div>
          <b className={simulatedOutcome >= tier.value ? 'mission-positive' : 'mission-negative'}>{simulatedOutcome >= tier.value ? `Målet nås · ${fmtMoney(simulatedOutcome - tier.value)} över` : `${fmtMoney(tier.value - simulatedOutcome)} under ${tier.label}`}</b>
          <small>{simulatedWorkdays} dagar × {scenarioSales} försäljningar × {fmtMoney(scenarioTb)} TB + {fmtMoney(finalWeek)} sista veckan</small>
          <small className="mission-scenario-context">Startvärde: {fmtMoney(data.monthTb)} registrerat TB. Nuvarande TB-snitt/försäljning: {observedAvg ? fmtMoney(observedAvg) : 'saknas'}.</small>
        </div>
      </div>
    </section>

    <section className="c mission-records">
      <div className="mission-section-top"><div><div className="mission-eyebrow">PERSONAL BEST HUNTER</div><h2>Rekord inom räckhåll</h2></div><span className="mission-section-icon">⌖</span></div>
      <div className="mission-record-grid">
        <div><span>DAGENS SÄLJREKORD</span><b>{data.bestDay ? `${data.bestDay.sales} · ${data.bestDay.entry_date}` : 'Inget rekord än'}</b><small>{!data.bestDay ? 'Samla första registreringen.' : !data.hunterTodayRow ? 'Dagens registrering saknas; avståndet är okänt.' : recordDaySalesGap === 0 ? 'Dagsrekordet är slaget.' : `Behövs ${recordDaySalesGap} försäljningar idag för att slå rekordet.`}</small></div>
        <div><span>DAGENS TB-REKORD</span><b>{data.bestTbDay ? `${fmtMoney(data.bestTbDay.tb_sek)} · ${data.bestTbDay.entry_date}` : 'Inget rekord än'}</b><small>{!data.bestTbDay ? 'Samla första registreringen.' : !data.hunterTodayRow ? 'Dagens registrering saknas; avståndet är okänt.' : recordDayTbGap === 0 ? 'TB-rekordet är slaget.' : `Behövs ${fmtMoney(recordDayTbGap)} mer idag för att slå rekordet.`}</small></div>
        <div><span>VECKANS SÄLJREKORD</span><b>{data.bestWeek ? `${data.bestWeek.sales} · veckan ${data.bestWeek.key}` : 'Inget rekord än'}</b><small>{!data.bestWeek ? 'Samla första registreringen.' : !data.currentWeekComplete ? 'Veckans passerade vardagar saknar full registrering; avståndet visas inte.' : weekRecordGap === 0 ? 'Veckorekordet är slaget.' : `Behövs ${weekRecordGap} försäljningar den här veckan för att slå rekordet.`}</small></div>
        <div><span>BÄSTA VECKA · TB</span><b>{data.bestWeekTb ? `${fmtMoney(data.bestWeekTb.tb)} · veckan ${data.bestWeekTb.key}` : 'Inget rekord än'}</b><small>Historiskt högsta TB under en registrerad kalendervecka.</small></div>
        <div><span>HÖGSTA TB / FÖRSÄLJNING</span><b>{data.bestTbPerSale ? `${fmtMoney(data.bestTbPerSale.tb_sek / data.bestTbPerSale.sales)} · ${data.bestTbPerSale.entry_date}` : 'Inget underlag'}</b><small>Högsta registrerade TB dividerat med försäljningar den dagen.</small></div>
        <div><span>BÄSTA MÅNAD · TB</span><b>{data.bestMonth ? `${fmtMoney(data.bestMonth.tb)} · ${monthLabel(data.bestMonth.month)}` : 'Inget rekord än'}</b><small>Högsta TB i en historisk månad med registrering för varje vardag.</small></div>
      </div>
      <div className="mission-next-tier">{activeTier ? <span>Uppnådd nivå: <b>{TIERS.find((t) => t.id === activeTier)?.label}</b></span> : <span>Ingen nivå uppnådd ännu i perioden.</span>}{nextTier && <span>Nästa nivå: <b>{nextTier.label}</b> · {fmtMoney(nextTier.value - data.monthTb)} kvar</span>}</div>
    </section>

    <div className="mission-bottom-actions">
      <div><span className="mission-eyebrow">AI SALES ANALYST</span><p>{aiEnabled ? 'Fråga om din senaste vecka, utveckling över tid eller nästa mål. Analysen bygger på dina registreringar.' : 'AI är inte aktiverad. Beräkningarna och simulatorn fungerar ändå utan AI.'}</p></div>
      <button type="button" className="b pri" disabled={!aiEnabled} onClick={() => onOpenAi(`Analysera min prestation för ${monthLabel(month)}. Jämför registrerade veckor och månader, visa bästa veckodag och TB per försäljning. Ange datatäckning och markera uttryckligen vad som saknas. Berätta konkret vad som krävs för ${askedForNextTier.toLocaleString('sv-SE')} kr TB.`)}>✦ Öppna AI-analytikern</button>
    </div>
  </div>;
}
