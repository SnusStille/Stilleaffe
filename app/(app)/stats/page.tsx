'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { Icon } from '@/components/icons';
import { Avatar, Badge, Delta, Empty, Skeleton } from '@/components/ui';
import {
  addDays,
  bestGoalStreak,
  bestWeek,
  buildMonthStats,
  currentMonthKey,
  f1,
  fmt,
  fmtMoney,
  isWorkday,
  monthLabel,
  monthOf,
  monthOptions,
  personalRecord,
  productSplit,
  registeredStreak,
  goalStreak,
  todayISO,
  trend,
  weeklySeries,
  workdaysInMonth,
  type Entry,
} from '@/lib/calc';

type CalcMember = { username: string; display_name: string; role: string; goals: any; entries: Entry[] };

function toCalc(t: any): CalcMember {
  return { ...t, entries: t.entries.map((e: any) => ({ ...e, note: null, rating: null, mood: null, tags: [] })) };
}

export default function StatsPage() {
  const { data, loading, me } = useApp();
  const isManager = me.role === 'manager';
  const [who, setWho] = useState<string>(me.username);

  const members = useMemo<CalcMember[]>(() => (data?.team || []).map(toCalc), [data]);
  const sellers = members.filter((m) => m.role === 'seller');
  const subject = isManager ? sellers.find((m) => m.username === who) || sellers[0] : members.find((m) => m.username === me.username);

  const stats = useMemo(() => {
    if (!subject) return null;
    const entries = subject.entries;
    const monthKey = currentMonthKey();
    const ms = buildMonthStats(subject.username, subject.display_name, entries, subject.goals, monthKey);
    const weeks = weeklySeries(entries, 12);
    const months = monthOptions(entries.map((e) => ({ entry_date: e.entry_date }))).slice(-12).reverse();
    const split = productSplit(entries);
    const byWeekday: { day: string; sales: number; count: number }[] = Array.from({ length: 7 }, (_, i) => ({ day: ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'][i], sales: 0, count: 0 }));
    for (const e of entries) {
      const d = new Date(e.entry_date + 'T00:00:00Z').getUTCDay();
      byWeekday[d].sales += Number(e.sales || 0);
      byWeekday[d].count += 1;
    }
    // Heatmap: last 16 weeks (columns = weeks, rows = weekdays). Missing workdays = hatched, registered zero = zero.
    const today = todayISO();
    const start = addDays(today, -((16 * 7) - 1));
    const monday = addDays(start, -((new Date(start + 'T00:00:00Z').getUTCDay() + 6) % 7));
    const byDate = new Map(entries.map((e) => [e.entry_date, e]));
    const heat: { date: string; state: 'none' | 'miss' | 'zero' | 'on' | 'hot'; sales: number }[] = [];
    for (let d = monday; d <= today; d = addDays(d, 1)) {
      const e = byDate.get(d);
      if (!e) heat.push({ date: d, state: isWorkday(d) && d <= today ? 'miss' : 'none', sales: 0 });
      else if (Number(e.sales) === 0) heat.push({ date: d, state: 'zero', sales: 0 });
      else heat.push({ date: d, state: Number(e.sales) >= ms.avgPerWorkday! * 1.2 ? 'hot' : 'on', sales: Number(e.sales) });
    }
    const maxHeat = Math.max(1, ...heat.map((h) => h.sales));
    return { ms, weeks, months, split, byWeekday, heat, maxHeat };
  }, [subject]);

  if (loading) return <div><Skeleton height={64} /><div className="grid g-4" style={{ marginTop: 16 }}>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={90} />)}</div></div>;
  if (!data || !stats || !subject) return <div className="card"><h3>Ingen statistik</h3><p className="card-note">Det finns inga registreringar att visa ännu.</p></div>;

  const { ms, weeks, months, split, byWeekday, heat, maxHeat } = stats;
  const entries = subject.entries;
  const bw = bestWeek(entries);
  const pr = personalRecord(entries);
  const t7 = trend(entries, 7);
  const t30 = trend(entries, 30);
  const streak = registeredStreak(entries);
  const gs = goalStreak(entries, subject.goals);
  const bgs = bestGoalStreak(entries, subject.goals);
  const lifetimeSales = entries.reduce((s, e) => s + Number(e.sales || 0), 0);
  const lifetimeTb = entries.reduce((s, e) => s + Number(e.tb_sek || 0), 0);
  const lifetimeHours = entries.reduce((s, e) => s + Number(e.hours || 0), 0);
  const salesDays = entries.filter((e) => Number(e.sales) > 0).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>STATISTIK · {subject.display_name.toUpperCase()}</div>
          <h1 className="page-title">Statistik</h1>
          <p className="page-sub">Dina siffror i fördjupning — rekord, takter, trender och mönster. Allt bygger på registrerade dagar; saknade dagar är aldrig noll.</p>
        </div>
        <div className="page-head-actions">
          {isManager && (
            <select className="select" value={subject.username} onChange={(e) => setWho(e.target.value)} aria-label="Välj säljare">
              {sellers.map((m) => <option key={m.username} value={m.username}>{m.display_name}</option>)}
            </select>
          )}
          <div className="row" style={{ gap: 8, alignItems: 'center' }}><Avatar name={subject.display_name} role="seller" size="sm" /><b style={{ fontSize: 13 }}>{subject.display_name}</b></div>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <div className="stat-tile"><span>Bästa vecka</span><b>{bw ? fmt(bw.sales) : '–'}</b><small>{bw ? bw.key : 'Ingen data'}</small></div>
        <div className="stat-tile"><span>Bästa dag · personligt rekord</span><b>{pr ? fmt(pr.sales) : '–'}</b><small>{pr ? pr.entry_date : 'Ingen data'}</small></div>
        <div className="stat-tile"><span>Sälj per timme</span><b>{ms.salesPerHour != null ? f1(ms.salesPerHour) : '–'}</b><small>{ms.hours ? `${f1(ms.hours)} h denna månad` : 'Inga timmar denna månad'}</small></div>
        <div className="stat-tile"><span>Snitt-TB per sälj</span><b>{ms.avgTbPerSale == null ? '–' : fmtMoney(ms.avgTbPerSale)}</b><small>{fmt(ms.sales)} sälj denna månad</small></div>
        <div className="stat-tile"><span>7-dagarstrend</span><b><Delta value={t7.pct} /></b><small>{t7.current} mot {t7.previous} sälj</small></div>
        <div className="stat-tile"><span>30-dagarstrend</span><b><Delta value={t30.pct} /></b><small>{t30.current} mot {t30.previous} sälj</small></div>
        <div className="stat-tile"><span>Aktivitetsrad</span><b>{streak} dagar</b><small>i rad med registrering</small></div>
        <div className="stat-tile"><span>Målad i rad</span><b>{gs} dagar</b><small>rekord {bgs} dagar</small></div>
        <div className="stat-tile"><span>Totalt genom tiderna</span><b>{fmt(lifetimeSales)}</b><small>{fmtMoney(lifetimeTb)} TB · {entries.length} registreringar</small></div>
        <div className="stat-tile"><span>Snitt per arbetsdag</span><b>{ms.avgPerWorkday == null ? '–' : f1(ms.avgPerWorkday)}</b><small>{ms.registeredWorkdays}/{ms.elapsedWorkdays} vardagar denna månad</small></div>
        <div className="stat-tile"><span>Dagar med sälj</span><b>{salesDays}</b><small>av {entries.length} registrerade dagar</small></div>
        <div className="stat-tile"><span>Snitt-TB totalt</span><b>{lifetimeSales ? fmtMoney(lifetimeTb / lifetimeSales) : '–'}</b><small>{lifetimeHours ? `${f1(lifetimeSales / lifetimeHours)} sälj/h totalt` : 'Inga timmar'}</small></div>
      </div>

      <div className="grid g-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-head"><div><div className="card-kicker">12 VECKOR</div><h3>Veckoförsäljning</h3></div><Badge tone="mint">Sälj / vecka</Badge></div>
          <div className="bars" style={{ height: 180 }}>
            {weeks.map((w) => (
              <div className="bar-col" key={w.key} title={`${w.key}: ${w.sales} sälj · ${w.days} dagar`}>
                <span className="bar-val">{w.sales}</span>
                <div className="bar-track"><div className={`bar ${w.days === 0 ? 'miss' : w.sales === 0 ? 'zero' : ''}`} style={{ height: `${Math.max(3, (w.sales / Math.max(1, ...weeks.map((x) => x.sales))) * 100)}%` }} /></div>
                <span className="bar-lab">{w.label.slice(3)}</span>
              </div>
            ))}
          </div>
          <div className="legend" style={{ marginTop: 10 }}>
            <span><i style={{ background: 'linear-gradient(180deg, rgba(94,234,212,0.9), rgba(45,212,191,0.25))' }} />Registrerad</span>
            <span><i style={{ background: 'rgba(255,255,255,0.14)' }} />Registrerad noll</span>
            <span><i style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 3px, transparent 3px 6px)' }} />Ingen registrering</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div><div className="card-kicker">16 VECKOR · KALENDER</div><h3>Aktivitetskarta</h3></div></div>
          <div style={{ overflowX: 'auto' }}>
            <div className="heat" style={{ gridTemplateRows: 'repeat(7, 14px)', gridAutoColumns: 'minmax(12px, 1fr)', minWidth: 320 }}>
              {heat.map((h) => (
                <div
                  key={h.date}
                  className={`cell ${h.state === 'miss' ? 'zero' : h.state === 'zero' ? 'zero' : h.state === 'none' ? '' : h.state === 'hot' ? 'hot' : h.state === 'on' ? 'on' : ''}`}
                  title={`${h.date}: ${h.state === 'miss' ? 'ej registrerad' : h.state === 'zero' ? '0 sälj (registrerad)' : h.state === 'none' ? 'helg' : `${h.sales} sälj`}`}
                  style={h.state === 'on' || h.state === 'hot' ? { opacity: 0.45 + (h.sales / maxHeat) * 0.55 } : h.state === 'miss' ? { background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.09) 0 3px, transparent 3px 6px)' } : undefined}
                />
              ))}
            </div>
          </div>
          <div className="legend" style={{ marginTop: 10 }}>
            <span><i style={{ background: 'rgba(94,234,212,0.8)' }} />Hög</span>
            <span><i style={{ background: 'rgba(94,234,212,0.4)' }} />Låg</span>
            <span><i style={{ background: 'rgba(255,255,255,0.12)' }} />Registrerad noll</span>
            <span><i style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 3px, transparent 3px 6px)' }} />Ej registrerad (räknas inte)</span>
          </div>
        </div>
      </div>

      <div className="grid g-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-head"><div><div className="card-kicker">VECKODAG</div><h3>Snittförsäljning per veckodag</h3></div></div>
          <div className="stack" style={{ gap: 8 }}>
            {byWeekday.map((d) => {
              const avg = d.count ? d.sales / d.count : 0;
              const max = Math.max(1, ...byWeekday.map((x) => (x.count ? x.sales / x.count : 0)));
              return (
                <div key={d.day} className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <span style={{ width: 30, fontSize: 11, color: 'var(--mu)' }}>{d.day}</span>
                  <div className="progress" style={{ flex: 1 }}><i style={{ width: `${(avg / max) * 100}%` }} /></div>
                  <span className="num" style={{ width: 56, textAlign: 'right', fontSize: 12 }}>{d.count ? f1(avg) : '–'}</span>
                  <span className="dim" style={{ width: 60, fontSize: 10.5, textAlign: 'right' }}>{d.count ? `${d.count} dagar` : 'ingen data'}</span>
                </div>
              );
            })}
          </div>
          <div className="card-note" style={{ marginTop: 10 }}>Snitt per registrerad dag. Veckodagar utan registreringar visar inget snitt.</div>
        </div>

        <div className="card">
          <div className="card-head"><div><div className="card-kicker">PRODUKTER · ALLTID</div><h3>Brandkollen vs Konsumentkollen</h3></div></div>
          <div className="stacked">
            <i className="brand" style={{ width: `${(split.brandSales / Math.max(1, split.brandSales + split.konsSales + split.unsplitSales)) * 100}%` }} />
            <i className="kons" style={{ width: `${(split.konsSales / Math.max(1, split.brandSales + split.konsSales + split.unsplitSales)) * 100}%` }} />
            <i className="unsplit" style={{ width: `${(split.unsplitSales / Math.max(1, split.brandSales + split.konsSales + split.unsplitSales)) * 100}%` }} />
          </div>
          <div className="legend" style={{ marginTop: 10 }}>
            <span><i style={{ background: '#7dd3fc' }} />Brandkollen {fmt(split.brandSales)} sälj · {fmtMoney(split.brandTb)} TB</span>
            <span><i style={{ background: '#5eead4' }} />Konsumentkollen {fmt(split.konsSales)} sälj · {fmtMoney(split.konsTb)} TB</span>
            <span><i style={{ background: 'rgba(255,255,255,.35)' }} />Ej uppdelat {fmt(split.unsplitSales)} sälj</span>
          </div>
          <div className="grid g-3" style={{ marginTop: 14, gap: 8 }}>
            <div className="stat-tile"><span>TB per sälj · BK</span><b>{split.brandSales ? fmtMoney(split.brandTb / split.brandSales) : '–'}</b></div>
            <div className="stat-tile"><span>TB per sälj · KK</span><b>{split.konsSales ? fmtMoney(split.konsTb / split.konsSales) : '–'}</b></div>
            <div className="stat-tile"><span>Uppdelade</span><b>{split.splitEntries}</b><small>av {split.totalEntries} registreringar</small></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><div className="card-kicker">MÅNADER</div><h3>Månadsöversikt</h3></div></div>
        <div className="table-wrap">
          <table className="tbl month-table">
            <thead><tr><th>Månad</th><th className="r">Sälj</th><th className="r">TB</th><th className="r">TB/sälj</th><th className="r">Dagar</th><th className="r">Arbetsdagar</th><th className="r">Snitt/arbetsdag</th><th className="r">Mål</th></tr></thead>
            <tbody>
              {months.map((mk) => {
                const s = buildMonthStats(subject.username, subject.display_name, entries, subject.goals, mk);
                return (
                  <tr key={mk} className={mk === currentMonthKey() ? 'me' : ''}>
                    <td className={mk === currentMonthKey() ? 'cur' : ''}>{monthLabel(mk)}{mk === currentMonthKey() && <span className="badge mint" style={{ marginLeft: 8 }}>pågående</span>}</td>
                    <td className="r strong">{fmt(s.sales)}</td>
                    <td className="r">{fmtMoney(s.tb)}</td>
                    <td className="r">{s.avgTbPerSale == null ? '–' : fmtMoney(s.avgTbPerSale)}</td>
                    <td className="r">{s.days}</td>
                    <td className="r">{s.elapsedWorkdays}{mk === currentMonthKey() ? ` / ${workdaysInMonth(mk)}` : ''}</td>
                    <td className="r">{s.avgPerWorkday == null ? '–' : f1(s.avgPerWorkday)}</td>
                    <td className="r">{s.goalPct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card-note" style={{ marginTop: 10 }}>Snitt per arbetsdag = sälj / registrerade arbetsdagar. För pågående månad visas passerade / totala arbetsdagar.</div>
      </div>
    </div>
  );
}
