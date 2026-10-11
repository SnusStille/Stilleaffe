'use client';
import { useEffect } from 'react';

// Ljusvåg på knappar + mycket diskret 3D-lutning på utvalda kort. Av vid "minska rörelse".
export default function Fx() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ripple = (e: PointerEvent) => {
      const b = (e.target as HTMLElement | null)?.closest?.('button.b,button.pri,button.nv,.seg button') as HTMLElement | null;
      if (!b) return;
      const r = b.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 2;
      const el = document.createElement('span');
      el.className = 'ripple';
      el.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(el);
      setTimeout(() => el.remove(), 650);
    };
    document.addEventListener('pointerdown', ripple, { passive: true });

    let cleanup = () => document.removeEventListener('pointerdown', ripple);
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const SEL = '.tilt,.hero,.motiv,.mr-hero';
      let cur: HTMLElement | null = null;
      let raf = 0;
      const reset = (el: HTMLElement) => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
      const move = (e: PointerEvent) => {
        const t = (e.target as HTMLElement | null)?.closest?.(SEL) as HTMLElement | null;
        if (cur && cur !== t) reset(cur);
        cur = t;
        if (!t) return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = t.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          t.style.setProperty('--rx', ((0.5 - py) * 5).toFixed(2) + 'deg');
          t.style.setProperty('--ry', ((px - 0.5) * 7).toFixed(2) + 'deg');
          t.style.setProperty('--mx', (px * 100).toFixed(0) + '%');
          t.style.setProperty('--my', (py * 100).toFixed(0) + '%');
        });
      };
      const leave = () => { if (cur) reset(cur); cur = null; };
      document.addEventListener('pointermove', move, { passive: true });
      document.documentElement.addEventListener('pointerleave', leave);
      cleanup = () => {
        cancelAnimationFrame(raf);
        document.removeEventListener('pointerdown', ripple);
        document.removeEventListener('pointermove', move);
        document.documentElement.removeEventListener('pointerleave', leave);
      };
    }
    return cleanup;
  }, []);
  return null;
}
