'use client';

import type { CSSProperties } from 'react';
import { buildPaceSeries, type PaceDay } from '@/lib/pace-chart';
import { fmtMoney } from '@/lib/calc';

const TIERS = [
  { key: 'minimumPace', label: '60k MINIMUM', color: '#91a1ad' },
  { key: 'targetPace', label: '80k TARGET', color: '#58d4ab' },
  { key: 'beastPace', label: '100k BEAST MODE', color: '#e3c279' },
] as const;

function pathFor(points: PaceDay[], value: 'minimumPace' | 'targetPace' | 'beastPace', x: (day: number) => number, y: (amount: number) => number) {
  return points.map((point, index) => `${index ? 'L' : 'M'}${x(point.dayOfMonth).toFixed(1)},${y(point[value]).toFixed(1)}`).join(' ');
}

export default function PaceMap({ month, rows, asOf, canRegister = false, onRegister }: { month: string; rows: Parameters<typeof buildPaceSeries>[1]; asOf: string; canRegister?: boolean; onRegister?: (date: string) => void }) {
  const series = buildPaceSeries(month, rows, asOf);
  const width = 1000, height = 300;
  const left = 58, right = 24, top = 22, bottom = 48;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const maxActual = Math.max(0, ...series.points.map((point) => point.cumulativeTb || 0));
  const futureWorkdays = Math.max(0, series.totalWorkdays - series.registeredWorkdays - series.missingWorkdays);
  const missingPoints = series.points.filter((point) => point.status === 'missing');
  const maxValue = Math.max(110_000, Math.ceil(maxActual * 1.08 / 10_000) * 10_000);
  const x = (day: number) => left + ((day - 1) / Math.max(series.points.length - 1, 1)) * plotWidth;
  const y = (amount: number) => top + (1 - amount / maxValue) * plotHeight;
  const targetPaths = TIERS.map((tier) => ({ ...tier, d: pathFor(series.points, tier.key, x, y) }));
  const actualSegments: PaceDay[][] = [];
  let segment: PaceDay[] = [];
  for (const point of series.points) {
    if (point.status === 'registered' && point.cumulativeTb != null) segment.push(point);
    else if (point.status === 'missing' || point.status === 'future') {
      if (segment.length) actualSegments.push(segment);
      segment = [];
    }
  }
  if (segment.length) actualSegments.push(segment);
  const actualPaths = actualSegments.filter((points) => points.length > 1).map((points) =>
    points.map((point, index) => `${index ? 'L' : 'M'}${x(point.dayOfMonth).toFixed(1)},${y(point.cumulativeTb || 0).toFixed(1)}`).join(' '));
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  const dayLabels = [...new Set([1, Math.ceil(series.points.length / 2), series.points.length])];

  return <section className="c pace-map" aria-labelledby="pace-map-title">
    <div className="pace-map-head">
      <div><div className="mission-eyebrow">PACE MAP · {monthLabel.toUpperCase()}</div><h2 id="pace-map-title">Registrerad TB mot plan</h2></div>
      <span className="pace-map-summary">{series.registeredWorkdays} reg · {series.missingWorkdays} saknas · {futureWorkdays} kvar</span>
    </div>
    <p className="pace-map-note">Mållinjerna visar jämn arbetsdagstakt. Faktiska punkter bygger bara på registrerade dagar; kryss betyder saknad vardagsrad och bryter linjen — aldrig noll.</p>
    <div className="pace-map-legend" aria-label="Diagramförklaring">
      <span><i className="pace-legend-actual"/>Registrerad TB</span>
      {TIERS.map((tier) => <span key={tier.key}><i style={{ '--legend-color': tier.color } as CSSProperties}/> {tier.label}</span>)}
      <span><i className="pace-legend-missing">×</i>Saknad rad</span>
    </div>
    <div className="pace-map-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="pace-map-title pace-map-desc">
        <desc id="pace-map-desc">{monthLabel}. {series.registeredWorkdays} registrerade av {series.totalWorkdays} vardagar. {series.missingWorkdays} saknade arbetsdagsrader visas som kryss, inte som noll. Mållinjer är jämn takt mot 60 000, 80 000 och 100 000 kronor.</desc>
        {[0, 60_000, 80_000, 100_000].filter((tick) => tick <= maxValue).map((tick) => <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? 'pace-grid-zero' : 'pace-grid-line'}/>
          <text x={left - 9} y={y(tick) + 3} textAnchor="end" className="pace-axis-label">{tick === 0 ? '0' : `${tick / 1000}k`}</text>
        </g>)}
        {targetPaths.map((line) => <path key={line.key} d={line.d} fill="none" stroke={line.color} className="pace-target-line" strokeDasharray="5 7"/>)}
        {actualPaths.map((d, index) => <path key={index} d={d} fill="none" className="pace-actual-line"/>)}
        {series.points.filter((point) => point.status === 'registered').map((point) => <circle key={point.date} cx={x(point.dayOfMonth)} cy={y(point.cumulativeTb || 0)} r="4.2" className="pace-actual-dot">
          <title>{point.date}: {fmtMoney(point.cumulativeTb || 0)} registrerat TB kumulativt</title>
        </circle>)}
        {series.points.filter((point) => point.status === 'missing').map((point) => <text key={point.date} x={x(point.dayOfMonth)} y={top + plotHeight - 5} textAnchor="middle" className="pace-missing-mark">
          <title>{point.date}: saknad vardagsrad; faktisk nivå okänd, inte noll</title>×
        </text>)}
        {dayLabels.map((day) => <text key={day} x={x(day)} y={height - 15} textAnchor="middle" className="pace-axis-label">{String(day).padStart(2, '0')}</text>)}
      </svg>
    </div>
    {series.registeredWorkdays === 0 && <p className="pace-map-empty">Inga registrerade vardagar i den här perioden ännu. Endast riktmärken visas.</p>}
    {missingPoints.length > 0 && <div className="pace-missing-panel" aria-label="Saknade vardagsregistreringar">
      <div><b>{missingPoints.length} vardagar utan registrering</b><small>{canRegister ? 'Okänt utfall — välj en dag för att lägga in de faktiska siffrorna.' : 'Okänt utfall — luckorna visas för Stille att komplettera.'}</small></div>
      {canRegister && <div className="pace-missing-actions">{missingPoints.slice(0, 5).map((point) => <button key={point.date} type="button" className="b sm" onClick={() => onRegister?.(point.date)} aria-label={`Registrera faktiska siffror för ${point.date}`}>＋ {point.date}</button>)}{missingPoints.length > 5 && <small>+{missingPoints.length - 5} fler</small>}</div>}
    </div>}
    <div className="sr-only"><table><caption>{monthLabel} pace map. Actual registered TB only; missing workdays are not treated as zero.</caption><thead><tr><th>Datum</th><th>Datastatus</th><th>Kumulativt registrerat TB</th><th>60k jämn takt</th><th>80k jämn takt</th><th>100k jämn takt</th></tr></thead><tbody>{series.points.map((point) => <tr key={point.date}><th>{point.date}</th><td>{point.status === 'missing' ? 'Saknas, okänt värde' : point.status === 'registered' ? 'Registrerad' : point.status === 'future' ? 'Framtida' : 'Helg'}</td><td>{point.cumulativeTb == null ? '—' : fmtMoney(point.cumulativeTb)}</td><td>{fmtMoney(point.minimumPace)}</td><td>{fmtMoney(point.targetPace)}</td><td>{fmtMoney(point.beastPace)}</td></tr>)}</tbody></table></div>
  </section>;
}
