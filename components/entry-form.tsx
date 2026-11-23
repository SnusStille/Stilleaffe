'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { Entry, Mood } from '@/lib/types';
import { MOOD_EMOJI, MOOD_LABEL, todayISO } from '@/lib/calc';
import { useApp } from './app-provider';
import { Icon } from './icons';

export function EntryForm({ initial, onSaved, onCancel, compact = false }: { initial?: Entry | null; onSaved?: () => void; onCancel?: () => void; compact?: boolean }) {
  const { reload, toast } = useApp();
  const [date, setDate] = useState(initial?.entry_date || todayISO());
  const [sales, setSales] = useState(String(initial?.sales ?? ''));
  const [tb, setTb] = useState(String(initial?.tb_sek ?? ''));
  const [brand, setBrand] = useState(initial?.brandkollen_sales == null ? '' : String(initial.brandkollen_sales));
  const [kons, setKons] = useState(initial?.konsumentkollen_sales == null ? '' : String(initial.konsumentkollen_sales));
  const [brandTb, setBrandTb] = useState(initial?.brandkollen_tb == null ? '' : String(initial.brandkollen_tb));
  const [konsTb, setKonsTb] = useState(initial?.konsumentkollen_tb == null ? '' : String(initial.konsumentkollen_tb));
  const [hours, setHours] = useState(initial?.hours == null ? '' : String(initial.hours));
  const [mood, setMood] = useState<Mood>(initial?.mood || null);
  const [rating, setRating] = useState(initial?.rating == null ? '' : String(initial.rating));
  const [tags, setTags] = useState(initial?.tags?.join(', ') || '');
  const [note, setNote] = useState(initial?.note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salesN = Number(sales) || 0;
  const brandN = brand === '' ? null : Number(brand);
  const konsN = kons === '' ? null : Number(kons);
  const splitSum = (brandN || 0) + (konsN || 0);
  const splitTouched = brand !== '' || kons !== '';
  const splitError = splitTouched && (splitSum > salesN || !Number.isInteger(brandN ?? 0) || !Number.isInteger(konsN ?? 0));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (splitError) {
      setError('Produktuppdelningen kan inte överstiga totalt antal sälj.');
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        action: 'upsert',
        entry_date: date,
        sales: salesN,
        tb_sek: Number(tb) || 0,
        hours: hours === '' ? null : Number(hours),
        mood,
        rating: rating === '' ? null : Number(rating),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        note: note.trim() || null,
      };
      if (splitTouched) {
        body.brandkollen_sales = brandN ?? 0;
        body.konsumentkollen_sales = konsN ?? 0;
      }
      if (brandTb !== '' || konsTb !== '') {
        body.brandkollen_tb = brandTb === '' ? 0 : Number(brandTb);
        body.konsumentkollen_tb = konsTb === '' ? 0 : Number(konsTb);
      }
      if (initial?.id) body.replace_id = initial.id;
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Kunde inte spara.');
      await reload();
      toast(initial ? 'Registreringen är uppdaterad.' : 'Dagens siffror är sparade.');
      onSaved?.();
    } catch (err: any) {
      setError(err?.message || 'Kunde inte spara.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirm('Ta bort registreringen? Detta kan inte ångras.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'delete', id: initial.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Kunde inte ta bort.');
      await reload();
      toast('Registreringen är borttagen.');
      onSaved?.();
    } catch (err: any) {
      setError(err?.message || 'Kunde inte ta bort.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
      {error && (
        <div className="auth-alert" role="alert">
          <Icon name="alert-circle" size={15} />
          <span>{error}</span>
        </div>
      )}

      <div className="g-2">
        <div className="field">
          <label className="label" htmlFor="ef-date">Datum</label>
          <input id="ef-date" className="input" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} required disabled={busy} />
        </div>
        <div className="field">
          <label className="label" htmlFor="ef-hours">Timmar (valfritt)</label>
          <input id="ef-hours" className="input" type="number" min="0" max="24" step="0.25" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="t.ex. 8" disabled={busy} />
        </div>
      </div>

      <div className="g-2">
        <div className="field">
          <label className="label" htmlFor="ef-sales">Totalt antal sälj</label>
          <input id="ef-sales" className="input" type="number" min="0" step="1" inputMode="numeric" value={sales} onChange={(e) => setSales(e.target.value)} required disabled={busy} />
        </div>
        <div className="field">
          <label className="label" htmlFor="ef-tb">Totalt TB (kr)</label>
          <input id="ef-tb" className="input" type="number" min="0" step="1" inputMode="decimal" value={tb} onChange={(e) => setTb(e.target.value)} required disabled={busy} />
        </div>
      </div>

      <div className="card flat tight" style={{ background: 'rgba(255,255,255,.025)' }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <div className="card-kicker">Produktuppdelning</div>
            <div className="card-note">Valfritt. Tomma fält visas som "Ej uppdelat" i statistiken.</div>
          </div>
          {splitTouched && <span className={`badge ${splitError ? 'red' : 'mint'}`}>{splitSum} / {salesN} sälj</span>}
        </div>
        <div className="g-2">
          <div className="field">
            <label className="label" htmlFor="ef-brand">Brandkollen — sälj</label>
            <input id="ef-brand" className="input" type="number" min="0" step="1" inputMode="numeric" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="0" disabled={busy} />
          </div>
          <div className="field">
            <label className="label" htmlFor="ef-kons">Konsumentkollen — sälj</label>
            <input id="ef-kons" className="input" type="number" min="0" step="1" inputMode="numeric" value={kons} onChange={(e) => setKons(e.target.value)} placeholder="0" disabled={busy} />
          </div>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary className="hint" style={{ cursor: 'pointer' }}>Separat TB per produkt (valfritt)</summary>
          <div className="g-2" style={{ marginTop: 8 }}>
            <div className="field">
              <label className="label" htmlFor="ef-brandtb">Brandkollen — TB</label>
              <input id="ef-brandtb" className="input" type="number" min="0" step="1" inputMode="decimal" value={brandTb} onChange={(e) => setBrandTb(e.target.value)} placeholder="0" disabled={busy} />
            </div>
            <div className="field">
              <label className="label" htmlFor="ef-constb">Konsumentkollen — TB</label>
              <input id="ef-constb" className="input" type="number" min="0" step="1" inputMode="decimal" value={konsTb} onChange={(e) => setKonsTb(e.target.value)} placeholder="0" disabled={busy} />
            </div>
          </div>
        </details>
        {splitError && <div className="error-text" style={{ marginTop: 8 }}>Summan får inte överstiga totalt antal sälj.</div>}
      </div>

      <div className="field">
        <span className="label">Dagens humör</span>
        <div className="row" role="group" aria-label="Dagens humör">
          {(['fire', 'great', 'ok', 'tired', 'bad'] as Mood[]).map((m) => (
            <button key={m} type="button" className={`btn btn-sm ${mood === m ? 'btn-primary' : ''}`} onClick={() => setMood(mood === m ? null : m)} title={MOOD_LABEL[m!]}>
              {MOOD_EMOJI[m!]} {MOOD_LABEL[m!]}
            </button>
          ))}
        </div>
      </div>

      <div className="g-2">
        <div className="field">
          <label className="label" htmlFor="ef-rating">Dagens rating (1–5)</label>
          <input id="ef-rating" className="input" type="number" min="1" max="5" step="1" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="Valfritt" disabled={busy} />
        </div>
        <div className="field">
          <label className="label" htmlFor="ef-tags">Taggar (kommaseparerade)</label>
          <input id="ef-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="t.ex. företag, ny kund" disabled={busy} />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="ef-note">Anteckning</label>
        <textarea id="ef-note" className="textarea" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kort notis om dagen…" disabled={busy} />
      </div>

      <div className="row" style={{ paddingTop: 2 }}>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          <Icon name="save" size={15} /> {busy ? 'Sparar…' : initial ? 'Uppdatera registrering' : 'Spara registrering'}
        </button>
        {initial && (
          <button className="btn btn-danger" type="button" onClick={remove} disabled={busy}>
            <Icon name="trash" size={15} /> Ta bort
          </button>
        )}
        {onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={busy}>
            Avbryt
          </button>
        )}
      </div>
      {!compact && (
        <div className="hint">
          En dag utan registrering räknas aldrig som noll. En registrerad dag med 0 sälj är en faktisk nolla.
        </div>
      )}
    </form>
  );
}
