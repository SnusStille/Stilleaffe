'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/app-provider';
import { Icon } from '@/components/icons';
import { Avatar, Badge, Card, Empty, Kpi, Progress, Skeleton } from '@/components/ui';
import { useAi } from '@/components/use-ai';
import { CommentsThread } from '@/components/comments-thread';
import { buildLeaderboard, buildMonthStats, currentMonthKey, f1, fmt, fmtMoney, pct, teamStats, type Entry, type TeamMember } from '@/lib/calc';
import { managerTeamPrompt, paceText } from '@/lib/coach';

export default function TeamPage() {
  const { data, loading, me, toast, reload } = useApp();
  const { ask, busy, error } = useAi();
  const [aiText, setAiText] = useState('');
  const [follow, setFollow] = useState<string | null>(null);
  const [followText, setFollowText] = useState('');
  const [followDate, setFollowDate] = useState('');
  const [followBusy, setFollowBusy] = useState(false);

  const monthKey = currentMonthKey();
  const members = useMemo(() => (data?.team || []).map((t) => ({ ...t, entries: t.entries.map((e) => ({ ...e, note: null, rating: null, mood: null, tags: [] })) as Entry[] })), [data]);
  const leader = useMemo(() => buildLeaderboard(members, monthKey), [members, monthKey]);
  const team = useMemo(() => teamStats(members, monthKey), [members, monthKey]);
  const isManager = me.role === 'manager';

  async function analyze() {
    const res = await ask([{ role: 'user', content: managerTeamPrompt(team) }]);
    if (res.text) setAiText(res.text);
  }

  async function sendFollow() {
    if (!follow || !followText.trim()) return;
    setFollowBusy(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ body: followText.trim(), entry_date: followDate || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Kunde inte skicka.');
      setFollow(null);
      setFollowText('');
      setFollowDate('');
      await reload();
      toast('Uppföljningen är skickad.');
    } catch (e: any) {
      toast(e?.message || 'Kunde inte skicka.', 'err');
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading) {
    return <div><Skeleton height={64} /><div className="grid g-3" style={{ marginTop: 16 }}><Skeleton height={120} /><Skeleton height={120} /><Skeleton height={120} /></div><div style={{ marginTop: 14 }}><Skeleton height={300} /></div></div>;
  }
  if (!data) return <div className="card"><h3>Kunde inte ladda teamet</h3></div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>TEAMET · {new Date().toLocaleDateString('sv-SE', { month: 'long' })}</div>
          <h1 className="page-title">Team</h1>
          <p className="page-sub">
            {isManager
              ? 'Hela teamets resultat, mål och uppföljning. Säljsiffror och mål är skrivskyddade för chefer.'
              : 'Teamets resultat i en skrivskyddad jämförelsevy. Du kan aldrig ändra någon annans siffror.'}
          </p>
        </div>
        <div className="page-head-actions">
          <Link href="/month" className="btn"><Icon name="month" size={15} /> Månadsresultat</Link>
          <Link href="/comments" className="btn btn-ghost"><Icon name="comments" size={15} /> Kommentarer</Link>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 14 }}>
        <Kpi label="Teamets sälj" value={fmt(team.sales)} sub={`${team.rows.filter((r) => r.sales > 0).length} säljare med registrering`} tone="mint" />
        <Kpi label="Teamets TB" value={`${fmt(team.tb / 1000)}k`} sub={`kr · ${fmtMoney(team.tb)}`} tone="ice" />
        <Kpi label="Måluppfyllelse" value={`${team.goalPct}%`} sub={`${fmt(team.sales)} av ${fmt(team.goal)} sälj`} />
        <Kpi label="Månadsledare" value={team.leader ? team.leader.display_name : '–'} sub={team.leader ? `${fmt(team.leader.sales)} sälj` : 'Ingen registrering'} tone="gold" />
        <Kpi label="Prognos" value={team.projection != null ? fmt(team.projection) : '–'} sub={team.projectionReliable ? 'Tillförlitligt underlag' : 'Tunt underlag'} tone="violet" />
        <Kpi label="Arbetsdagar kvar" value={String(team.remainingWorkdays)} sub={`${team.elapsedWorkdays} passerade`} />
      </div>

      <div className="grid g-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-head">
            <div><div className="card-kicker">SÄLJRANKING · MÅNADEN</div><h3>Placering</h3></div>
            <Badge tone="mint">Bara säljare</Badge>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {leader.map((r) => (
              <div key={r.username} className="pace-item">
                <span className={`badge ${r.rank === 1 ? 'gold' : ''}`} style={{ minWidth: 26, justifyContent: 'center' }}>{r.rank}</span>
                <Avatar name={r.display_name} size="sm" />
                <div className="pi-line">
                  <div className="row-between">
                    <span className="pi-name">{r.display_name}{r.username === me.username && <span className="dim" style={{ fontSize: 10, marginLeft: 5 }}>du</span>}</span>
                    <span className="num" style={{ fontSize: 12, fontWeight: 700 }}>{fmt(r.sales)} sälj · {fmtMoney(r.tb)}</span>
                  </div>
                  <div style={{ margin: '6px 0 4px' }}><Progress value={r.goalPct} /></div>
                  <small>{r.goalPct}% av mål · {r.avgPerWorkday == null ? '–' : `${f1(r.avgPerWorkday)} sälj/arbetsdag`} · {r.registeredWorkdays}/{r.elapsedWorkdays} vardagar</small>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => setFollow(r.username)}>Följ upp</button>
              </div>
            ))}
            {!leader.length && <Empty title="Inga säljare" icon="team">Lägg till säljare i Supabase (app_users).</Empty>}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div><div className="card-kicker">CHEFENS AI · SKRIVSKYDDAD</div><h3>Teamanalys</h3></div>
            <Badge tone="violet">AI</Badge>
          </div>
          {aiText ? <div className="coach-ai"><div className="lbl">✦ TEAMINTELLIGENS</div><p>{aiText}</p></div> : <p className="card-note">Få en datadriven analys av teamets samlade resultat, trender och vilka som behöver stöd. AI:n använder bara registrerad data.</p>}
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={analyze} disabled={busy}><Icon name="sparkles" size={15} /> {busy ? 'Analyserar…' : 'Analysera teamet'}</button>
            <Link href="/ai" className="btn btn-ghost">Öppna AI-coach</Link>
          </div>
        </div>
      </div>

      {follow && (
        <div className="card accent" style={{ marginBottom: 14 }}>
          <div className="card-head">
            <div><div className="card-kicker">UPPFÖLJNING</div><h3>{members.find((m) => m.username === follow)?.display_name}</h3></div>
            <button className="modal-x" onClick={() => setFollow(null)} aria-label="Stäng"><Icon name="x" size={16} /></button>
          </div>
          <div className="field">
            <textarea className="textarea" rows={3} maxLength={2000} value={followText} onChange={(e) => setFollowText(e.target.value)} placeholder="Skriv en respektfull, konkret uppföljning…" />
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input type="date" className="input" style={{ width: 170, height: 34, fontSize: 12 }} value={followDate} onChange={(e) => setFollowDate(e.target.value)} aria-label="Datum" />
            <button className="btn btn-primary btn-sm" onClick={sendFollow} disabled={followBusy || !followText.trim()}>{followBusy ? 'Skickar…' : 'Skicka uppföljning'}</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <div><div className="card-kicker">ALLA KONTON</div><h3>Teammedlemmar</h3></div>
          <Badge>Rollbaserad åtkomst</Badge>
        </div>
        <div className="table-wrap">
          <table className="tbl team-table">
            <thead><tr><th>Namn</th><th>Användarnamn</th><th>Roll</th><th className="r">Sälj</th><th className="r">TB</th><th className="r">Mål</th><th className="r">Täckning</th></tr></thead>
            <tbody>
              {members.map((m) => {
                const s = m.role === 'seller' ? buildMonthStats(m.username, m.display_name, m.entries, m.goals, monthKey) : null;
                return (
                  <tr key={m.username} className={m.username === me.username ? 'me' : ''}>
                    <td className="strong"><span className="row" style={{ gap: 8 }}><Avatar name={m.display_name} role={m.role} size="sm" />{m.display_name}</span></td>
                    <td><span className="dim">@{m.username}</span></td>
                    <td><span className="role"><Badge tone={m.role === 'manager' ? 'violet' : 'mint'}>{m.role === 'manager' ? 'Chef' : 'Säljare'}</Badge></span></td>
                    <td className="r">{s ? fmt(s.sales) : <span className="dim">—</span>}</td>
                    <td className="r">{s ? fmtMoney(s.tb) : <span className="dim">—</span>}</td>
                    <td className="r">{s ? `${s.goalPct}%` : <span className="dim">—</span>}</td>
                    <td className="r">{s ? `${s.registeredWorkdays}/${s.elapsedWorkdays}` : <span className="dim">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="note" style={{ marginTop: 12 }}>
          <Icon name="info" size={15} />
          <span>Chefer syns i tabellen men ingår aldrig i säljrankingen. Chefer kan inte ändra säljarnas registrerade siffror eller mål.</span>
        </div>
      </div>

      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><div><div className="card-kicker">INDIVIDUELLA MÅL</div><h3>Månadsmål per säljare</h3></div><Link href="/goals" className="btn btn-sm btn-ghost">{isManager ? 'Visa mål' : 'Mina mål'}</Link></div>
          <div className="stack" style={{ gap: 12 }}>
            {members.filter((m) => m.role === 'seller').map((m) => {
              const s = buildMonthStats(m.username, m.display_name, m.entries, m.goals, monthKey);
              return (
                <div key={m.username}>
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 650 }}>{m.display_name}</span>
                    <span className="dim" style={{ fontSize: 11 }}>Dag {m.goals.daily_sales} · Vecka {m.goals.weekly_sales} · Månad {m.goals.monthly_sales}</span>
                  </div>
                  <Progress value={s.goalPct} />
                  <div className="card-note" style={{ marginTop: 4 }}>{fmt(s.sales)} / {fmt(m.goals.monthly_sales)} sälj · {fmtMoney(s.tb)} / {fmtMoney(m.goals.monthly_tb)} TB</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-kicker">UPPFÖLJNING</div><h3>Kommentarer</h3></div></div>
          <CommentsThread compact />
        </div>
      </div>
    </div>
  );
}
