'use client';

import { addDays, dateLabel, isWorkday, todayISO, weekMonday, type Entry, type Goals } from '@/lib/calc';

export type DayState = 'today' | 'future' | 'hit' | 'miss' | 'empty' | 'weekend' | 'zero';

export function dayState(iso: string, row: Entry | undefined, goals: Goals, today: string): DayState {
  if (iso > today) return isWorkday(iso) ? 'future' : 'weekend';
  if (!isWorkday(iso)) return 'weekend';
  if (!row) return iso === today ? 'today' : 'empty';
  if (Number(row.sales) >= goals.daily_sales) return 'hit';
  if (Number(row.sales) === 0) return 'zero';
  return 'miss';
}

const STATE_TEXT: Record<DayState, string> = {
  today: 'Idag — inte registrerad än',
  future: 'Kommande arbetsdag',
  hit: 'Mål nått',
  miss: 'Under målet',
  empty: 'Ej registrerad',
  weekend: 'Helg',
  zero: 'Registrerad med 0 sälj',
};

/**
 * Monday → Sunday of the current week. Each day is a button so a seller can
 * register or correct that specific date directly from the overview.
 */
export function WeekStrip({
  entries,
  goals,
  onPick,
  today = todayISO(),
  compact = false,
}: {
  entries: Entry[];
  goals: Goals;
  onPick?: (date: string, entry: Entry | null) => void;
  today?: string;
  compact?: boolean;
}) {
  const monday = weekMonday(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const registered = days.filter((d) => d <= today && isWorkday(d) && entries.some((e) => e.entry_date === d)).length;
  const elapsed = days.filter((d) => d <= today && isWorkday(d)).length;
  const weekSales = entries.filter((e) => e.entry_date >= monday && e.entry_date <= days[6]).reduce((s, e) => s + Number(e.sales || 0), 0);

  return (
    <div className={`wstrip ${compact ? 'compact' : ''}`}>
      <div className="wstrip-head">
        <span className="card-kicker">Denna vecka</span>
        <span className="wstrip-sum">
          <b>{weekSales.toLocaleString('sv-SE')}</b> sälj · {registered}/{elapsed} registrerade
        </span>
      </div>
      <div className="wstrip-days" role="list">
        {days.map((iso) => {
          const row = entries.find((e) => e.entry_date === iso);
          const state = dayState(iso, row, goals, today);
          const clickable = !!onPick && iso <= today && isWorkday(iso);
          const dd = Number(iso.slice(8, 10));
          const pctVal = row && goals.daily_sales > 0 ? Math.min(100, Math.round((Number(row.sales) / goals.daily_sales) * 100)) : 0;
          return (
            <button
              key={iso}
              type="button"
              role="listitem"
              className={`wday s-${state} ${clickable ? 'clickable' : ''}`}
              onClick={() => clickable && onPick!(iso, row || null)}
              disabled={!clickable}
              title={`${dateLabel(iso)} — ${STATE_TEXT[state]}${row ? ` (${row.sales} sälj)` : ''}`}
              aria-label={`${dateLabel(iso)}: ${STATE_TEXT[state]}`}
            >
              <span className="wday-name">{['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'][days.indexOf(iso)].slice(0, 3)}</span>
              <span className="wday-num">{dd}</span>
              <span className="wday-val">
                {state === 'hit' || state === 'miss' || state === 'zero' ? row!.sales : state === 'weekend' ? '·' : state === 'future' ? '' : '–'}
              </span>
              {(state === 'hit' || state === 'miss' || state === 'zero') && (
                <span className="wday-bar" aria-hidden="true">
                  <i style={{ width: `${state === 'hit' ? 100 : pctVal}%` }} />
                </span>
              )}
              {state === 'today' && <span className="wday-today" aria-hidden="true">idag</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
