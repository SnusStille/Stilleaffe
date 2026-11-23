'use client';

import { useState } from 'react';
import { useApp } from '@/components/app-provider';
import { Icon } from '@/components/icons';
import { Avatar, Badge, Empty, Progress, Skeleton } from '@/components/ui';
import { addDays, buildMonthStats, currentMonthKey, f1, fmt, fmtMoney, isWorkday, todayISO, weekMonday, weeklySeries, type Entry } from '@/lib/calc';
import type { Goals } from '@/lib/types';

export default function GoalsPage() {
  const { data, loading, me, toast, reload } = useApp();
  const isManager = me.role === 'manager';
  const mine = data?.team.find((t) => t.username === me.username);
  const [form, setForm] = useState<Goals | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div><Skeleton height={64} /><div className="grid g-2" style={{ marginTop: 16 }}><Skeleton height={320} /><Skeleton height={320} /></div></div>;
  if (!data) return <div className="card"><h3>Kunde inte ladda målen</h3></div>;

  const goals = form || mine?.goals;
  const monthKey = currentMonthKey();

  async function save() {
    if (!goals) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(goals),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Kunde inte spara.');
      toast('Målen är sparade.');
      setForm(null);
      await reload();
    } catch (e: any) {
      setError(e?.message || 'Kunde inte spara.');
    } finally {
      setBusy(false);
    }
  }

  function set(k: keyof Goals, v: string) {
    if (!goals) return;
    setForm({ ...goals, [k]: v === '' ? ('' as unknown as number) : Number(v) });
  }

  const stat = mine ? buildMonthStats(mine.username, mine.display_name, mine.entries.map((e) => ({ ...e, note: null, rating: null, mood: null, tags: [] })) as Entry[], mine.goals, monthKey) : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>MÅL · {isManager ? 'TEAMET' : 'MITT KONTO'}</div>
          <h1 className="page-title">{isManager ? 'Teamets mål' : 'Mina mål'}</h1>
          <p className="page-sub">{isManager ? 'Varje säljares egna mål. Chefer kan inte ändra dem — målen ägs av säljaren.' : 'Sätt dina egna mål för dag, vecka och månad. Målen styr måluppfyllelse, takt och prognos i hela Label Lab.'}</p>
        </div>
      </div>

      {!isManager && stat && mine && (
        <div className="grid g-3" style={{ marginBottom: 14 }}>
          {(() => {
            const today = mine.entries.find((e) => e.entry_date === todayISO());
            const week = weeklySeries(mine.entries, 1)[0];
            const weekElapsed = [0, 1, 2, 3, 4].filter((i) => {
              const d = addDays(weekMonday(todayISO()), i);
              return d <= todayISO() && isWorkday(d);
            }).length;
            return [
              { label: 'Dagsmål', value: today ? fmt(today.sales) : '–', goal: mine.goals.daily_sales, pct: today ? Math.min(100, Math.round((today.sales / Math.max(1, mine.goals.daily_sales)) * 100)) : 0, note: today ? `${fmtMoney(today.tb_sek)} TB · mål ${fmtMoney(mine.goals.daily_tb)}` : 'Dagens siffror är inte registrerade — räknas inte som noll', tone: (today ? 'mint' : 'gold') as 'mint' | 'ice' | 'gold' },
              { label: 'Veckomål', value: fmt(week?.sales || 0), goal: mine.goals.weekly_sales, pct: Math.min(100, Math.round(((week?.sales || 0) / Math.max(1, mine.goals.weekly_sales)) * 100)), note: `${week?.days || 0}/${weekElapsed} arbetsdagar registrerade · mål ${fmtMoney(mine.goals.weekly_tb)} TB`, tone: 'ice' as 'mint' | 'ice' | 'gold' },
              { label: 'Månadsmål', value: fmt(stat.sales), goal: mine.goals.monthly_sales, pct: stat.goalPct, note: `${fmt(stat.tb)} TB · mål ${fmtMoney(mine.goals.monthly_tb)} TB · ${stat.registeredWorkdays}/${stat.elapsedWorkdays} vardagar`, tone: 'mint' as 'mint' | 'ice' | 'gold' },
            ].map((c) => (
              <div className="card" key={c.label}>
                <div className="card-head"><div><div className="card-kicker">{c.label.toUpperCase()}</div><h3>{c.note}</h3></div><Badge tone={c.tone}>{c.pct}%</Badge></div>
                <div className="big-number" style={{ fontSize: 32 }}>{c.value}<small> / {fmt(c.goal)} sälj</small></div>
                <Progress value={c.pct} className="lg" />
                <div className="card-note" style={{ marginTop: 6 }}>{c.pct >= 100 ? 'Målet är uppnått' : `${fmt(Math.max(0, c.goal - Number(c.value.replace(/\s/g, ''))))} sälj kvar`}</div>
              </div>
            ));
          })()}
        </div>
      )}

      <div className="grid g-2">
        <div className="card">
          <div className="card-head">
            <div><div className="card-kicker">{isManager ? 'SÄLJARNAS MÅL' : 'REDIGERA'}</div><h3>{isManager ? 'Månads-, vecko- och dagsmål' : 'Uppdatera dina mål'}</h3></div>
            {!isManager && <Badge tone={form ? 'gold' : 'default'}>{form ? 'Osparade ändringar' : 'Sparade'}</Badge>}
          </div>
          {isManager ? (
            <div className="stack" style={{ gap: 12 }}>
              {data.team.filter((t) => t.role === 'seller').map((t) => {
                const s = buildMonthStats(t.username, t.display_name, t.entries.map((e) => ({ ...e, note: null, rating: null, mood: null, tags: [] })) as Entry[], t.goals, monthKey);
                return (
                  <div key={t.username} className="member-card">
                    <div className="member-head"><Avatar name={t.display_name} role="seller" size="sm" /><div><div className="n">{t.display_name}</div><div className="r">@{t.username}</div></div></div>
                    <div className="member-stats">
                      <div><span>Dag</span><b>{t.goals.daily_sales} sälj</b></div>
                      <div><span>Vecka</span><b>{t.goals.weekly_sales} sälj</b></div>
                      <div><span>Månad</span><b>{t.goals.monthly_sales} sälj</b></div>
                      <div><span>TB/månad</span><b>{fmtMoney(t.goals.monthly_tb)}</b></div>
                    </div>
                    <div className="row-between" style={{ marginTop: 4 }}><span className="card-note">Måluppfyllelse</span><b style={{ fontSize: 12 }}>{s.goalPct}%</b></div>
                    <Progress value={s.goalPct} />
                  </div>
                );
              })}
              {!data.team.some((t) => t.role === 'seller') && <Empty title="Inga säljare" icon="team">Lägg till säljarkonton i Supabase.</Empty>}
              <div className="note"><Icon name="lock" size={15} /><span>Chefer läser målen men kan inte ändra dem. Endast säljaren själv sparar sina mål.</span></div>
            </div>
          ) : goals ? (
            <>
              <div className="grid g-3" style={{ gap: 12 }}>
                <div className="field"><label className="label">Dagsmål · sälj</label><input className="input" type="number" min={0} step={1} value={goals.daily_sales} onChange={(e) => set('daily_sales', e.target.value)} /></div>
                <div className="field"><label className="label">Dagsmål · TB (kr)</label><input className="input" type="number" min={0} step={100} value={goals.daily_tb} onChange={(e) => set('daily_tb', e.target.value)} /></div>
                <div />
                <div className="field"><label className="label">Veckomål · sälj</label><input className="input" type="number" min={0} step={1} value={goals.weekly_sales} onChange={(e) => set('weekly_sales', e.target.value)} /></div>
                <div className="field"><label className="label">Veckomål · TB (kr)</label><input className="input" type="number" min={0} step={100} value={goals.weekly_tb} onChange={(e) => set('weekly_tb', e.target.value)} /></div>
                <div />
                <div className="field"><label className="label">Månadsmål · sälj</label><input className="input" type="number" min={0} step={1} value={goals.monthly_sales} onChange={(e) => set('monthly_sales', e.target.value)} /></div>
                <div className="field"><label className="label">Månadsmål · TB (kr)</label><input className="input" type="number" min={0} step={100} value={goals.monthly_tb} onChange={(e) => set('monthly_tb', e.target.value)} /></div>
                <div />
              </div>
              {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn btn-primary" onClick={save} disabled={busy || !form}><Icon name="save" size={15} /> {busy ? 'Sparar…' : 'Spara mål'}</button>
                {form && <button className="btn btn-ghost" onClick={() => { setForm(null); setError(null); }}>Ångra</button>}
              </div>
              <div className="note" style={{ marginTop: 12 }}><Icon name="info" size={15} /><span>Måländringar påverkar bara framtida prognoser och måluppfyllelse. Historik räknas alltid mot då gällande registreringar — inga siffror ändras.</span></div>
            </>
          ) : (
            <Empty title="Inga mål hittades" icon="target">Ditt konto saknar målrader. Kontakta administratören.</Empty>
          )}
        </div>

        {!isManager && stat && (
          <div className="card">
            <div className="card-head"><div><div className="card-kicker">SÅ ANVÄNDS MÅLEN</div><h3>Takt &amp; prognos</h3></div></div>
            <div className="stack" style={{ gap: 12 }}>
              <div className="metric-row"><span>Måluppfyllelse månad</span><b>{stat.goalPct}%</b></div>
              <div className="metric-row"><span>Måluppfyllelse TB</span><b>{stat.tbGoalPct}%</b></div>
              <div className="metric-row"><span>Kvar till målet</span><b>{stat.goalGap > 0 ? `${fmt(stat.goalGap)} sälj` : 'Målet är nått'}</b></div>
              <div className="metric-row"><span>Återstående arbetsdagar</span><b>{stat.remainingWorkdays}</b></div>
              <div className="metric-row"><span>Nödvändig takt</span><b>{stat.requiredPerRemaining != null ? `${f1(stat.requiredPerRemaining)} sälj/arbetsdag` : '–'}</b></div>
              <div className="metric-row"><span>Prognos</span><b>{stat.projection != null ? `${fmt(stat.projection)} sälj` : '–'}</b></div>
              <div className="metric-row"><span>Underlag</span><b>{stat.registeredWorkdays}/{stat.elapsedWorkdays} vardagar registrerade</b></div>
              <div className={`note ${stat.paceReliable ? 'mint' : ''}`}>
                <Icon name={stat.paceReliable ? 'check-circle' : 'alert'} size={15} />
                <span>{stat.paceReliable ? 'Prognosen bygger på ett tillräckligt underlag av registrerade arbetsdagar.' : stat.projectionReason || 'Prognosen är osäker — komplettera saknade dagar.'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
