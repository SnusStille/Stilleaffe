'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useApp } from '@/components/app-provider';
import { EntryForm } from '@/components/entry-form';
import { Icon } from '@/components/icons';
import { Modal, Ring, Progress, Kpi, Badge, Delta, Skeleton, Avatar, Sparkline } from '@/components/ui';
import { useAi } from '@/components/use-ai';
import {
  ACHIEVEMENTS,
  addDays,
  compareMonths,
  currentMonthKey,
  dateLabel,
  f1,
  fmt,
  fmtMoney,
  monthOf,
  pct,
  personalRecord,
  productSplit,
  registeredStreak,
  buildMonthStats,
  teamStats,
  trend,
  todayISO,
  isWorkday,
  monthLabel,
  weekMonday,
  weeklySeries,
  weekdayShort,
  type MonthStats,
  type Entry,
  type Goals,
  type TeamMember,
  type Activity,
} from '@/lib/calc';
import { coachHeadline, managerTeamPrompt, paceText, sellerPlanPrompt } from '@/lib/coach';
import { chime, haptic, beep } from '@/lib/audio';
import { SceneBoundary, webglAvailable } from '@/components/three/scene-boundary';

const PerformanceEngine = dynamic(() => import('@/components/three/performance-engine'), {
  ssr: false,
  loading: () => <div className="engine" />,
});

function useEngineReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia?.('(min-width: 900px)').matches;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const quiet = localStorage.getItem('ll_motion') === 'quiet';
    if (!desktop || reduced || quiet || !webglAvailable()) return;
    const id = window.setTimeout(() => setReady(true), 700);
    return () => window.clearTimeout(id);
  }, []);
  return ready;
}

function PageHead({ title, sub, actions }: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  );
}

