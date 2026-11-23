'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/app-provider';
import { Icon } from '@/components/icons';
import { Avatar, Badge, Card, Delta, Empty, Kpi, Progress, Ring, Skeleton, Sparkline, StackedBar } from '@/components/ui';
import { TrendChart, dailyPoints } from '@/components/charts';
import { buildShareText } from '@/lib/report';
import { PlannerCard } from '@/components/planner-card';
import type { PlannerRow } from '@/lib/analysis';
import {
  bestWeek,
  buildLeaderboard,
  buildMonthCsv,
  buildMonthStats,
  compareMonths,
  currentMonthKey,
  dateLabel,
  downloadText,
  f1,
  fmt,
  fmtMoney,
  monthLabel,
  monthOptions,
  monthOf,
  pct,
  personalRecord,
  previousMonthKey,
  productSplit,
  registeredStreak,
  teamStats,
  todayISO,
  trend,
  weeklySeries,
  weekToDate,
  weekdayShort,
  workdaysInMonth,
  type Entry,
  type MonthStats,
  type TeamMember,
} from '@/lib/calc';
import { paceText } from '@/lib/coach';

type CalcMember = { username: string; display_name: string; role: string; goals: TeamMember['goals']; entries: Entry[] };

function toCalcMember(t: TeamMember): CalcMember {
  return {
    username: t.username,
    display_name: t.display_name,
    role: t.role,
    goals: t.goals,
    entries: t.entries.map((e) => ({
      ...e,
      note: null,
      rating: null,
      mood: null,
      tags: [],
    })) as Entry[],
  };
}

function LeaderCard({ row, rank }: { row: MonthStats | null; rank: number }) {
  if (!row) {
    return (
      <div className="leader-card second">
        <span className="leader-rank">PLACERING {rank}</span>
        <div className="leader-name">Ingen registrering</div>
        <div className="leader-sales">–</div>
        <div className="card-note">Ingen säljare har registrerat den här månaden.</div>
      </div>
    );
  }
  return (
    <div className={`leader-card ${rank === 1 ? '' : 'second'}`}>
      {rank === 1 && <span className="crown" aria-hidden="true">♛</span>}
      <span className="leader-rank">PLACERING {rank}</span>
      <div className="leader-name">
        <Avatar name={row.display_name} size="sm" /> {row.display_name}
        {row.isCurrent && row.paceReliable && row.aheadOfPlan != null && row.aheadOfPlan > 0 && <Badge tone="green">Före plan</Badge>}
      </div>
      <div className="leader-sales">{fmt(row.sales)}<small> sälj</small></div>
      <div className="leader-meta">
        <div><span>TB</span><b>{fmtMoney(row.tb)}</b></div>
        <div><span>TB/sälj</span><b>{row.avgTbPerSale == null ? '–' : fmtMoney(row.avgTbPerSale)}</b></div>
        <div><span>Dagar</span><b>{row.days}</b></div>
        <div><span>Snitt/arbetsdag</span><b>{row.avgPerWorkday == null ? '–' : f1(row.avgPerWorkday)}</b></div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="row-between" style={{ marginBottom: 5 }}>
          <span className="card-note">Måluppfyllelse</span>
          <b style={{ fontSize: 12 }}>{row.goalPct}%</b>
        </div>
        <Progress value={row.goalPct} />
      </div>
      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <Badge tone="mint">Prognos {row.projection != null ? fmt(row.projection) : '–'}</Badge>
        <Badge>{paceText(row)}</Badge>
      </div>
    </div>
  );
}

