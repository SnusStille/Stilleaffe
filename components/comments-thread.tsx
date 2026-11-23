'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useApp } from './app-provider';
import { Avatar, Badge, Empty, Skeleton } from './ui';
import { Icon } from './icons';
import type { CommentItem } from '@/lib/types';

export function CommentsThread({ compact = false, markSeen = false }: { compact?: boolean; markSeen?: boolean }) {
  const { me, toast, reload } = useApp();
  const [items, setItems] = useState<CommentItem[] | null>(null);
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/comments', { credentials: 'same-origin' });
      const json = await res.json();
      if (res.ok) {
        setItems(json.items || []);
        if (markSeen && json.unread > 0) {
          await fetch('/api/comments', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ action: 'seen' }),
          }).catch(() => {});
        }
      } else setError(json?.error || 'Kunde inte hämta kommentarer.');
    } catch {
      setError('Kunde inte hämta kommentarer.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function post(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ body: text.trim(), entry_date: date || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Kunde inte skicka.');
      setText('');
      setDate('');
      await load();
      await reload();
      toast('Kommentaren är skickad.');
    } catch (err: any) {
      setError(err?.message || 'Kunde inte skicka.');
    } finally {
      setBusy(false);
    }
  }

  async function react(id: number, reaction: string) {
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'react', id, reaction }),
    });
    void load();
  }

  async function pin(item: CommentItem) {
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'pin', id: item.id, pinned: !item.pinned }),
    });
    void load();
  }

  const sorted = items ? [...items.filter((c) => c.pinned), ...items.filter((c) => !c.pinned)] : [];

  return (
    <div className="stack" style={{ gap: 12 }}>
      <form onSubmit={post} className="card tight">
        <div className="field">
          <textarea
            className="textarea"
            rows={compact ? 2 : 3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={me.role === 'manager' ? 'Skriv till teamet…' : 'Skriv till teamet…'}
            disabled={busy}
          />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input type="date" className="input" style={{ width: 170, height: 34, fontSize: 12 }} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Koppla till datum" />
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !text.trim()}>
            <Icon name="comments" size={14} /> {busy ? 'Skickar…' : 'Skicka'}
          </button>
          {date && <span className="badge">Kopplas till {date}</span>}
        </div>
        {error && <div className="error-text" style={{ marginTop: 8 }}>{error}</div>}
      </form>

      {items === null ? (
        <div className="stack"><Skeleton height={70} /><Skeleton height={70} /><Skeleton height={70} /></div>
      ) : !sorted.length ? (
        <Empty title="Inga kommentarer än" icon="comments">Starta teamkonversationen ovan.</Empty>
      ) : (
        <div className="chat">
          {sorted.map((c) => (
            <div key={c.id} className={`msg ${c.author_username === me.username ? 'mine' : ''}`}>
              <div className="meta">
                <Avatar name={c.author_name} role={c.author_role} size="sm" />
                <b style={{ color: 'var(--tx)' }}>{c.author_name}</b>
                <Badge tone={c.author_role === 'manager' ? 'violet' : 'mint'}>{c.author_role === 'manager' ? 'Chef' : 'Säljare'}</Badge>
                {c.entry_date && <span>· {c.entry_date}</span>}
                <span>· {new Date(c.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                {c.pinned && <span className="pin">📌 fastnålad</span>}
              </div>
              {c.body}
              {c.reaction && <div style={{ fontSize: 20, marginTop: 6 }}>{c.reaction}</div>}
              <div className="react">
                {['👍', '❤️', '🔥', '🎉', '😂', '💪'].map((r) => (
                  <button key={r} className={c.reaction === r ? 'on' : ''} onClick={() => react(c.id, r)} aria-label={`Reagera med ${r}`}>{r}</button>
                ))}
                <button className="copy-btn" onClick={() => pin(c)} style={{ marginLeft: 'auto' }}>
                  <Icon name={c.pinned ? 'check' : 'copy'} size={11} /> {c.pinned ? 'Unpinna' : 'Pinna'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
