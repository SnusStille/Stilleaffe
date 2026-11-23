'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { EntryForm } from '@/components/entry-form';
import { Icon } from '@/components/icons';
import { Avatar, Badge, Empty, Kpi, Modal, Skeleton } from '@/components/ui';
import {
  dateLabel,
  dateLabelShort,
  elapsedWorkdays,
  fmt,
  fmtMoney,
  isWorkday,
  monthLabel,
  monthOf,
  monthOptions,
  previousMonthKey,
  todayISO,
  weekdayShort,
  workdaysBetween,
  type Entry,
} from '@/lib/calc';
import type { PublicEntry } from '@/lib/types';

type Row = {
  id: number;
  seller_username: string;
  entry_date: string;
  sales: number;
  tb_sek: number;
  hours: number | null;
  brandkollen_sales: number | null;
  konsumentkollen_sales: number | null;
  brandkollen_tb: number | null;
  konsumentkollen_tb: number | null;
  note?: string | null;
  mood?: string | null;
  tags?: string[];
};

function splitLabel(e: Row) {
  if (e.brandkollen_sales == null && e.konsumentkollen_sales == null) return 'Ej uppdelat';
  return `BK ${e.brandkollen_sales ?? 0} · KK ${e.konsumentkollen_sales ?? 0}`;
}

