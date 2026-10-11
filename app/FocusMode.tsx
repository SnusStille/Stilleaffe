'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Keeps the dashboard uncluttered while preserving navigation and auth behavior. */
export default function FocusMode() {
  const path = usePathname();
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setOn(window.localStorage.getItem('sd_focus') === '1');
    } catch {
      // Focus mode remains usable for this visit if storage is unavailable.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (path?.startsWith('/login')) {
      delete root.dataset.focus;
      return;
    }
    if (on) root.dataset.focus = '1';
    else delete root.dataset.focus;
    try {
      window.localStorage.setItem('sd_focus', on ? '1' : '0');
    } catch {
      // The toggle still works in memory if storage is unavailable.
    }
  }, [on, path, ready]);

  if (path?.startsWith('/login')) return null;

  return (
    <button
      type="button"
      className={`b focus-btn${on ? ' on' : ''}`}
      onClick={() => setOn(value => !value)}
      aria-pressed={on}
      aria-label={on ? 'Stäng fokusläge' : 'Aktivera fokusläge'}
      title="Fokusläge"
    >
      {on ? '◉ Fokus på' : '○ Fokusläge'}
    </button>
  );
}