function ActivityFeed({ activity }: { activity: Activity[] }) {
  const text = (a: Activity) => {
    const p = a.payload || {};
    switch (a.event) {
      case 'entry_new':
        return `${a.actor_name} registrerade ${p.sales ?? 0} sälj för ${p.entry_date ?? 'idag'}`;
      case 'entry_updated':
        return `${a.actor_name} ökade med +${p.delta ?? 0} sälj`;
      case 'goals_updated':
        return `${a.actor_name} uppdaterade målen`;
      default:
        return `${a.actor_name}: ${a.event}`;
    }
  };
  return (
    <div className="activity">
      {activity.slice(0, 6).map((a) => (
        <div className="item" key={a.id}>
          <div className="ic">{a.event.startsWith('entry') ? '↗' : '◎'}</div>
          <div>
            <div className="tx">{text(a)}</div>
            <div className="when">{new Date(a.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</div>
          </div>
        </div>
      ))}
      {!activity.length && <div className="card-note">Ingen aktivitet än.</div>}
    </div>
  );
}

function CoachPanel({ seller, stats, todayRow, goals, team }: { seller: boolean; stats: MonthStats; todayRow?: Entry; goals: Goals; team?: ReturnType<typeof teamStats> }) {
  const { ask, busy, error } = useAi();
  const [aiText, setAiText] = useState('');
  const headline = coachHeadline(stats, todayRow, goals);
  const run = async () => {
    const prompt = seller ? sellerPlanPrompt(stats, todayRow, goals) : managerTeamPrompt(team!);
    const res = await ask([{ role: 'user', content: prompt }]);
    if (res.text) setAiText(res.text);
  };
  return (
    <div className="card coach">
      <div className="coach-head">
        <div className="coach-spark">✦</div>
        <div>
          <div className="card-kicker">{seller ? 'DIN DAGLIGA COACH' : 'TEAMINTELLIGENS · SKRIVSKYDDAD'}</div>
          <h3 style={{ fontSize: 16, fontWeight: 720, letterSpacing: '-0.02em' }}>{seller ? headline.title : 'Teamets lägesbild'}</h3>
        </div>
      </div>
      <p className="coach-copy">{seller ? headline.copy : 'AI:n läser teamets faktiska registreringar och föreslår uppföljningar. Inga siffror eller mål ändras utan ditt godkännande.'}</p>
      <div className="coach-metrics">
        <div><span>Månad</span><b>{fmt(stats.sales)}<small> / {fmt(goals.monthly_sales)}</small></b></div>
        <div><span>Takt</span><b>{stats.avgPerWorkday == null ? '–' : f1(stats.avgPerWorkday)}<small> sälj/dag</small></b></div>
        <div><span>{stats.paceReliable ? (stats.remainingWorkdays > 0 ? 'Behövs/dag' : 'Kvar') : 'Täckning'}</span><b>{stats.paceReliable ? (stats.remainingWorkdays > 0 ? f1(stats.requiredPerRemaining ?? 0) : fmt(stats.goalGap)) : `${stats.registeredWorkdays}/${stats.elapsedWorkdays}`}</b></div>
      </div>
      {aiText && <div className="coach-ai"><div className="lbl">✦ AI-COACH</div><p>{aiText}</p></div>}
      {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={run} disabled={busy}>
          <Icon name="sparkles" size={15} /> {busy ? 'AI:n läser data…' : seller ? 'Be AI göra min plan' : 'Be AI analysera teamet'}
        </button>
        <Link href="/ai" className="btn btn-ghost">Öppna AI-coach</Link>
      </div>
    </div>
  );
}

function TodayHero({ stats, todayRow, goals, onRegister, onQuick }: { stats: MonthStats; todayRow?: Entry; goals: Goals; onRegister: () => void; onQuick: () => void }) {
  const has = !!todayRow;
  const value = has ? pct(Number(todayRow.sales), goals.daily_sales) : 0;
  const split = has ? productSplit([todayRow]) : null;
  return (
    <div className="card accent" style={{ padding: 24 }}>
      <div className="card-kicker">DAGENS RESULTAT · {dateLabel(todayISO())}</div>
      <div className="hero-today" style={{ marginTop: 8 }}>
        <Ring value={value} size={150} stroke={12} label={has ? `${Number(todayRow.sales)}` : '–'} sub={has ? `av ${goals.daily_sales}` : 'ej registrerat'} />
        <div>
          <div className="big-number">
            {has ? fmt(Number(todayRow.sales)) : 'Ej registrerat'}
            {has && <small> sälj idag</small>}
          </div>
          <div className="row" style={{ marginTop: 10, gap: 18 }}>
            <div><div className="card-kicker">TB IDAG</div><b style={{ fontSize: 15 }}>{has ? fmtMoney(Number(todayRow.tb_sek)) : '–'}</b></div>
            <div><div className="card-kicker">MÅNAD</div><b style={{ fontSize: 15 }}>{fmt(stats.sales)} <span className="muted" style={{ fontSize: 11 }}>/ {fmt(goals.monthly_sales)}</span></b></div>
            <div><div className="card-kicker">TÄCKNING</div><b style={{ fontSize: 15 }}>{stats.registeredWorkdays}/{stats.elapsedWorkdays} <span className="muted" style={{ fontSize: 11 }}>vardagar</span></b></div>
          </div>
          {has && split && (split.brandSales > 0 || split.konsSales > 0) && (
            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              <span className="badge ice">Brandkollen {split.brandSales}</span>
              <span className="badge mint">Konsumentkollen {split.konsSales}</span>
            </div>
          )}
          {!has && (
            <div className="note mint" style={{ marginTop: 12 }}>
              <Icon name="info" size={15} />
              <span>Dagens siffror är inte registrerade. En saknad dag räknas aldrig som noll.</span>
            </div>
          )}
          <div className="today-actions">
            <button className="btn btn-primary" onClick={onRegister}><Icon name="plus" size={15} /> {has ? 'Uppdatera dagen' : 'Registrera dagens siffror'}</button>
            {has && <button className="btn" onClick={onQuick}><Icon name="plus" size={15} /> +1 sälj</button>}
            <Link href="/history" className="btn btn-ghost">Historik</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalSnapshot({ goals, stats, todayRow, entries }: { goals: Goals; stats: MonthStats; todayRow?: Entry; entries: Entry[] }) {
  const week = weeklySeries(entries, 1)[0];
  const today = todayISO();
  const weekElapsed = [0, 1, 2, 3, 4].filter((i) => {
    const d = addDays(weekMonday(today), i);
    return d <= today && isWorkday(d);
  }).length;
  const items = [
    {
      label: 'Dagsmål',
      sales: goals.daily_sales,
      tb: goals.daily_tb,
      value: todayRow ? Number(todayRow.sales) : null,
      pct: todayRow ? pct(Number(todayRow.sales), goals.daily_sales) : 0,
      note: todayRow ? `${fmtMoney(Number(todayRow.tb_sek))} TB idag` : 'Idag ej registrerat — räknas inte som noll',
    },
    {
      label: 'Veckomål',
      sales: goals.weekly_sales,
      tb: goals.weekly_tb,
      value: week?.sales ?? 0,
      pct: pct(week?.sales || 0, goals.weekly_sales),
      note: `${week?.days || 0}/${weekElapsed} arbetsdagar registrerade`,
    },
    {
      label: 'Månadsmål',
      sales: goals.monthly_sales,
      tb: goals.monthly_tb,
      value: stats.sales,
      pct: stats.goalPct,
      note: `${stats.registeredWorkdays}/${stats.elapsedWorkdays} arbetsdagar registrerade · ${stats.tbGoalPct}% av TB-målet`,
    },
  ];
  return (
    <div className="card">
      <div className="card-head">
        <div><div className="card-kicker">MÅL</div><h3>Din plan</h3></div>
        <Link href="/goals" className="btn btn-sm btn-ghost">Redigera</Link>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {items.map((it) => (
          <div key={it.label}>
            <div className="row-between" style={{ marginBottom: 5 }}>
              <span className="card-note" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>{it.label}</span>
              <b style={{ fontSize: 12 }}>{it.value == null ? '–' : fmt(it.value)} / {fmt(it.sales)} sälj <span className="dim">· {it.pct}%</span></b>
            </div>
            <Progress value={it.pct} />
            <div className="card-note" style={{ marginTop: 4 }}>{it.note} · mål {fmtMoney(it.tb)} TB</div>
          </div>
        ))}
      </div>
      <div className="note" style={{ marginTop: 14 }}>
        <Icon name="info" size={15} />
        <span>{paceText(stats)} · {stats.remainingWorkdays} arbetsdagar kvar i månaden.</span>
      </div>
    </div>
  );
}

function WeekCard({ entries, goals }: { entries: Entry[]; goals: Goals }) {
  const today = todayISO();
  const days = useMemo(() => {
    const out: { key: string; value: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const key = addDays(today, -i);
      const row = entries.find((e) => e.entry_date === key);
      out.push({ key, value: row ? Number(row.sales) : null });
    }
    return out;
  }, [entries, today]);
  const total = days.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div className="card">
      <div className="card-head">
        <div><div className="card-kicker">SENASTE 7 DAGARNA</div><h3>{fmt(total)} sälj registrerade</h3></div>
        <span className="badge">Mål {goals.daily_sales}/dag</span>
      </div>
      <div className="bars" style={{ height: 150 }}>
        {days.map((d, i) => {
          const label = weekdayShort(d.key).replace('.', '');
          return (
            <div className="bar-col" key={d.key} title={`${d.key}: ${d.value == null ? 'ej registrerad' : d.value + ' sälj'}`}>
              <span className="bar-val">{d.value ?? ''}</span>
              <div className="bar-track">
                {d.value == null ? <div className="bar miss" style={{ height: '7%' }} /> : <div className={`bar ${d.value === 0 ? 'zero' : ''}`} style={{ height: `${Math.max(4, (d.value / Math.max(1, ...days.map((x) => x.value || 0))) * 100)}%` }} />}
              </div>
              <span className="bar-lab">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="card-note" style={{ marginTop: 10 }}>Streckade staplar = ingen registrering (räknas inte som noll).</div>
    </div>
  );
}

function AchievementsCard({ entries, goals, onToast }: { entries: Entry[]; goals: Goals; onToast: (m: string) => void }) {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fetch('/api/achievements', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => { if (Array.isArray(j.items)) setUnlocked(new Set(j.items.map((x: any) => x.key))); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready || !entries.length) return;
    const newly = ACHIEVEMENTS.filter((a) => !unlocked.has(a.key) && a.cond(entries, goals));
    if (!newly.length) return;
    setUnlocked((prev) => new Set([...prev, ...newly.map((a) => a.key)]));
    for (const a of newly) {
      fetch('/api/achievements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: a.key }),
      }).catch(() => {});
    }
    onToast(`Märke upplåst: ${newly[0].name} ${newly[0].emoji}`);
    chime();
    haptic([40, 30, 80]);
  }, [ready, entries, goals, unlocked, onToast]);
  const unlockedList = ACHIEVEMENTS.filter((a) => unlocked.has(a.key));
  const next = ACHIEVEMENTS.filter((a) => !unlocked.has(a.key)).slice(0, 4);
  return (
    <div className="card">
      <div className="card-head">
        <div><div className="card-kicker">MÄRKEN</div><h3>{unlockedList.length} av {ACHIEVEMENTS.length}</h3></div>
        <span className="badge gold">🏆</span>
      </div>
      <Progress value={(unlockedList.length / ACHIEVEMENTS.length) * 100} tone="gold" />
      <div className="row" style={{ marginTop: 12, gap: 6 }}>
        {unlockedList.slice(-8).map((a) => <span key={a.key} className="badge" title={a.desc}>{a.emoji}</span>)}
        {next.map((a) => <span key={a.key} className="badge" title={a.desc} style={{ opacity: 0.4 }}>·</span>)}
      </div>
      <div className="card-note" style={{ marginTop: 10 }}>Nästa: {next[0] ? `${next[0].emoji} ${next[0].name} — ${next[0].desc}` : 'Alla märken är upplåsta!'}</div>
    </div>
  );
}

function TeamPulse({ team }: { team: ReturnType<typeof teamStats> }) {
  return (
    <div className="card">
      <div className="card-head">
        <div><div className="card-kicker">TEAMET · Denna månad</div><h3>Säljarpuls</h3></div>
        <Link href="/team" className="btn btn-sm btn-ghost">Teamet</Link>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {team.rows.map((r) => (
          <div key={r.username} className="pace-item">
            <Avatar name={r.display_name} size="sm" />
            <div className="pi-line">
              <div className="row-between">
                <span className="pi-name">{r.display_name}</span>
                <span className="num" style={{ fontSize: 12, fontWeight: 700 }}>{fmt(r.sales)} sälj</span>
              </div>
              <div style={{ margin: '6px 0 4px' }}><Progress value={r.goalPct} /></div>
              <small>{r.goalPct}% av mål · {r.registeredWorkdays}/{r.elapsedWorkdays} vardagar registrerade</small>
            </div>
          </div>
        ))}
        {!team.rows.length && <div className="card-note">Inga säljare har registrerat ännu.</div>}
      </div>
    </div>
  );
}

function ManagerReport({ team }: { team: ReturnType<typeof teamStats> }) {
  return (
    <div className="card">
      <div className="card-head">
        <div><div className="card-kicker">CHEFSRAPPORT · SKRIVSKYDDAD</div><h3>Teamets vecka</h3></div>
        <Badge tone="violet">Chef</Badge>
      </div>
      <div className="grid g-2">
        <div><div className="card-kicker">Teamets sälj</div><div className="big-number">{fmt(team.sales)}</div><div className="card-note">av {fmt(team.goal)} i månadsmål</div></div>
        <div><div className="card-kicker">Teamets TB</div><div className="big-number">{fmt(team.tb)}<small> kr</small></div><div className="card-note">av {fmtMoney(team.tbGoal)}</div></div>
      </div>
      <div className="metric-row"><span>Måluppfyllelse</span><b>{team.goalPct}%</b></div>
      <div className="metric-row"><span>Ledare</span><b>{team.leader ? team.leader.display_name : '–'}</b></div>
      <div className="metric-row"><span>Prognos</span><b>{team.projection != null ? fmt(team.projection) + ' sälj' : 'Underlag saknas'}</b></div>
      <div className="row" style={{ marginTop: 14 }}>
        <Link href="/team" className="btn btn-primary">Öppna teamet</Link>
        <Link href="/comments" className="btn btn-ghost">Följ upp</Link>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { me, data, loading, error, reload, toast, sound } = useApp();
  const [registerOpen, setRegisterOpen] = useState(false);
  const engineReady = useEngineReady();
  const onToast = useCallback((m: string) => toast(m), [toast]);

  const monthKey = currentMonthKey();
  const goals: Goals = data?.team.find((t) => t.username === me.username)?.goals || {
    daily_sales: 7, daily_tb: 3000, weekly_sales: 35, weekly_tb: 15000, monthly_sales: 140, monthly_tb: 60000,
  };
  const my = data?.myEntries || [];
  const stats = useMemo(() => buildMonthStats(me.username, me.display_name, my, goals, monthKey), [me, my, goals, monthKey]);
  const members = useMemo(
    () => (data?.team || []).map((t) => ({ ...t, entries: t.entries.map((e) => ({ ...e, note: null, rating: null, mood: null, tags: [] })) as Entry[] })),
    [data],
  );
  const team = useMemo(() => teamStats(members, monthKey), [members, monthKey]);
  const todayRow = my.find((e) => e.entry_date === todayISO());
  const streak = registeredStreak(my);
  const week = weeklySeries(my, 8);
  const t7 = trend(my, 7);
  const best = personalRecord(my);
  const hoursMonth = my.filter((e) => monthOf(e.entry_date) === monthKey).reduce((s, e) => s + Number(e.hours || 0), 0);
  const split = productSplit(my.filter((e) => monthOf(e.entry_date) === monthKey));
  const weekTotal = week[week.length - 1]?.sales || 0;

  async function quickPlus() {
    const row = todayRow;
    const body: Record<string, unknown> = {
      action: 'upsert',
      entry_date: todayISO(),
      sales: (row?.sales || 0) + 1,
      tb_sek: row?.tb_sek || 0,
      hours: row?.hours ?? null,
      note: row?.note ?? null,
      mood: row?.mood ?? null,
      rating: row?.rating ?? null,
      tags: row?.tags || [],
    };
    if (row && (row.brandkollen_sales != null || row.konsumentkollen_sales != null)) {
      body.brandkollen_sales = row.brandkollen_sales ?? 0;
      body.konsumentkollen_sales = row.konsumentkollen_sales ?? 0;
    }
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return toast(json?.error || 'Kunde inte spara.', 'err');
    await reload();
    if (sound) beep(740, 0.08, 'triangle', 0.05);
    toast('+1 sälj registrerat.');
  }

  if (loading) {
    return (
      <div>
        <Skeleton height={70} />
        <div className="grid g-3" style={{ marginTop: 16 }}><Skeleton height={110} /><Skeleton height={110} /><Skeleton height={110} /></div>
        <div className="grid g-2" style={{ marginTop: 14 }}><Skeleton height={280} /><Skeleton height={280} /></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ maxWidth: 640, margin: '60px auto' }}>
        <div className="card-kicker">DATAKÄLLA</div>
        <h3 style={{ fontSize: 18 }}>Databasen kunde inte laddas</h3>
        <p className="card-note" style={{ marginTop: 8 }}>{error}</p>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => reload()}>Försök igen</button>
          <a className="btn btn-ghost" href="/api/health" target="_blank" rel="noreferrer">Öppna /api/health</a>
        </div>
      </div>
    );
  }

  const isSeller = me.role === 'seller';
  const engineValues = isSeller
    ? Array.from({ length: 7 }, (_, i) => {
        const row = my.find((e) => e.entry_date === addDays(todayISO(), -(6 - i)));
        return row ? Number(row.sales) : null;
      })
    : team.rows.map((r) => r.sales).slice(0, 7);

  return (
    <div>
      <PageHead
        title={<>{isSeller ? `Hej, ${me.display_name}` : `${me.display_name}s ledningsvy`} <span style={{ color: 'var(--mint)' }}>·</span></>}
        sub={
          <span>
            {dateLabel(todayISO())} · {isSeller ? (
              <>
                <b style={{ color: 'var(--tx)' }}>{streak} dagar</b> i rad med registrering · {stats.registeredWorkdays}/{stats.elapsedWorkdays} vardagar registrerade
              </>
            ) : (
              <>Teamet · {team.rows.length} säljare · {team.registeredWorkdays} registrerade vardagar denna månad</>
            )}
          </span>
        }
        actions={
          <>
            {isSeller && <button className="btn btn-primary" onClick={() => setRegisterOpen(true)}><Icon name="plus" size={15} /> Registrera</button>}
            <Link href="/month" className="btn">Månadsresultat <Icon name="arrow-right" size={14} /></Link>
          </>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        <Kpi label={isSeller ? 'Sälj denna månad' : 'Teamets sälj'} value={fmt(isSeller ? stats.sales : team.sales)} sub={isSeller ? `mål ${fmt(goals.monthly_sales)} · ${stats.goalPct}%` : `mål ${fmt(team.goal)} · ${team.goalPct}%`} tone="mint" />
        <Kpi label={isSeller ? 'TB denna månad' : 'Teamets TB'} value={`${fmt((isSeller ? stats.tb : team.tb) / 1000)}k`} sub={`kr · ${isSeller ? `${stats.tbGoalPct}% av mål` : `${team.tbGoalPct}% av mål`}`} tone="ice" />
        <Kpi label="Månadsledare" value={team.leader ? team.leader.display_name : '–'} sub={team.leader ? `${fmt(team.leader.sales)} sälj · ${fmtMoney(team.leader.tb)} TB` : 'Ingen registrering ännu'} tone="gold" />
        <Kpi label="Måluppfyllelse" value={`${isSeller ? stats.goalPct : team.goalPct}%`} sub={isSeller ? `${fmt(Math.max(0, goals.monthly_sales - stats.sales))} sälj kvar` : `${fmt(Math.max(0, team.goal - team.sales))} sälj kvar`} />
        <Kpi label="Förväntat slutresultat" value={isSeller ? (stats.projection != null ? fmt(stats.projection) : '–') : (team.projection != null ? fmt(team.projection) : '–')} sub={isSeller ? stats.projectionReason || '' : team.projectionReliable ? 'Baserat på registrerade arbetsdagar' : 'Underlag saknas'} tone="violet" />
        <Kpi label="Återstående arbetsdagar" value={String(stats.remainingWorkdays)} sub={`av ${stats.totalWorkdays} i månaden`} />
      </div>

      {isSeller ? (
        <>
          <div className="grid g-2" style={{ marginBottom: 14 }}>
            <TodayHero stats={stats} todayRow={todayRow} goals={goals} onRegister={() => setRegisterOpen(true)} onQuick={quickPlus} />
            <div className="stack">
              <SceneBoundary fallback={<EngineFallback values={engineValues} />}>
                {engineReady ? (
                  <PerformanceEngine values={engineValues} labels={['M', 'T', 'O', 'T', 'F', 'L', 'S']} />
                ) : (
                  <EngineFallback values={engineValues} />
                )}
              </SceneBoundary>
              <div className="grid g-2">
                <Kpi label="Bästa dag" value={best ? fmt(best.sales) : '–'} sub={best ? best.entry_date : 'Ingen registrering'} tone="gold" />
                <Kpi label="Sälj per timme" value={hoursMonth > 0 ? f1(stats.sales / hoursMonth) : '–'} sub={hoursMonth > 0 ? `${f1(hoursMonth)} h registrerade` : 'Inga timmar registrerade'} />
              </div>
            </div>
          </div>

          <div className="grid g-2" style={{ marginBottom: 14 }}>
            <CoachPanel seller stats={stats} todayRow={todayRow} goals={goals} />
            <GoalSnapshot goals={goals} stats={stats} todayRow={todayRow} entries={my} />
          </div>

          <div className="grid g-3" style={{ marginBottom: 14 }}>
            <div className="span-2"><WeekCard entries={my} goals={goals} /></div>
            <div className="card">
              <div className="card-head"><div><div className="card-kicker">SNABBSTATISTIK</div><h3>Denna månad</h3></div></div>
              <div className="metric-row"><span>Registrerade dagar</span><b>{stats.days}</b></div>
              <div className="metric-row"><span>Snitt sälj/arbetsdag</span><b>{stats.avgPerWorkday == null ? '–' : f1(stats.avgPerWorkday)}</b></div>
              <div className="metric-row"><span>Snitt TB/sälj</span><b>{stats.avgTbPerSale == null ? '–' : fmtMoney(stats.avgTbPerSale)}</b></div>
              <div className="metric-row"><span>Vecka hittills</span><b>{fmt(weekTotal)} sälj</b></div>
              <div className="metric-row"><span>7-dagars­trend</span><Delta value={t7.pct} /></div>
              <div className="metric-row"><span>Brandkollen</span><b>{split.brandSales} sälj</b></div>
              <div className="metric-row"><span>Konsumentkollen</span><b>{split.konsSales} sälj</b></div>
              <div className="metric-row"><span>Ej uppdelat</span><b>{split.unsplitSales} sälj</b></div>
            </div>
          </div>

          <div className="grid g-3" style={{ marginBottom: 14 }}>
            <div className="card">
              <div className="card-head"><div><div className="card-kicker">8 VECKOR</div><h3>Veckoförsäljning</h3></div></div>
              <Sparkline values={week.map((w) => w.sales)} height={80} />
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                {week.map((w) => <span key={w.key} className="dim" style={{ fontSize: 9 }}>{w.label.slice(3)}</span>)}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-kicker">MÅNAD MOT MÅNAD</div><h3>Samma period</h3></div></div>
              <MonthCompare entries={my} monthKey={monthKey} />
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-kicker">AKTIVITET</div><h3>Senaste händelser</h3></div><Link href="/comments" className="btn btn-sm btn-ghost">Kommentarer</Link></div>
              <ActivityFeed activity={data.activity} />
            </div>
          </div>

          <div className="grid g-2">
            <AchievementsCard entries={my} goals={goals} onToast={onToast} />
            <div className="card">
              <div className="card-head"><div><div className="card-kicker">MÅNADSKALENDER</div><h3>{monthLabel(monthKey)}</h3></div></div>
              <MonthHeat entries={my} goal={goals.daily_sales} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid g-2" style={{ marginBottom: 14 }}>
            <TeamPulse team={team} />
            <SceneBoundary fallback={<EngineFallback values={engineValues} />}>
              {engineReady ? (
                <PerformanceEngine values={engineValues} labels={team.rows.map((r) => r.display_name)} />
              ) : (
                <EngineFallback values={engineValues} />
              )}
            </SceneBoundary>
          </div>

          <div className="grid g-2" style={{ marginBottom: 14 }}>
            <CoachPanel seller={false} stats={team.rows[0] || buildMonthStats(me.username, me.display_name, [], goals, monthKey)} goals={goals} team={team} />
            <ManagerReport team={team} />
          </div>

          <div className="grid g-2" style={{ marginBottom: 14 }}>
            <div className="card">
              <div className="card-head"><div><div className="card-kicker">SÄLJRANKING</div><h3>Placering denna månad</h3></div><Badge tone="mint">Bara säljare</Badge></div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>#</th><th>Säljare</th><th className="r">Sälj</th><th className="r">TB</th><th className="r">Mål</th><th className="r">Täckning</th></tr></thead>
                  <tbody>
                    {team.rows.map((r, i) => (
                      <tr key={r.username}>
                        <td><span className={`badge ${i === 0 ? 'gold' : ''}`}>{i + 1}</span></td>
                        <td className="strong">{r.display_name}</td>
                        <td className="r strong">{fmt(r.sales)}</td>
                        <td className="r">{fmtMoney(r.tb)}</td>
                        <td className="r">{r.goalPct}%</td>
                        <td className="r">{r.registeredWorkdays}/{r.elapsedWorkdays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-kicker">AKTIVITET</div><h3>Teamets senaste händelser</h3></div><Link href="/comments" className="btn btn-sm btn-ghost">Följ upp</Link></div>
              <ActivityFeed activity={data.activity} />
              <div className="note" style={{ marginTop: 14 }}>
                <Icon name="lock" size={15} />
                <span>Chefsvyn är skrivskyddad för säljsiffror och mål. Du kan kommentera och följa upp.</span>
              </div>
            </div>
          </div>

          <div className="grid g-3">
            <div className="card">
              <div className="card-kicker">MÅLUPPFYLLELSE</div>
              <div className="big-number">{team.goalPct}%</div>
              <Progress value={team.goalPct} className="lg" />
              <div className="card-note" style={{ marginTop: 8 }}>{fmt(team.sales)} av {fmt(team.goal)} sälj</div>
            </div>
            <div className="card">
              <div className="card-kicker">TB-UPPFYLLELSE</div>
              <div className="big-number">{team.tbGoalPct}%</div>
              <Progress value={team.tbGoalPct} tone="ice" className="lg" />
              <div className="card-note" style={{ marginTop: 8 }}>{fmtMoney(team.tb)} av {fmtMoney(team.tbGoal)}</div>
            </div>
            <div className="card">
              <div className="card-kicker">PROGNOS</div>
              <div className="big-number">{team.projection != null ? fmt(team.projection) : '–'}</div>
              <div className="card-note" style={{ marginTop: 8 }}>{team.projectionReliable ? 'Baserat på registrerade arbetsdagar' : 'Underlaget är för tunt för en säker prognos'}</div>
            </div>
          </div>
        </>
      )}

      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Registrera dagens resultat" width={720}>
        <EntryForm initial={todayRow || undefined} onSaved={() => setRegisterOpen(false)} onCancel={() => setRegisterOpen(false)} />
      </Modal>
    </div>
  );
}

function EngineFallback({ values }: { values: (number | null)[] }) {
  const max = Math.max(1, ...values.map((x) => x ?? 0));
  return (
    <div className="engine" aria-hidden="true">
      <div className="engine-fallback">
        {values.map((v, i) => <i key={i} style={{ height: `${Math.max(8, ((v ?? 0) / max) * 120)}px` }} />)}
      </div>
      <div className="engine-label">PERFORMANCE ENGINE</div>
      <div className="engine-ring"><b>{values.reduce((s, v) => s + (v ?? 0), 0)}</b><span>sälj · 7 dagar</span></div>
    </div>
  );
}

function MonthCompare({ entries, monthKey }: { entries: Entry[]; monthKey: string }) {
  const cmp = compareMonths(entries, monthKey);
  if (!cmp) return <div className="empty" style={{ padding: 22 }}><p>Ingen jämförbar period ännu.</p></div>;
  return (
    <div>
      <div className="row-between"><span className="card-note">{cmp.previous.label}</span><b>{fmt(cmp.previous.sales)} sälj</b></div>
      <div className="row-between" style={{ marginTop: 6 }}><span className="card-note">{cmp.current.label}</span><b>{fmt(cmp.current.sales)} sälj</b></div>
      <div className="row" style={{ marginTop: 12, gap: 10 }}>
        <Delta value={cmp.salesPct} />
        <span className="card-note">{cmp.samePeriod ? 'Samma kalenderperiod' : 'Hel månad'}</span>
      </div>
      <div className="metric-row" style={{ marginTop: 10 }}><span>TB-förändring</span><Delta value={cmp.tbPct} /></div>
    </div>
  );
}

function MonthHeat({ entries, goal }: { entries: Entry[]; goal: number }) {
  const [y, m] = currentMonthKey().split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
  const first = (new Date(Date.UTC(y, m - 1, 1, 12)).getUTCDay() + 6) % 7;
  const by = new Map(entries.map((r) => [r.entry_date, Number(r.sales)]));
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)];
  return (
    <div>
      <div className="row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
        {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d, i) => <span key={i} className="dim" style={{ fontSize: 9, textAlign: 'center' }}>{d}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const v = by.get(key);
          const isToday = key === todayISO();
          return (
            <span
              key={i}
              title={v == null ? `${key} – ej registrerad` : `${key}: ${v} sälj`}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
                fontSize: 9.5,
                background: v == null ? 'rgba(255,255,255,.045)' : `rgba(94,234,212,${0.18 + Math.min(v / Math.max(goal, 1), 1.2) * 0.6})`,
                color: v == null ? 'var(--mu-2)' : '#04211c',
                fontWeight: v == null ? 500 : 800,
                outline: isToday ? '1px solid var(--mint)' : 'none',
                outlineOffset: 1,
              }}
            >{d}</span>
          );
        })}
      </div>
    </div>
  );
}
