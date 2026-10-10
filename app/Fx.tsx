'use client';
import { useEffect } from 'react';

// Liten ljusvåg där man trycker på knappar. Inget annat körs i bakgrunden.
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
    return () => document.removeEventListener('pointerdown', ripple);
  }, []);
  return null;
}
