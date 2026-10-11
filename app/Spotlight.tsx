'use client';
import { useEffect } from 'react';

// Mjukt guldljus som följer muspekaren + pausar alla animationer när fliken är dold (sparar batteri).
export default function Spotlight() {
  useEffect(() => {
    const root = document.documentElement;
    const vis = () => { root.dataset.hidden = document.hidden ? '1' : ''; };
    document.addEventListener('visibilitychange', vis);
    vis();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let raf = 0;
    let mv: ((e: PointerEvent) => void) | null = null;
    if (!reduce && fine) {
      mv = (e: PointerEvent) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          root.style.setProperty('--sx', e.clientX + 'px');
          root.style.setProperty('--sy', e.clientY + 'px');
        });
      };
      window.addEventListener('pointermove', mv, { passive: true });
    }
    return () => {
      document.removeEventListener('visibilitychange', vis);
      if (mv) window.removeEventListener('pointermove', mv);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <div className="spot-glow" aria-hidden="true" />;
}
