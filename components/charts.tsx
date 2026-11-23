'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { fmt } from '@/lib/calc';

export type TrendPoint = { label: string; value: number | null; sub?: string };

const TONES = {
  mint: ['#8ff7dc', '#14b8a6', 'rgba(94,234,212,'],
  ice: ['#bae6fd', '#0284c7', 'rgba(125,211,252,'],
  gold: ['#fde68a', '#d97706', 'rgba(245,194,107,'],
  violet: ['#ddd6fe', '#7c3aed', 'rgba(167,139,250,'],
} as const;

/**
 * Smooth area + line chart with an optional dashed goal line and hover tooltip.
 * Null points break the line (a missing day is a gap, never a zero).
 */
export function TrendChart({
  points,
  goal,
  height = 170,
  tone = 'mint',
  format = fmt,
  goalLabel = 'Mål',
  unit = '',
  ariaLabel,
}: {
  points: TrendPoint[];
  goal?: number;
  height?: number;
  tone?: keyof typeof TONES;
  format?: (n: number) => string;
  goalLabel?: string;
  unit?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const id = useId().replace(/:/g, '');
  const [c0, c1, cRgb] = TONES[tone];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { l: 6, r: 10, t: 18, b: 24 };
  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = Math.max(10, height - pad.t - pad.b);
  const n = points.length;
  const max = Math.max(1, ...points.map((p) => p.value ?? 0), goal ?? 0) * 1.15;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (Math.max(0, v) / max) * ih;

  const { linePaths, areaPaths, segments } = useMemo(() => {
    const segs: number[][] = [];
    let cur: number[] = [];
    points.forEach((p, i) => {
      if (p.value == null) {
        if (cur.length) segs.push(cur);
        cur = [];
      } else cur.push(i);
    });
    if (cur.length) segs.push(cur);
    const lines: string[] = [];
    const areas: string[] = [];
    for (const seg of segs) {
      if (!seg.length) continue;
      let d = `M${x(seg[0])},${y(points[seg[0]].value!)}`;
      for (let k = 1; k < seg.length; k++) {
        const a = seg[k - 1];
        const b = seg[k];
        const mx = (x(a) + x(b)) / 2;
        d += ` C${mx},${y(points[a].value!)} ${mx},${y(points[b].value!)} ${x(b)},${y(points[b].value!)}`;
      }
      lines.push(d);
      const base = pad.t + ih;
      areas.push(`${d} L${x(seg[seg.length - 1])},${base} L${x(seg[0])},${base} Z`);
    }
    return { linePaths: lines, areaPaths: areas, segments: segs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, goal, w, height]);

  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 46))));
  const goalY = goal != null ? y(goal) : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!n) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const t = Math.max(0, Math.min(1, (px - pad.l) / iw));
    const i = Math.round(t * (n - 1));
    setHover(i);
  }

  const hp = hover != null ? points[hover] : null;
  const tipLeft = hover != null ? Math.max(44, Math.min(w - 44, x(hover))) : 0;

  return (
    <div className={`chart ${w ? '' : 'chart-measure'}`} ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel || 'Trend'} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`tg${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c0} stopOpacity="0.55" />
              <stop offset="60%" stopColor={c1} stopOpacity="0.14" />
              <stop offset="100%" stopColor={c1} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`tl${id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c0} />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} stroke="rgba(255,255,255,.06)" strokeDasharray="2 5" />
          ))}
          <line x1={pad.l} x2={w - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="rgba(255,255,255,.1)" />
          {areaPaths.map((d, i) => (
            <path key={`a${i}`} d={d} fill={`url(#tg${id})`} />
          ))}
          {goalY != null && (
            <>
              <line x1={pad.l} x2={w - pad.r} y1={goalY} y2={goalY} stroke="rgba(245,194,107,.55)" strokeDasharray="4 5" />
              <text x={w - pad.r} y={goalY - 5} textAnchor="end" fontSize="9.5" fill="rgba(245,194,107,.85)" letterSpacing=".04em">
                {goalLabel} {format(goal!)}
              </text>
            </>
          )}
          {linePaths.map((d, i) => (
            <path key={`l${i}`} d={d} fill="none" stroke={`url(#tl${id})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${cRgb}.45))` }} />
          ))}
          {points.map((p, i) =>
            p.value == null ? null : (
              <circle key={`p${i}`} cx={x(i)} cy={y(p.value)} r={hover === i ? 4.5 : 2.6} fill="#07110f" stroke={c0} strokeWidth="1.8" style={{ transition: 'r .12s' }} />
            ),
          )}
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="rgba(255,255,255,.16)" />
          )}
          {points.map((p, i) =>
            i % every === 0 || i === n - 1 ? (
              <text key={`x${i}`} x={x(i)} y={height - 7} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="9.5" fill="rgba(200,208,220,.7)">
                {p.label}
              </text>
            ) : null,
          )}
        </svg>
      )}
      {hp && hover != null && (
        <div className={`chart-tip ${tipLeft > w - 90 ? 'right' : ''}`} style={{ left: tipLeft, top: Math.max(0, (hp.value != null ? y(hp.value) : pad.t + ih) - 54) }} role="status">
          <b>{hp.value == null ? 'Ej registrerad' : `${format(hp.value)}${unit}`}</b>
          <span>{hp.label}{hp.sub ? ` · ${hp.sub}` : ''}</span>
        </div>
      )}
    </div>
  );
}

/** Last `days` calendar days (Mon–Sun inclusive of today) as chart points, including weekends as gaps. */
export function dailyPoints(entries: { entry_date: string; sales: number }[], days: number, weekday: (iso: string) => string, today: string): TrendPoint[] {
  const by = new Map(entries.map((e) => [e.entry_date, Number(e.sales || 0)]));
  const out: TrendPoint[] = [];
  const t = new Date(today + 'T12:00:00Z');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(t);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ label: weekday(iso), value: by.has(iso) ? by.get(iso)! : null });
  }
  return out;
}
