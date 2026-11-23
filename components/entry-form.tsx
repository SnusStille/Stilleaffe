'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Entry, Mood } from '@/lib/types';
import { MOOD_EMOJI, MOOD_LABEL, todayISO, pct } from '@/lib/calc';
import { useApp } from './app-provider';
import { Icon } from './icons';
import { Ring } from './ui';

const COMMON_TAGS = ['ny kund', 'befintlig kund', 'företag', 'ringer tillbaka', 'kampanj', 'mässa', 'telefon', 'besök'];

export function EntryForm({ initial, date: initialDate, onSaved, onCancel, compact = false }: { initial?: Entry | null; date?: string; onSaved?: () => void; onCancel?: () => void; compact?: boolean }) {
  const { me, data, reload, toast } = useApp();
  const goals = data?.team.find((t) => t.username === me.username)?.goals;
  const [date, setDate] = useState(initial?.entry_date || initialDate || todayISO());
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Tag suggestions: the seller's own most-used tags first, then the common ones.
  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of data?.myEntries || []) for (const t of e.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
    const mine = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
    return [...new Set([...mine, ...COMMON_TAGS])].slice(0, 8);
  }, [data]);
  const currentTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
  const suggestions = tagSuggestions.filter((t) => !currentTags.includes(t)).slice(0, 5);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = window.setTimeout(() => setConfirmDelete(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmDelete]);

  const salesN = Number(sales) || 0;
  const tbN = Number(tb) || 0;
  const brandN = brand === '' ? null : Number(brand);
  const konsN = kons === '' ? null : Number(kons);
  const splitSum = (brandN || 0) + (konsN || 0);
  const splitTouched = brand !== '' || kons !== '';
  const splitError = splitTouched && (splitSum > salesN || !Number.isInteger(brandN ?? 0) || !Number.isInteger(konsN ?? 0));
  const dateError = date > todayISO() ? 'Framtida datum kan inte registreras.' : null;
  const goalPct = goals && goals.daily_sales > 0 ? pct(salesN, goals.daily_sales) : 0;
  const avgTb = useMemo(() => {
    const past = (data?.myEntries || []).filter((e) => e.sales > 0 && e.id !== initial?.id);
    const s = past.reduce((a, e) => a + Number(e.sales), 0);
    return s ? past.reduce((a, e) => a + Number(e.tb_sek), 0) / s : null;
  }, [data, initial?.id]);

  function setSalesInt(n: number) {
    setSales(String(Math.max(0, Math.min(9999, Math.round(n)))));
  }

  /** Put everything on one product and clear the other. */
  function setAll(target: 'brand' | 'kons') {
    if (target === 'brand') { setBrand(String(salesN)); setKons(''); }
    else { setKons(String(salesN)); setBrand(''); }
  }

  /** Fill the unfilled product with what is left; if both are set, top up the larger one. */
  function splitRest() {
    const b = brandN || 0;
    const k = konsN || 0;
    const rest = Math.max(0, salesN - b - k);
    if (brand === '' && kons === '') return setBrand(String(salesN));
    if (brand === '') return setBrand(String(rest));
    if (kons === '') return setKons(String(rest));
    if (b >= k) setBrand(String(b + rest));
    else setKons(String(k + rest));
  }

  function suggestTb() {
    if (avgTb != null && tb === '') setTb(String(Math.round(avgTb * salesN)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await save();
  }

  async function save() {
    setError(null);
    if (dateError) return setError(dateError);
    if (splitError) return setError('Produktuppdelningen kan inte överstiga totalt antal sälj.');
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        action: 'upsert',
        entry_date: date,
        sales: salesN,
        tb_sek: tbN,
        hours: hours === '' ? null : Number(hours),
        mood,
        rating: rating === '' ? null : Number(rating),
        tags: currentTags,
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
      const reached = goals && goals.daily_sales > 0 && salesN >= goals.daily_sales && (initial ? Number(initial.sales) < goals.daily_sales : true);
      toast(reached ? `Målet är nått för ${date === todayISO() ? 'idag' : 'dagen'} — ${salesN} sälj 🎯` : initial ? 'Registreringen är uppdaterad.' : 'Dagens siffror är sparade.');
      onSaved?.();
    } catch (err: any) {
      setError(err?.message || 'Kunde inte spara.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
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
      setConfirmDelete(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 14 }} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void save(); } }}>
      {error && (
        <div className="auth-alert" role="alert">
          <Icon name="alert-circle" size={15} />
          <span>{error}</span>
        </div>
      )}

      <div className="entry-top">
        <div className="g-2" style={{ flex: 1 }}>
          <div className="field">
            <label className="label" htmlFor="ef-date">Datum</label>
            <input id="ef-date" className="input" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} required disabled={busy} />
          </div>
          <div className="field">
            <label className="label" htmlFor="ef-hours">Timmar (valfritt)</label>
            <input id="ef-hours" className="input" type="number" min="0" max="24" step="0.25" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="t.ex. 8" disabled={busy} />
          </div>
        </div>
        {goals && (
          <div className="entry-goal" title={`Dagsmål ${goals.daily_sales} sälj`}>
            <Ring value={goalPct} size={74} stroke={7} label={salesN ? `${goalPct}%` : '–'} sub={`av ${goals.daily_sales}`} tone={goalPct >= 100 ? 'gold' : 'mint'} />
          </div>
        )}
      </div>

      <div className="g-2">
        <div className="field">
          <label className="label" htmlFor="ef-sales">Totalt antal sälj</label>
          <div className="stepper stepper-lg">
            <button type="button" onClick={() => setSalesInt(salesN - 1)} disabled={busy || salesN <= 0} aria-label="Minska med 1"><Icon name="minus" size={15} /></button>
            <input id="ef-sales" type="number" min="0" step="1" inputMode="numeric" value={sales} onChange={(e) => setSales(e.target.value.replace(/^0+(?=\d)/, ''))} onBlur={() => { setSales(salesN ? String(salesN) : ''); suggestTb(); }} required disabled={busy} aria-label="Antal sälj" />
            <button type="button" className="plus" onClick={() => setSalesInt(salesN + 1)} disabled={busy} aria-label="Öka med 1"><Icon name="plus" size={15} /></button>
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="ef-tb">
            Totalt TB (kr)
            {avgTb != null && tb === '' && (
              <button type="button" className="label-action" onClick={suggestTb}>Föreslå {Math.round(avgTb * (salesN || 1)).toLocaleString('sv-SE')} (snitt {Math.round(avgTb).toLocaleString('sv-SE')}/sälj)</button>
            )}
          </label>
          <input id="ef-tb" className="input" type="number" min="0" step="1" inputMode="decimal" value={tb} onChange={(e) => setTb(e.target.value)} required disabled={busy} />
        </div>
      </div>

      <div className="card flat tight" style={{ background: 'rgba(255,255,255,.025)' }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <div className="card-kicker">Produktuppdelning</div>
            <div className="card-note">Valfritt. Tomma fält visas som "Ej uppdelat" i statistiken.</div>
          </div>
          {splitTouched && <span className={`badge ${splitError ? 'red' : splitSum === salesN ? 'green' : 'mint'}`}>{splitSum} / {salesN} sälj{splitSum < salesN && !splitError ? ' · resten ej uppdelat' : ''}</span>}
        </div>
        <div className="g-2">
          <div className="field">
            <label className="label" htmlFor="ef-brand"><span className="dot brand" style={{ marginRight: 6 }} />Brandkollen — sälj</label>
            <input id="ef-brand" className="input" type="number" min="0" step="1" inputMode="numeric" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="0" disabled={busy} />
          </div>
          <div className="field">
            <label className="label" htmlFor="ef-kons"><span className="dot kons" style={{ marginRight: 6 }} />Konsumentkollen — sälj</label>
            <input id="ef-kons" className="input" type="number" min="0" step="1" inputMode="numeric" value={kons} onChange={(e) => setKons(e.target.value)} placeholder="0" disabled={busy} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 8, gap: 6 }}>
          <button type="button" className="chip-btn" onClick={() => setAll('brand')} disabled={busy || !salesN}>Allt → Brandkollen</button>
          <button type="button" className="chip-btn" onClick={() => setAll('kons')} disabled={busy || !salesN}>Allt → Konsumentkollen</button>
          <button type="button" className="chip-btn" onClick={splitRest} disabled={busy || !salesN || splitSum >= salesN}>Fördela resten</button>
          {splitTouched && <button type="button" className="chip-btn ghost" onClick={() => { setBrand(''); setKons(''); setBrandTb(''); setKonsTb(''); }} disabled={busy}>Rensa</button>}
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
            <button key={m} type="button" className={`btn btn-sm mood-btn ${mood === m ? 'btn-primary' : ''}`} onClick={() => setMood(mood === m ? null : m)} title={MOOD_LABEL[m!]} aria-pressed={mood === m}>
              <span className="mood-emoji">{MOOD_EMOJI[m!]}</span> {MOOD_LABEL[m!]}
            </button>
          ))}
        </div>
      </div>

      <div className="g-2">
        <div className="field">
          <label className="label" htmlFor="ef-rating">Dagens rating (1–5)</label>
          <div className="rating" role="radiogroup" aria-label="Dagens rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={Number(rating) === n} className={`rating-star ${rating !== '' && Number(rating) >= n ? 'on' : ''}`} onClick={() => setRating(rating === String(n) ? '' : String(n))} aria-label={`${n} av 5`} disabled={busy}>
                ★
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="ef-tags">Taggar</label>
          <input id="ef-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="t.ex. företag, ny kund" disabled={busy} />
          {suggestions.length > 0 && (
            <div className="row" style={{ gap: 5, marginTop: 2 }}>
              {suggestions.map((t) => (
                <button key={t} type="button" className="chip-btn" onClick={() => setTags(currentTags.length ? `${currentTags.join(', ')}, ${t}` : t)} disabled={busy}>+ {t}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="ef-note">Anteckning</label>
        <textarea id="ef-note" className="textarea" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kort notis om dagen…" disabled={busy} />
        <div className="hint" style={{ textAlign: 'right' }}>{note.length}/500</div>
      </div>

      <div className="row" style={{ paddingTop: 2 }}>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          <Icon name="save" size={15} /> {busy ? 'Sparar…' : initial ? 'Uppdatera registrering' : 'Spara registrering'}
        </button>
        {initial && (
          <button className={`btn ${confirmDelete ? 'btn-danger solid' : 'btn-danger'}`} type="button" onClick={remove} disabled={busy}>
            <Icon name="trash" size={15} /> {confirmDelete ? 'Tryck igen för att ta bort' : 'Ta bort'}
          </button>
        )}
        {onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={busy}>
            Avbryt
          </button>
        )}
        <span className="spacer" />
        <span className="hint nowrap"><kbd className="kbd">{typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl'}</kbd>+<kbd className="kbd">↵</kbd> spara</span>
      </div>
      {!compact && (
        <div className="hint">
          En dag utan registrering räknas aldrig som noll. En registrerad dag med 0 sälj är en faktisk nolla.
        </div>
      )}
    </form>
  );
}
