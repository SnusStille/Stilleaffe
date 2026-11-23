'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { searchCommands, type Command } from '@/lib/command';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

export function CommandPalette({ open, onClose, commands, onRun }: { open: boolean; onClose: () => void; commands: Command[]; onRun: (c: Command) => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchCommands(q, commands, 10), [q, commands]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const run = (c: Command) => {
    onClose();
    onRun(c);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) run(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Group consecutive results so the palette keeps ranking but still reads as sections.
  const groups: { name: string; items: { c: Command; i: number }[] }[] = [];
  results.forEach((c, i) => {
    const last = groups[groups.length - 1];
    if (last && last.name === c.group) last.items.push({ c, i });
    else groups.push({ name: c.group, items: [{ c, i }] });
  });

  return createPortal(
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Kommandopalett">
        <div className="palette-input">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Sök sidor, åtgärder eller Spelguiden…"
            aria-label="Sök kommandon"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="kbd">{isMac() ? 'esc' : 'Esc'}</kbd>
        </div>
        <div className="palette-list" role="listbox" aria-label="Kommandon">
          {results.length === 0 && <div className="palette-empty">Inget matchar “{q}”. Prova “månad”, “mål” eller “invändning”.</div>}
          {groups.map((g) => (
            <div key={g.name} className="palette-group">
              <div className="palette-group-name">{g.name}</div>
              {g.items.map(({ c, i }) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`palette-item ${i === active ? 'on' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                >
                  <span className="palette-ic"><Icon name={c.icon} size={16} /></span>
                  <span className="palette-label">{c.label}</span>
                  {c.hint && <kbd className="kbd">{c.hint}</kbd>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="palette-foot">
          <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> bläddra</span>
          <span><kbd className="kbd">↵</kbd> välj</span>
          <span><kbd className="kbd">{isMac() ? '⌘' : 'Ctrl'}</kbd><kbd className="kbd">K</kbd> öppna var som helst</span>
          <span className="spacer" />
          <span className="dim">{results.length} kommandon</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
