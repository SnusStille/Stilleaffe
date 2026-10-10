'use client';
import { useEffect } from 'react';

// Lätt 3D-lutning + ljusreflex på kort, och subtil parallax på bakgrunden.
// Slås av automatiskt på touch-enheter och vid "minska rörelse".
export default function Fx() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const SEL = '.c:not(.pop):not(.sc):not(.chat),.lg';
    const root = document.documentElement;
    let cur: HTMLElement | null = null;
    let raf = 0;

    const reset = (el: HTMLElement) => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };

    const move = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.(SEL) as HTMLElement | null;
      if (cur && cur !== t) reset(cur);
      cur = t;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty('--px', String((e.clientX / window.innerWidth - 0.5).toFixed(3)));
        root.style.setProperty('--py', String((e.clientY / window.innerHeight - 0.5).toFixed(3)));
        if (!t) return;
        const r = t.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const max = Math.max(1.8, Math.min(7, 2800 / Math.max(r.width, r.height)));
        t.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
        t.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
        t.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        t.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
    };
    const leave = () => { if (cur) reset(cur); cur = null; };

    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);
  return null;
}
