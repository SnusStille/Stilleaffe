'use client';

import { useState } from 'react';
import { Icon } from './icons';
import { TONE_LABEL, type Insight } from '@/lib/analysis';

/**
 * Evidence-based insight list. Shows the top `limit` by default and the rest on
 * request. Tone colours: good = mint, warn = gold, info = ice.
 */
export function InsightsCard({
  insights,
  title = 'Insikter',
  kicker = 'MÖNSTER I DINA SIFFROR',
  limit = 3,
  empty = 'Fortsätt registrera – insikterna växer fram när underlaget gör det.',
}: {
  insights: Insight[];
  title?: string;
  kicker?: string;
  limit?: number;
  empty?: string;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? insights : insights.slice(0, limit);
  return (
    <div className="card insights">
      <div className="card-head">
        <div>
          <div className="card-kicker"><Icon name="bulb" size={11} /> {kicker}</div>
          <h3>{title}</h3>
        </div>
        <span className="badge">{insights.length} {insights.length === 1 ? 'insikt' : 'insikter'}</span>
      </div>
      {shown.length === 0 ? (
        <div className="card-note" style={{ padding: '14px 0' }}>{empty}</div>
      ) : (
        <ul className="insight-list">
          {shown.map((it) => (
            <li key={it.id} className={`insight ${it.tone}`}>
              <span className="insight-ic" aria-hidden="true">{it.emoji}</span>
              <div>
                <b>{it.title}</b>
                <p>{it.body}</p>
              </div>
              <span className="insight-tag">{TONE_LABEL[it.tone]}</span>
            </li>
          ))}
        </ul>
      )}
      {insights.length > limit && (
        <button className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={() => setAll((v) => !v)}>
          {all ? 'Visa färre' : `Visa alla ${insights.length}`}
        </button>
      )}
      {shown.length > 0 && <div className="card-note" style={{ marginTop: 10 }}>Beräknat lokalt från registrerade dagar – inga gissningar, ingen AI.</div>}
    </div>
  );
}
