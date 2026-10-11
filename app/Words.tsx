'use client';
import { useEffect, useState } from 'react';

const POOL = ['Discipline','Focus','Growth','Results','Consistency','Momentum','Drive','Hunger','Next level','One call closer','Beat yesterday','Execute','Relentless','Build','Earn it','Own the day','Compound','Persist','Small wins','Finish strong','Fokus','Tempo','Envishet','Rutin'];
type W = { t: string; x: number; y: number; d: number; s: number; dl: number };

// Flytande ord i bakgrunden. Slumpas per besök och byts långsamt. Bara transform/opacity animeras.
export default function Words() {
  const [w, setW] = useState<W[]>([]);
  useEffect(() => {
    const pick = [...POOL].sort(() => Math.random() - 0.5).slice(0, 8);
    setW(pick.map((t, i) => ({ t, x: 3 + ((i * 29 + Math.random() * 18) % 84), y: 6 + ((i * 41 + Math.random() * 16) % 84), d: 40 + Math.random() * 30, s: 0.9 + Math.random() * 1.4, dl: -Math.random() * 40 })));
    const id = window.setInterval(() => setW(p => p.map(x => (Math.random() < 0.35 ? { ...x, t: POOL[Math.floor(Math.random() * POOL.length)] } : x))), 150000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="words" aria-hidden>
      {w.map((x, i) => (
        <span key={i} style={{ left: x.x + '%', top: x.y + '%', fontSize: x.s + 'rem', animationDuration: x.d + 's', animationDelay: x.dl + 's' }}>{x.t}</span>
      ))}
    </div>
  );
}