function PaceCard({ row }: { row: MonthStats }) {
  const lines = [
    row.days ? `Du har sålt ${fmt(row.sales)} produkter hittills.` : 'Inga registreringar den här månaden ännu.',
    row.avgPerWorkday != null ? `Du ligger på ${f1(row.avgPerWorkday)} sälj per arbetsdag.` : 'Takten kan inte beräknas än.',
    row.projection != null ? `Din beräknade månadsslutsprognos är ${fmt(row.projection)}.` : row.projectionReason || 'Prognosen kan inte beräknas än.',
    row.requiredPerRemaining != null
      ? `Du behöver ${f1(row.requiredPerRemaining)} sälj per återstående arbetsdag för att nå ditt mål.`
      : row.goalGap === 0 && row.isFinal
        ? 'Månadsmålet är nått.'
        : row.goalGap === 0
          ? 'Månadsmålet är nått.'
          : 'Den nödvändiga takten kan inte beräknas än.',
  ];
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-kicker">TAKT &amp; PROGNOS</div>
          <h3>{row.display_name}</h3>
        </div>
        <Badge tone={row.paceReliable ? 'mint' : 'gold'}>{row.paceReliable ? 'Tillförlitligt underlag' : 'Tunt underlag'}</Badge>
      </div>
      <div className="insight-list" style={{ marginTop: 4 }}>
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </div>
      <div className="grid g-2" style={{ marginTop: 14 }}>
        <div>
          <div className="card-kicker">Täckning</div>
          <b style={{ fontSize: 18 }}>{row.registeredWorkdays}/{row.elapsedWorkdays}</b>
          <div className="card-note">registrerade av passerade arbetsdagar</div>
        </div>
        <div>
          <div className="card-kicker">Mål</div>
          <b style={{ fontSize: 18 }}>{fmt(row.sales)} / {fmt(row.goals.monthly_sales)}</b>
          <div className="card-note">{row.goalPct}% uppfyllt</div>
        </div>
      </div>
      <Progress value={row.goalPct} className="lg" />
      <div className="note" style={{ marginTop: 14 }}>
        <Icon name="info" size={15} />
        <span>
          {row.projection != null
            ? `Prognosen bygger på ${row.registeredWorkdays} registrerade arbetsdagar och ${row.totalWorkdays} arbetsdagar i månaden.`
            : 'En dag utan registrering räknas aldrig som noll. Komplettera saknade dagar för en säkrare prognos.'}
        </span>
      </div>
    </div>
  );
}

