'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Fokusläge: döljer meny, bakgrundsord och effekter så man kan ringa i lugn och ro.
export default function FocusMode() {
  const path = usePathname();
  const [on, setOn] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem('sd_focus') === '1') setOn(true); } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.focus = on ? '1' : '';
    try { localStorage.setItem('sd_focus', on ? '1' : '0'); } catch {}
  }, [on]);
  if (path?.startsWith('/login')) return null;
  return (
    <button className={'b focus-btn' + (on ? ' on' : '')} onClick={() => setOn(v => !v)} aria-pressed={on} title="Fokusläge">
      {on ? '◉ Fokus på' : '○ Fokusläge'}
    </button>
  );
}
