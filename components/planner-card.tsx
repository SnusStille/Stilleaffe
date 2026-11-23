'use client';

import { useMemo, useState } from 'react';
import { Icon } from './icons';
import { VERDICT_TEXT, simulateMonth, type PlannerRow } from '@/lib/analysis';
import { clamp, fmt, fmtMoney } from '@/lib/calc';

const n1 = (v: number) => v.toLocaleString('sv-SE', { maximumFractionDigits: 1 });

/**
 * "What if?" slider: sales per remaining workday → projected month result,
 * goal %, TB and a plain verdict. Presets jump to the current pace, the daily
 * goal or the pace the goal actually requires.
 */
export function PlannerCard({
  rows,
  goalSales,
  goalTb,
  dailySales,
  dailyTb,
  subject = 'du',
}: {
  rows: PlannerRow[];
  goalSales: number;
  goalTb: number;
  dailySales: number;
  dailyTb: number;
  subject?: string;
}) {
  const open = rows.reduce((s, r) => s + r.openWorkdays, 0);
  const currentSales = rows.reduce((s, r) => s + r.sales, 0);
  const days = rows.reduce((s, r) => s + r.days, 0);
  const currentAvg = days ? currentSales / days : null;
  const required = open > 0 ? Math.max(0, goalSales - currentSales) / open : null;
  const start = required != null ? Math.ceil(required * 2) / 2 : currentAvg != null ? Math.ceil(currentAvg * 2) / 2 : dailySales;
  const [perDay, setPerDay] = useState(clamp(start, 0, 30));
  const sim = useMemo(() => simulateMonth(rows, perDay, goalSales, goalTb, dailySales, dailyTb), [rows, perDay, goalSales, goalTb, dailySales, dailyTb]);
  const max = Math.max(20, Math.ceil((required ?? 0) + 6), Math.ceil(dailySales * 2));
  const v = VERDICT_TEXT[sim.verdict];

  if (open === 0) {
    return (
      <div className="card planner">
        <div className="card-head">
          <div><div className="card-kicker"><Icon name="sliders" size={11} /> PROGNOSSIMULATOR</div><h3>Vad händer om…?</h3></div>
        </div>
        <div className="card-note">Inga arbetsdagar kvar att simulera – månaden är slut eller alla dagar är registrerade.</div>
      </div>
    );
  }

  const verdictText =
    sim.verdict === 'reached'
      ? `Målet nås med ${fmt(Math.max(0, sim.sales - goalSales))} sälj att spara på.`
      : sim.verdict === 'close'
        ? `${fmt(sim.gap)} sälj från målet – höj takten lite eller ta en extra registrerad dag.`
        : `${fmt(sim.gap)} sälj kort. Dagsmålet räcker inte – det krävs ${required != null ? n1(required) : '–'} sälj per arbetsdag.`;

  return (
    <div className="card planner">
      <div className="card-head">
        <div><div className="card-kicker"><Icon name="sliders" size={11} /> PROGNOSSIMULATOR · {open} ARBETSDAGAR KVAR</div><h3>Vad händer om…?</h3></div>
        <span className={`badge planner-verdict ${sim.verdict}`}>{v.emoji} {v.label}</span>
      </div>

      <div className="planner-out">
        <div>
          <div className="card-kicker">PROGNOS · SÄLJ</div>
          <div className="planner-big">{fmt(sim.sales)}</div>
          <div className="card-note">{sim.goalPct} % av {fmt(goalSales)}</div>
        </div>
        <div>
          <div className="card-kicker">PROGNOS · TB</div>
          <div className="planner-big sm">{fmt(sim.tb / 1000)}k</div>
          <div className="card-note">{fmtMoney(sim.tb)} · {sim.tbGoalPct} % av mål</div>
        </div>
        <div className="planner-verdict-text">
          <p>{verdictText}</p>
          <span className="card-note">Idag: {fmt(sim.currentSales)} sälj · {fmtMoney(sim.currentTb)} TB</span>
        </div>
      </div>

      <div className="planner-slider">
        <div className="row-between">
          <label htmlFor="planner-range">{subject === 'du' ? 'Du säljer' : 'Varje säljare säljer'} <b>{n1(perDay)}</b> per arbetsdag</label>
          <span className="card-note">0 – {max}</span>
        </div>
        <input
          id="planner-range"
          type="range"
          min={0}
          max={max}
          step={0.5}
          value={perDay}
          onChange={(e) => setPerDay(Number(e.target.value))}
          aria-label="Sälj per arbetsdag framöver"
          style={{ ['--pct' as string]: `${(perDay / max) * 100}%` }}
        />
        <div className="planner-presets">
          {currentAvg != null && <button className="chip-btn" onClick={() => setPerDay(clamp(Math.ceil(currentAvg * 2) / 2, 0, max))}>Nuvarande snitt · {n1(currentAvg)}</button>}
          <button className="chip-btn" onClick={() => setPerDay(clamp(dailySales, 0, max))}>Dagsmål · {n1(dailySales)}</button>
          {required != null && <button className={`chip-btn ${Math.abs(perDay - Math.ceil(required * 2) / 2) < 0.01 ? 'on' : ''}`} onClick={() => setPerDay(clamp(Math.ceil(required * 2) / 2, 0, max))}>Målet kräver · {n1(required)}</button>}
        </div>
      </div>
    </div>
  );
}