function ProductPanel({ members, monthKey }: { members: CalcMember[]; monthKey: string }) {
  const sellers = members.filter((m) => m.role === 'seller');
  const rows = sellers.map((m) => {
    const stats = buildMonthStats(m.username, m.display_name, m.entries, m.goals, monthKey);
    return { ...m, stats };
  });
  const total = rows.reduce(
    (acc, r) => {
      const s = productSplit(r.stats.entries);
      acc.brandSales += s.brandSales;
      acc.konsSales += s.konsSales;
      acc.brandTb += s.brandTb;
      acc.konsTb += s.konsTb;
      acc.unsplitSales += s.unsplitSales;
      acc.splitEntries += s.splitEntries;
      acc.totalEntries += s.totalEntries;
      return acc;
    },
    { brandSales: 0, konsSales: 0, brandTb: 0, konsTb: 0, unsplitSales: 0, splitEntries: 0, totalEntries: 0 },
  );
  const splitTotal = total.brandSales + total.konsSales;
  const ranking = [
    { key: 'brandkollen', label: 'Brandkollen', sales: total.brandSales, tb: total.brandTb },
    { key: 'konsumentkollen', label: 'Konsumentkollen', sales: total.konsSales, tb: total.konsTb },
  ].sort((a, b) => b.sales - a.sales);
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <div><div className="card-kicker">FÖRDELNING · {monthLabel(monthKey)}</div><h3>Brandkollen vs Konsumentkollen</h3></div>
          <Badge tone="ice">Produktsplit</Badge>
        </div>
        <StackedBar
          segments={[
            { value: total.brandSales, className: 'brand', label: 'Brandkollen' },
            { value: total.konsSales, className: 'kons', label: 'Konsumentkollen' },
            { value: total.unsplitSales, className: 'unsplit', label: 'Ej uppdelat' },
          ]}
        />
        <div className="legend" style={{ marginTop: 10 }}>
          <span><i style={{ background: '#7dd3fc' }} />Brandkollen {fmt(total.brandSales)} sälj</span>
          <span><i style={{ background: '#5eead4' }} />Konsumentkollen {fmt(total.konsSales)} sälj</span>
          <span><i style={{ background: 'rgba(255,255,255,.35)' }} />Ej uppdelat {fmt(total.unsplitSales)} sälj</span>
        </div>
        <div className="card-note" style={{ marginTop: 8 }}>
          {total.totalEntries} registreringar · {total.splitEntries} har produktuppdelning · {total.totalEntries - total.splitEntries} visas som Ej uppdelat.
        </div>
      </div>

      <div className="grid g-2">
        {ranking.map((p, i) => (
          <div className="product-card" key={p.key}>
            <div className="pc-top">
              <span className={`dot ${p.key === 'brandkollen' ? 'brand' : 'kons'}`} />
              <span className="pc-name">{p.label}</span>
              <span className="badge" style={{ marginLeft: 'auto' }}>#{i + 1}</span>
            </div>
            <div className="pc-val">{fmt(p.sales)}<small style={{ fontSize: 12, color: 'var(--mu)' }}> sälj</small></div>
            <div className="pc-sub">{fmtMoney(p.tb)} TB · {splitTotal ? Math.round((p.sales / splitTotal) * 100) : 0}% av uppdelat</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-kicker">PER SÄLJARE</div><h3>Vilken produkt presterar varje säljare bäst på?</h3></div>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Säljare</th><th className="r">Brandkollen</th><th className="r">Konsumentkollen</th><th className="r">Ej uppdelat</th><th>Bäst på</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const s = productSplit(r.stats.entries);
                const best = s.brandSales === s.konsSales ? 'Jämnt' : s.brandSales > s.konsSales ? 'Brandkollen' : 'Konsumentkollen';
                return (
                  <tr key={r.username}>
                    <td className="strong">{r.display_name}</td>
                    <td className="r">{fmt(s.brandSales)}</td>
                    <td className="r">{fmt(s.konsSales)}</td>
                    <td className="r">{fmt(s.unsplitSales)}</td>
                    <td>{s.brandSales || s.konsSales ? <Badge tone={best === 'Brandkollen' ? 'ice' : best === 'Konsumentkollen' ? 'mint' : 'default'}>{best}</Badge> : <span className="muted">Ingen uppdelning</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card-note" style={{ marginTop: 10 }}>Gamla registreringar utan produktuppdelning räknas som Ej uppdelat — aldrig som noll.</div>
      </div>
    </div>
  );
}

function TrendsPanel({ members, monthKey }: { members: CalcMember[]; monthKey: string }) {
  const sellers = members.filter((m) => m.role === 'seller');
  return (
    <div className="stack">
      <div className="grid g-2">
        {sellers.map((m) => {
          const stats = buildMonthStats(m.username, m.display_name, m.entries, m.goals, monthKey);
          const bestW = bestWeek(m.entries);
          const bestD = personalRecord(m.entries);
          const t7 = trend(m.entries, 7);
          const t30 = trend(m.entries, 30);
          const weeks = weeklySeries(m.entries, 8);
          const streak = registeredStreak(m.entries);
          const wow = weekToDate(m.entries);
          const hours = stats.hours;
          return (
            <div className="card" key={m.username}>
              <div className="card-head">
                <div><div className="card-kicker">UTVECKLING</div><h3>{m.display_name}</h3></div>
                <Badge tone={t7.pct != null && t7.pct >= 0 ? 'green' : t7.pct != null ? 'red' : 'default'}>{t7.pct != null ? `${t7.pct >= 0 ? '+' : ''}${t7.pct}% 7 d` : '7 d: underlag saknas'}</Badge>
              </div>
              <div className="grid g-3" style={{ gap: 8 }}>
                <div className="trend-box"><span>Bästa vecka</span><b>{bestW ? fmt(bestW.sales) : '–'}</b><small>{bestW ? bestW.key : 'Ingen data'}</small></div>
                <div className="trend-box"><span>Bästa dag</span><b>{bestD ? fmt(bestD.sales) : '–'}</b><small>{bestD ? bestD.entry_date : 'Ingen data'}</small></div>
                <div className="trend-box"><span>Personligt rekord</span><b>{bestD ? fmt(bestD.sales) : '–'}</b><small>sälj under en dag</small></div>
                <div className="trend-box"><span>Sälj/timme</span><b>{hours > 0 ? f1(stats.sales / hours) : '–'}</b><small>{hours ? `${f1(hours)} h registrerade` : 'Inga timmar'}</small></div>
                <div className="trend-box"><span>Snitt-TB</span><b>{stats.avgTbPerSale == null ? '–' : fmtMoney(stats.avgTbPerSale)}</b><small>per sälj</small></div>
                <div className="trend-box"><span>Aktivitetsrad</span><b>{streak} dagar</b><small>med registrering</small></div>
              </div>
              <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
                <span className="card-note">Vecka mot vecka</span><Delta value={wow.pct} />
                <span className="card-note" style={{ fontSize: 10.5 }}>{wow.days} dagar denna vecka · {wow.previousDays} förra veckan (samma veckodag)</span>
              </div>
              <div className="row" style={{ marginTop: 12, gap: 10 }}>
                <span className="card-note">7-dagars­trend</span><Delta value={t7.pct} />
                <span className="card-note" style={{ marginLeft: 8 }}>30-dagars­trend</span><Delta value={t30.pct} />
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <div className="card-kicker">Senaste 30 dagarna · sälj per dag</div>
                  <span className="card-note">streckad linje = dagsmål {m.goals.daily_sales}</span>
                </div>
                <TrendChart points={dailyPoints(m.entries, 30, weekdayShort, todayISO())} goal={m.goals.daily_sales} height={170} unit=" sälj" ariaLabel={`${m.display_name}, sälj per dag de senaste 30 dagarna`} />
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="card-kicker" style={{ marginBottom: 6 }}>8 veckor · sälj</div>
                <Sparkline values={weeks.map((w) => w.sales)} height={64} goal={m.goals.weekly_sales} />
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                  {weeks.map((w) => <span key={w.key} className="dim" style={{ fontSize: 9 }} title={`${w.key}: ${w.sales} sälj`}>{w.label.slice(3)}</span>)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card">
        <div className="card-head"><div><div className="card-kicker">TOPPRESULTAT</div><h3>Månadens toppresultat</h3></div></div>
        <div className="grid g-3">
          {sellers.map((m) => {
            const stats = buildMonthStats(m.username, m.display_name, m.entries, m.goals, monthKey);
            return (
              <div key={m.username}>
                <div className="card-kicker">{m.display_name}</div>
                <div className="big-number">{fmt(stats.sales)}<small> sälj</small></div>
                <div className="card-note">{fmtMoney(stats.tb)} TB · {stats.days} registrerade dagar</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ members, monthKey, onPick }: { members: CalcMember[]; monthKey: string; onPick: (m: string) => void }) {
  const allEntries = members.flatMap((m) => m.entries);
  const months = monthOptions(allEntries).slice(-12).reverse();
  const cmp = compareMonths(members.flatMap((m) => m.entries.map((e) => ({ ...e, seller_username: m.username }))) as Entry[], monthKey);
  return (
    <div className="grid g-2">
      <div className="card">
        <div className="card-head"><div><div className="card-kicker">HISTORIK</div><h3>Vann tidigare månader?</h3></div></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Månad</th><th>Vinnare</th><th className="r">Sälj</th><th className="r">Arbetsdagar</th><th /></tr></thead>
            <tbody>
              {months.map((mk) => {
                const rows = buildLeaderboard(members, mk);
                const top = rows[0];
                return (
                  <tr key={mk}>
                    <td>{monthLabel(mk, 'short')}</td>
                    <td className="strong">{top && top.sales > 0 ? top.display_name : <span className="muted">Ingen data</span>}</td>
                    <td className="r">{top ? fmt(top.sales) : '–'}</td>
                    <td className="r">{workdaysInMonth(mk)}</td>
                    <td className="r"><button className="btn btn-sm btn-ghost" onClick={() => onPick(mk)}>Visa</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div><div className="card-kicker">JÄMFÖRELSE</div><h3>{monthLabel(monthKey)} mot {monthLabel(previousMonthKey(monthKey))}</h3></div></div>
        {cmp ? (
          <>
            <div className="grid g-2">
              <div><div className="card-kicker">Föregående period</div><div className="big-number" style={{ fontSize: 30 }}>{fmt(cmp.previous.sales)}<small> sälj</small></div><div className="card-note">{cmp.previous.days} registrerade dagar · {fmtMoney(cmp.previous.tb)} TB</div></div>
              <div><div className="card-kicker">Vald period</div><div className="big-number" style={{ fontSize: 30 }}>{fmt(cmp.current.sales)}<small> sälj</small></div><div className="card-note">{cmp.current.days} registrerade dagar · {fmtMoney(cmp.current.tb)} TB</div></div>
            </div>
            <div className="row" style={{ marginTop: 14, gap: 10 }}>
              <span className="card-note">Sälj</span><Delta value={cmp.salesPct} />
              <span className="card-note">TB</span><Delta value={cmp.tbPct} />
            </div>
            <div className="note mint" style={{ marginTop: 12 }}>
              <Icon name="check-circle" size={15} />
              <span>{cmp.samePeriod ? 'Jämförelsen använder samma förflutna kalenderperiod — inte en hel månad mot en ofullständig.' : 'Båda månaderna är slutförda och jämförs i sin helhet.'}</span>
            </div>
          </>
        ) : (
          <Empty title="Ingen jämförbar period" icon="calendar">Det finns inga registreringar för den föregående perioden.</Empty>
        )}
      </div>
    </div>
  );
}

export default function MonthPage() {
  const { data, loading, error, toast } = useApp();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [view, setView] = useState<'overview' | 'trends' | 'product' | 'history'>('overview');

  const members = useMemo<CalcMember[]>(() => (data?.team || []).map(toCalcMember), [data]);
  const allEntries = useMemo(() => members.flatMap((m) => m.entries), [members]);
  const months = useMemo(() => monthOptions(allEntries), [allEntries]);
  const leader = useMemo(() => buildLeaderboard(members, monthKey), [members, monthKey]);
  const team = useMemo(() => teamStats(members, monthKey), [members, monthKey]);
  const current = monthKey === currentMonthKey();

  if (loading) {
    return (
      <div>
        <Skeleton height={64} />
        <div className="grid g-3" style={{ marginTop: 16 }}><Skeleton height={110} /><Skeleton height={110} /><Skeleton height={110} /></div>
        <div className="grid g-2" style={{ marginTop: 14 }}><Skeleton height={260} /><Skeleton height={260} /></div>
      </div>
    );
  }
  if (error || !data) {
    return <div className="card"><div className="card-kicker">DATAKÄLLA</div><h3>Kunde inte ladda månadsdata</h3><p className="card-note">{error}</p></div>;
  }

  function exportCsv() {
    const csv = buildMonthCsv(monthKey, members);
    downloadText(`label-lab-${monthKey}.csv`, csv);
    toast(`CSV för ${monthLabel(monthKey)} är nedladdad.`);
  }

  async function shareReport() {
    const text = buildShareText(monthKey, members, data!.me);
    try {
      await navigator.clipboard.writeText(text);
      toast(`Rapport för ${monthLabel(monthKey)} är kopierad — klistra in i WhatsApp eller Slack.`);
    } catch {
      toast('Kunde inte kopiera automatiskt.', 'err');
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>MÅNADSÖVERSIKT · {monthLabel(monthKey).toUpperCase()}</div>
          <h1 className="page-title">Månadsresultat</h1>
          <p className="page-sub">
            Teamets försäljning, TB, takt och prognoser — beräknat från verkliga registreringar med Europe/Stockholm som datumgräns.
          </p>
        </div>
        <div className="page-head-actions">
          <select className="select month-select" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} aria-label="Välj månad">
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button className="btn" onClick={shareReport} title="Kopiera en textsammanfattning att dela"><Icon name="share" size={15} /> Kopiera rapport</button>
          <button className="btn" onClick={exportCsv}><Icon name="download" size={15} /> CSV</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        <Kpi label="Total försäljning" value={fmt(team.sales)} sub={`${team.rows.filter((r) => r.sales > 0).length} säljare med registrering`} tone="mint" />
        <Kpi label="Totalt TB" value={`${fmt(team.tb / 1000)}k`} sub={`kr · ${fmtMoney(team.tb)}`} tone="ice" />
        <Kpi label="Månadsledare" value={team.leader ? team.leader.display_name : '–'} sub={team.leader ? `${fmt(team.leader.sales)} sälj · ${fmt(team.leader.tb)} kr TB` : 'Ingen registrering'} tone="gold" />
        <Kpi label="Teamets måluppfyllelse" value={`${team.goalPct}%`} sub={`${fmt(team.sales)} av ${fmt(team.goal)} sälj`} />
        <Kpi label="Förväntat slutresultat" value={team.projection != null ? fmt(team.projection) : '–'} sub={team.projectionReliable ? 'Baserat på registrerade arbetsdagar' : 'Underlag saknas'} tone="violet" />
        <Kpi label="Återstående arbetsdagar" value={String(team.remainingWorkdays)} sub={`${team.elapsedWorkdays} passerade · ${workdaysInMonth(monthKey)} totalt`} />
      </div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        {[
          ['overview', 'Översikt'],
          ['trends', 'Utveckling'],
          ['product', 'Produkter'],
          ['history', 'Historik'],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${view === id ? 'on' : ''}`} onClick={() => setView(id as any)}>{label}</button>
        ))}
      </div>

      {view === 'overview' && (
        <>
          <div className="month-hero" style={{ marginBottom: 14 }}>
            <LeaderCard row={leader[0] || null} rank={1} />
            <LeaderCard row={leader[1] || null} rank={2} />
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-head">
              <div><div className="card-kicker">INDIVIDUELL JÄMFÖRELSE</div><h3>Sida vid sida</h3></div>
              <Badge tone="mint">Bara säljare rankas</Badge>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th><th>Säljare</th>
                    <th className="r">Sälj</th><th className="r">TB</th><th className="r">TB/sälj</th>
                    <th className="r">Dagar</th><th className="r">Snitt/arbetsdag</th><th className="r">Bästa dag</th>
                    <th className="r">Måluppfyllelse</th><th className="r">Månadstakt</th><th className="r">Prognos</th>
                  </tr>
                </thead>
                <tbody>
                  {leader.map((r) => (
                    <tr key={r.username} className={r.username === data.me.username ? 'me' : ''}>
                      <td><span className={`badge ${r.rank === 1 ? 'gold' : ''}`}>{r.rank}</span></td>
                      <td className="strong">{r.display_name}{r.username === data.me.username && <span className="dim" style={{ fontSize: 10, marginLeft: 5 }}>du</span>}</td>
                      <td className="r strong">{fmt(r.sales)}</td>
                      <td className="r">{fmtMoney(r.tb)}</td>
                      <td className="r">{r.avgTbPerSale == null ? '–' : fmtMoney(r.avgTbPerSale)}</td>
                      <td className="r">{r.days}</td>
                      <td className="r">{r.avgPerWorkday == null ? '–' : f1(r.avgPerWorkday)}</td>
                      <td className="r">{r.bestDay ? `${fmt(r.bestDay.sales)}` : '–'}</td>
                      <td className="r">{r.goalPct}%</td>
                      <td className="r">{paceText(r)}</td>
                      <td className="r">{r.projection != null ? fmt(r.projection) : '–'}</td>
                    </tr>
                  ))}
                  {!leader.length && (
                    <tr><td colSpan={11}><Empty title="Inga säljare" icon="team">Lägg till säljarkonton i Supabase (app_users).</Empty></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="card-note" style={{ marginTop: 10 }}>
              Måluppfyllelse = registrerade sälj / individuell månadsmål. Månadstakt = sälj per registrerad arbetsdag. Prognos visas bara när underlaget är tillräckligt.
            </div>
          </div>

          <div className="grid g-2" style={{ marginBottom: 14 }}>
            {leader.map((r) => <PaceCard key={r.username} row={r} />)}
          </div>

          {current && leader.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <PlannerCard
                rows={leader.map((r) => ({ key: r.username, label: r.display_name, sales: r.sales, tb: r.tb, avgTbPerSale: r.avgTbPerSale, openWorkdays: r.openWorkdays, days: r.registeredWorkdays })) as PlannerRow[]}
                goalSales={team.goal}
                goalTb={team.tbGoal}
                dailySales={leader.reduce((s, r) => s + Number(r.goals.daily_sales || 0), 0) / leader.length}
                dailyTb={leader.reduce((s, r) => s + Number(r.goals.daily_tb || 0), 0) / leader.length}
                subject={data.me.role === 'seller' ? 'du' : 'teamet'}
              />
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <div><div className="card-kicker">8 VECKOR · TEAMET</div><h3>Veckoförsäljning</h3></div>
            </div>
            <div className="grid g-2">
              {leader.map((r) => {
                const member = members.find((m) => m.username === r.username)!;
                const weeks = weeklySeries(member.entries, 8);
                return (
                  <div key={r.username}>
                    <div className="row-between" style={{ marginBottom: 8 }}><b style={{ fontSize: 12 }}>{r.display_name}</b><span className="card-note">{fmt(r.sales)} sälj denna månad</span></div>
                    <div className="bars" style={{ height: 130 }}>
                      {weeks.map((w) => (
                        <div className="bar-col" key={w.key} title={`${w.key}: ${w.sales} sälj`}>
                          <span className="bar-val">{w.sales}</span>
                          <div className="bar-track"><div className={`bar ${w.sales === 0 ? 'zero' : ''}`} style={{ height: `${Math.max(3, (w.sales / Math.max(1, ...weeks.map((x) => x.sales))) * 100)}%` }} /></div>
                          <span className="bar-lab">{w.label.slice(3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {view === 'trends' && <TrendsPanel members={members} monthKey={monthKey} />}
      {view === 'product' && <ProductPanel members={members} monthKey={monthKey} />}
      {view === 'history' && <HistoryPanel members={members} monthKey={monthKey} onPick={setMonthKey} />}

      <div className="note" style={{ marginTop: 16 }}>
        <Icon name="info" size={15} />
        <span>
          Chefer ser hela teamets resultat i den här vyn, men bara säljare ingår i säljrankingen. Alla beräkningar
          använder registrerade dagar — en dag utan registrering räknas aldrig som noll.
        </span>
      </div>
    </div>
  );
}
