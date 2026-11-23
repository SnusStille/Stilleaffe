'use client';

import { useMemo, useState } from 'react';
import { heatmapGrid, type HeatCell } from '@/lib/analysis';
import { fmt, todayISO, type Entry } from '@/lib/calc';

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;

function cellTitle(c: HeatCell): string {
  if (c.future) return `${c.date}: framtid`;
  if (c.state === 'none') return `${c.date}: helg`;
  if (c.state === 'miss') return `${c.date}: ej registrerad (räknas inte)`;
  return `${c.date}: ${c.sales} sälj`;
}

/**
 * GitHub-style activity map. Levels are relative to the daily goal:
 * l1 <50 % · l2 <100 % · l3 ≥100 % · l4 ≥150 %. Missing workdays are hatched,
 * registered zero-days are grey – the two are never confused.
 */
export function HeatYear({ entries, goal, today = todayISO(), weeks: initialWeeks = 53, allowToggle = true }: { entries: Entry[]; goal: number; today?: string; weeks?: number; allowToggle?: boolean }) {
  const [weeks, setWeeks] = useState(initialWeeks);
  const grid = useMemo(() => heatmapGrid(entries, goal, weeks, today), [entries, goal, weeks, today]);
  const width = grid.columns.length * STEP - GAP;
  return (
    <div className="hy">
      {allowToggle && (
        <div className="hy-tools">
          <div className="segmented sm">
            <button className={weeks === 16 ? 'on' : ''} onClick={() => setWeeks(16)}>16 veckor</button>
            <button className={weeks === 53 ? 'on' : ''} onClick={() => setWeeks(53)}>1 år</button>
          </div>
          <span className="card-note">{grid.registered} registrerade · {grid.hits} med nått dagsmål · {fmt(grid.total)} sälj</span>
        </div>
      )}
      <div className="hy-body">
        <div className="hy-weekdays" aria-hidden="true"><span>mån</span><span>ons</span><span>fre</span></div>
        <div className="hy-wrap">
          <div style={{ width, minWidth: '100%' }}>
            <div className="hy-months" style={{ width }}>
              {grid.months.map((m) => (
                <span key={m.col} style={{ left: m.col * STEP }}>{m.label}</span>
              ))}
            </div>
            <div className="hy-grid" style={{ width, gridAutoColumns: CELL, gridTemplateRows: `repeat(7, ${CELL}px)`, gap: GAP }}>
              {grid.columns.map((col) =>
                col.cells.map((c) => (
                  <span key={c.date} className={`hy-cell ${c.state} ${c.future ? 'future' : ''}`} title={cellTitle(c)} data-date={c.date} data-sales={c.sales} />
                )),
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        <span><i className="hy-leg l1" />0–50 %</span>
        <span><i className="hy-leg l2" />50–99 %</span>
        <span><i className="hy-leg l3" />100 %+ av dagsmålet</span>
        <span><i className="hy-leg l4" />150 %+</span>
        <span><i className="hy-leg zero" />Registrerad noll</span>
        <span><i className="hy-leg miss" />Ej registrerad</span>
      </div>
    </div>
  );
}
