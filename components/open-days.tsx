'use client';

import { useMemo } from 'react';
import { Icon } from './icons';
import { openWorkdays } from '@/lib/analysis';
import { dateLabelShort, isWorkday, todayISO, type Entry } from '@/lib/calc';

/**
 * Nudge for recent workdays without a registration. Renders nothing when the
 * seller is fully caught up – the dashboard should celebrate, not nag.
 */
export function OpenDays({ entries, onPick, today = todayISO(), lookback = 10 }: { entries: Entry[]; onPick: (date: string) => void; today?: string; lookback?: number }) {
  const days = useMemo(() => openWorkdays(entries, today, lookback), [entries, today, lookback]);
  if (!days.length) return null;
  const shown = days.slice(0, 5);
  const rest = days.length - shown.length;
  const overdueToday = isWorkday(today) && !entries.some((e) => e.entry_date === today);
  return (
    <div className="open-days" role="status">
      <span className="open-days-ic"><Icon name="calendar" size={15} /></span>
      <div className="open-days-text">
        <b>{days.length} arbetsdag{days.length === 1 ? '' : 'ar'} utan registrering</b>
        <span>{overdueToday ? 'Idag är inte heller registrerad än.' : 'Klicka på en dag för att lägga in den – saknade dagar räknas aldrig som noll.'}</span>
      </div>
      <div className="open-days-chips">
        {shown.map((d) => (
          <button key={d} className="open-day" onClick={() => onPick(d)} title={`Registrera ${dateLabelShort(d)}`}>
            <Icon name="plus" size={11} /> {dateLabelShort(d).replace('.', '')}
          </button>
        ))}
        {rest > 0 && <LinkHistory rest={rest} />}
      </div>
    </div>
  );
}

function LinkHistory({ rest }: { rest: number }) {
  return <a href="/history" className="open-day more">+{rest} till</a>;
}
