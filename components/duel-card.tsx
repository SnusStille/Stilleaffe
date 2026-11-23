'use client';

import { useMemo } from 'react';
import { Icon } from './icons';
import { dayWinner, weekDuel, type MemberLike } from '@/lib/analysis';
import { Avatar } from './ui';

const COLORS = ['var(--mint)', 'var(--ice)', 'var(--gold)', 'var(--violet)', 'var(--pink)'];

/**
 * Sellers head to head: this week's tug-of-war, day-by-day bars and the
 * last eight weeks as a strip of winner dots. Hidden-as-empty when there is
 * only one seller (a duel needs two).
 */
export function DuelCard({ members, today, highlight }: { members: MemberLike[]; today: string; highlight?: string }) {
  const duel = useMemo(() => weekDuel(members, today), [members, today]);

  if (!duel) {
    return (
      <div className="card">
        <div className="card-head">
          <div><div className="card-kicker"><Icon name="swords" size={11} /> VECKODUELLEN</div><h3>Säljare mot säljare</h3></div>
        </div>
        <div className="card-note">Det finns bara en säljare. Lägg till ett till säljarkonto i Supabase (<code>app_users</code>) så startar duellen – dag för dag, vecka för vecka.</div>
      </div>
    );
  }

  const { sellers, days, daysWon, leader, margin, history } = duel;
  const total = sellers.reduce((s, x) => s + x.week, 0);
  const maxDay = Math.max(1, ...days.flatMap((d) => d.values.map((v) => v ?? 0)));
  const color = (i: number) => COLORS[i % COLORS.length];
  const headline =
    leader != null
      ? `${sellers[leader].display_name} leder med ${margin} sälj`
      : total > 0
        ? 'Oavgjort i toppen'
        : 'Ingen har registrerat ännu den här veckan';

  return (
    <div className="card duel">
      <div className="card-head">
        <div>
          <div className="card-kicker"><Icon name="swords" size={11} /> VECKODUELLEN · {duel.weekKey.toUpperCase()} ({duel.rangeLabel})</div>
          <h3>{headline}</h3>
        </div>
        <span className="badge">{sellers.length} säljare</span>
      </div>

      {/* Tug of war */}
      <div className="duel-bar" role="img" aria-label={sellers.map((s) => `${s.display_name} ${s.week} sälj`).join(', ')}>
        {sellers.map((s, i) => (
          <i key={s.username} style={{ width: `${total ? (s.week / total) * 100 : 100 / sellers.length}%`, background: `linear-gradient(90deg, ${color(i)}, ${color(i)}cc)` }} className={highlight === s.username ? 'me' : ''} />
        ))}
      </div>
      <div className="duel-scores">
        {sellers.map((s, i) => (
          <div key={s.username} className={`duel-score ${leader === i ? 'lead' : ''}`} style={{ color: color(i) }}>
            <Avatar name={s.display_name} size="xs" />
            <span className="duel-name">{s.display_name}{highlight === s.username && <em>du</em>}</span>
            <b>{s.week}</b>
            <small>{s.avg == null ? 'inga dagar' : `${s.avg.toLocaleString('sv-SE', { maximumFractionDigits: 1 })}/dag`}</small>
          </div>
        ))}
      </div>

      {/* Day by day */}
      <div className="duel-days">
        {days.map((d, di) => {
          const present = d.values.map((v, i) => ({ v, i })).filter((x) => x.v != null);
          const winner = dayWinner(d);
          return (
            <div key={d.date} className={`duel-day ${d.future ? 'future' : ''} ${present.length === 0 && !d.future ? 'open' : ''}`}>
              {winner != null && <span className="duel-crown" style={{ background: color(winner) }} />}
              <div className="duel-stack">
                {d.values.map((v, i) =>
                  d.future ? null : v == null ? (
                    <span key={i} className="duel-cell miss" title={`${d.label}: ingen registrering`} />
                  ) : (
                    <span key={i} className={`duel-cell ${winner === i ? 'win' : ''}`} style={{ height: `${Math.max(4, (v / maxDay) * 48)}px`, background: color(i) }} title={`${sellers[i].display_name} ${d.label}: ${v} sälj`}>
                      <em>{v}</em>
                    </span>
                  ),
                )}
              </div>
              <span className="duel-dl">{d.label}</span>
            </div>
          );
        })}
      </div>

      <div className="duel-foot">
        <span><b>Dagar vunna:</b> {sellers.map((s, i) => `${s.display_name} ${daysWon[i]}`).join(' · ')}</span>
        <span className="duel-hist" aria-label="Sena veckors vinnare">
          {history.map((h) => (
            <i
              key={h.key}
              className={`duel-dot ${h.winner == null ? 'tie' : ''} ${h.current ? 'cur' : ''}`}
              style={h.winner != null ? { background: color(h.winner) } : undefined}
              title={`${h.key}: ${sellers.map((s, i) => `${s.display_name} ${h.totals[i]}`).join(' · ')}${h.winner == null ? ' (oavgjort)' : ''}`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