export default function HistoryPage() {
  const { data, loading, me, toast, reload } = useApp();
  const [monthKey, setMonthKey] = useState<string>('');
  const [seller, setSeller] = useState<string>(me.username);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const isManager = me.role === 'manager';

  const rows: Row[] = useMemo(() => {
    if (isManager) {
      const member = data?.team.find((t) => t.username === seller);
      return (member?.entries || []) as PublicEntry[];
    }
    return data?.myEntries || [];
  }, [data, seller, isManager]);

  const months = useMemo(() => monthOptions(rows.map((r) => ({ entry_date: r.entry_date }))), [rows]);
  const active = monthKey || months[months.length - 1] || monthOf(todayISO());

  const monthRows = useMemo(() => rows.filter((r) => monthOf(r.entry_date) === active).sort((a, b) => b.entry_date.localeCompare(a.entry_date)), [rows, active]);
  const totals = useMemo(() => {
    const sales = monthRows.reduce((s, r) => s + Number(r.sales || 0), 0);
    const tb = monthRows.reduce((s, r) => s + Number(r.tb_sek || 0), 0);
    const hours = monthRows.reduce((s, r) => s + Number(r.hours || 0), 0);
    const brand = monthRows.reduce((s, r) => s + Number(r.brandkollen_sales || 0), 0);
    const kons = monthRows.reduce((s, r) => s + Number(r.konsumentkollen_sales || 0), 0);
    const unsplit = monthRows.filter((r) => r.brandkollen_sales == null && r.konsumentkollen_sales == null).reduce((s, r) => s + Number(r.sales || 0), 0);
    return { sales, tb, hours, brand, kons, unsplit };
  }, [monthRows]);

  // Coverage: which elapsed workdays in the month have no registration. Those are "missing", never zero.
  const coverage = useMemo(() => {
    const today = todayISO();
    const end = active < monthOf(today) ? `${active}-${new Date(Number(active.slice(0, 4)), Number(active.slice(5)), 0).getDate()}` : today;
    const registered = new Set(monthRows.map((r) => r.entry_date));
    const missing: string[] = [];
    let elapsed = 0;
    for (let d = `${active}-01`; d <= end; d = addDay(d)) {
      if (!isWorkday(d)) continue;
      elapsed++;
      if (!registered.has(d)) missing.push(d);
    }
    return { elapsed, registered: elapsed - missing.length, missing };
  }, [active, monthRows]);

  if (loading) return <div><Skeleton height={64} /><div style={{ marginTop: 16 }}><Skeleton height={400} /></div></div>;
  if (!data) return <div className="card"><h3>Kunde inte ladda historiken</h3></div>;

  async function remove(id: number) {
    if (pendingDelete !== id) {
      setPendingDelete(id);
      window.setTimeout(() => setPendingDelete((p) => (p === id ? null : p)), 4000);
      return;
    }
    setPendingDelete(null);
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'delete', id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return toast(json?.error || 'Kunde inte ta bort.', 'err');
    toast('Registreringen är borttagen.');
    await reload();
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>HISTORIK · {monthLabel(active).toUpperCase()}</div>
          <h1 className="page-title">{isManager ? 'Teamets historik' : 'Min historik'}</h1>
          <p className="page-sub">{isManager ? 'Alla registreringar, skrivskyddade. Anteckningar och humör är privata och visas inte.' : 'Alla dina registreringar med produktuppdelning, anteckningar och täckning. Dagar utan registrering markeras som saknade — aldrig som noll.'}</p>
        </div>
        <div className="page-head-actions">
          {isManager && (
            <select className="select" value={seller} onChange={(e) => setSeller(e.target.value)} aria-label="Välj säljare">
              {data.team.map((t) => <option key={t.username} value={t.username}>{t.display_name}</option>)}
            </select>
          )}
          <select className="select month-select" value={active} onChange={(e) => setMonthKey(e.target.value)} aria-label="Välj månad">
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        <Kpi label="Sälj" value={fmt(totals.sales)} sub={`${monthRows.length} registrerade dagar`} tone="mint" />
        <Kpi label="TB" value={fmtMoney(totals.tb)} sub={totals.hours ? `${totals.hours.toLocaleString('sv-SE')} h · ${fmt(totals.sales / totals.hours)} sälj/h` : 'Inga timmar registrerade'} tone="ice" />
        <Kpi label="Brandkollen" value={fmt(totals.brand)} sub="sälj" />
        <Kpi label="Konsumentkollen" value={fmt(totals.kons)} sub="sälj" />
        <Kpi label="Ej uppdelat" value={fmt(totals.unsplit)} sub="sälj utan produktuppdelning" />
        <Kpi label="Täckning" value={`${coverage.registered}/${coverage.elapsed}`} sub="registrerade av passerade arbetsdagar" tone={coverage.missing.length ? 'gold' : 'mint'} />
      </div>

      {coverage.missing.length > 0 && (
        <div className="note" style={{ marginBottom: 14 }}>
          <Icon name="info" size={15} />
          <span>
            <b>{coverage.missing.length} arbetsdag(ar) utan registrering:</b> {coverage.missing.slice(0, 8).map((d) => dateLabelShort(d)).join(', ')}{coverage.missing.length > 8 ? ' …' : ''}. Dessa räknas inte som noll och påverkar inte snitt per arbetsdag.
          </span>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div><div className="card-kicker">REGISTRERINGAR</div><h3>{monthLabel(active)}</h3></div>
          {!isManager && <button className="btn btn-sm" onClick={() => setEditing({ id: 0, seller_username: me.username, entry_date: todayISO(), sales: 0, tb_sek: 0, hours: null, note: null, rating: null, mood: null, tags: [], brandkollen_sales: null, konsumentkollen_sales: null, brandkollen_tb: null, konsumentkollen_tb: null } as Entry)}><Icon name="plus" size={14} /> Ny registrering</button>}
        </div>
        {monthRows.length === 0 ? (
          <Empty title="Inga registreringar denna månad" icon="calendar">{isManager ? 'Säljaren har inga registreringar för den valda månaden.' : 'Lägg till din första registrering för månaden.'}</Empty>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {monthRows.map((e) => (
              <div className="history-row" key={e.id}>
                <div className="d">{dateLabelShort(e.entry_date)}<small>{e.hours != null ? `${e.hours} h` : weekdayShort(e.entry_date)}</small></div>
                <div className="n">
                  <span className="badge" style={{ marginRight: 6 }}>{splitLabel(e)}</span>
                  {e.note ? <span className="dim">{e.note}</span> : <span className="dim">Ingen anteckning</span>}
                </div>
                <div className="v">{fmt(e.sales)}<small>sälj</small><div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 500 }}>{fmtMoney(e.tb_sek)}</div></div>
                {!isManager && (
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditing(e as Entry)} aria-label="Redigera"><Icon name="edit" size={13} /></button>
                    <button className={`btn btn-sm ${pendingDelete === e.id ? 'btn-danger solid' : 'btn-danger btn-ghost'}`} onClick={() => remove(e.id)} aria-label={pendingDelete === e.id ? 'Bekräfta borttagning' : 'Ta bort'} title={pendingDelete === e.id ? 'Tryck igen för att ta bort' : 'Ta bort'}>
                      {pendingDelete === e.id ? 'Säker?' : <Icon name="trash" size={13} />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="card-note" style={{ marginTop: 12 }}>Visar {monthRows.length} registreringar. Redigeringar och borttagningar loggas i ändringshistoriken.</div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && editing.id ? 'Redigera registrering' : 'Ny registrering'} width={720}>
        {editing && <EntryForm key={`${editing.id}-${editing.entry_date}`} initial={editing.id ? editing : null} date={editing.entry_date} onSaved={() => { setEditing(null); void reload(); }} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

function addDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
