'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { Icon } from '@/components/icons';
import { Avatar, Badge, Card, Empty, MetricRow, Skeleton } from '@/components/ui';
import { useAi, type Proposal } from '@/components/use-ai';
import { buildMonthStats, currentMonthKey, f1, fmt, fmtMoney, teamStats, todayISO, type Entry } from '@/lib/calc';
import { managerTeamPrompt, paceText, sellerPlanPrompt } from '@/lib/coach';

type Msg = { role: 'user' | 'assistant'; content: string; proposals?: Proposal[]; error?: boolean };

const SELLER_SUGGESTIONS = [
  'Analysera min månad och ge nästa steg',
  'Hur ligger jag mot mitt mål den här månaden?',
  'Vad gör jag bra och vad ska jag förbättra?',
];

const MANAGER_SUGGESTIONS = [
  'Analysera teamet och visa vem som behöver stöd',
  'Vilka trender ser du i månaden?',
  'Föreslå uppföljningar till teamet',
];

function ProposalCard({ p, onApply, onReject, busy }: { p: Proposal; onApply: () => void; onReject: () => void; busy: boolean }) {
  const i = p.input || {};
  const title = p.tool === 'registrera_dag' ? 'Registrera dag' : p.tool === 'satt_mal' ? 'Sätt mål' : p.tool === 'skriv_kommentar' ? 'Kommentar till teamet' : p.tool;
  const lines: string[] = [];
  if (p.tool === 'registrera_dag') {
    lines.push(`Datum: ${i.entry_date}`);
    lines.push(`Sälj: ${i.sales ?? '–'} · TB: ${i.tb_sek != null ? fmtMoney(Number(i.tb_sek)) : '–'}`);
    if (i.hours != null) lines.push(`Timmar: ${i.hours}`);
    if (i.brandkollen_sales != null || i.konsumentkollen_sales != null) lines.push(`Brandkollen: ${i.brandkollen_sales ?? 0} · Konsumentkollen: ${i.konsumentkollen_sales ?? 0}`);
    if (i.note) lines.push(`Anteckning: ${i.note}`);
  } else if (p.tool === 'satt_mal') {
    const map: Record<string, string> = { daily_sales: 'Dag', weekly_sales: 'Vecka', monthly_sales: 'Månad', daily_tb: 'TB/dag', weekly_tb: 'TB/vecka', monthly_tb: 'TB/månad' };
    for (const [k, v] of Object.entries(i)) if (v != null) lines.push(`${map[k] || k}: ${typeof v === 'number' && k.includes('tb') ? fmtMoney(v) : v}`);
  } else if (p.tool === 'skriv_kommentar') {
    lines.push(String(i.body || ''));
    if (i.entry_date) lines.push(`Datum: ${i.entry_date}`);
  }
  return (
    <div className="proposal">
      <div className="row-between" style={{ marginBottom: 6 }}>
        <b style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="sparkles" size={13} /> {title}</b>
        <Badge tone="gold">Förslag</Badge>
      </div>
      {lines.map((l, idx) => <div key={idx} style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.45 }}>{l}</div>)}
      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={onApply} disabled={busy}><Icon name="check" size={13} /> {busy ? 'Sparar…' : 'Godkänn &amp; spara'}</button>
        <button className="btn btn-sm btn-ghost" onClick={onReject} disabled={busy}>Avvisa</button>
      </div>
      <div className="card-note" style={{ marginTop: 8 }}>Inget sparas förrän du godkänner.</div>
    </div>
  );
}

export default function AiPage() {
  const { data, loading, me, toast, reload } = useApp();
  const { ask, busy, error } = useAi();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [applying, setApplying] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReduced(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, reduced]);

  const monthKey = currentMonthKey();
  const my = data?.team.find((t) => t.username === me.username);
  const stats = my ? buildMonthStats(my.username, my.display_name, my.entries.map((e) => ({ ...e, note: null, rating: null, mood: null, tags: [] })), my.goals, monthKey) : null;
  const today = data?.myEntries.find((e) => e.entry_date === todayISO());
  const isManager = me.role === 'manager';
  const suggestions = isManager ? MANAGER_SUGGESTIONS : SELLER_SUGGESTIONS;

  async function send(content: string) {
    const text = content.trim();
    if (!text || busy) return;
    setInput('');
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    const res = await ask([...history, { role: 'user', content: text }]);
    setMessages((cur) => [...cur, { role: 'assistant', content: res.text, proposals: res.proposals, error: !res.text }]);
    if (!res.text && !res.proposals.length) toast('AI:n svarade inte. Kontrollera att ANTHROPIC_API_KEY är satt i Vercel.', 'err');
  }

  async function quick(kind: 'plan' | 'team') {
    if (!stats && kind === 'plan') return;
    const prompt = kind === 'plan' && stats ? sellerPlanPrompt(stats, today, my!.goals) : managerTeamPromptFromData();
    await send(prompt);
  }

  function managerTeamPromptFromData() {
    if (!data) return '';
    const members = data.team.map((t) => ({ ...t, entries: t.entries.map((e) => ({ ...e, note: null, rating: null, mood: null, tags: [] })) as Entry[] }));
    return managerTeamPrompt(teamStats(members, monthKey));
  }

  async function apply(p: Proposal) {
    const id = p.id;
    setApplying(id);
    try {
      const i = p.input || {};
      if (p.tool === 'registrera_dag') {
        if (isManager) throw new Error('Chefer kan inte registrera sälj.');
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'upsert', entry_date: i.entry_date, sales: i.sales, tb_sek: i.tb_sek, hours: i.hours ?? null, note: i.note ?? null, brandkollen_sales: i.brandkollen_sales ?? null, konsumentkollen_sales: i.konsumentkollen_sales ?? null }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Kunde inte spara.');
        toast('Registreringen är sparad.');
      } else if (p.tool === 'satt_mal') {
        if (isManager) throw new Error('Chefer kan inte ändra mål.');
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ ...my?.goals, ...i }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Kunde inte spara.');
        toast('Målen är uppdaterade.');
      } else if (p.tool === 'skriv_kommentar') {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ body: String(i.body || '').slice(0, 2000), entry_date: i.entry_date || null }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Kunde inte skicka.');
        toast('Kommentaren är skickad.');
      }
      setMessages((cur) => cur.map((m) => (m.proposals ? { ...m, proposals: m.proposals.filter((x) => x.id !== id) } : m)));
      await reload();
    } catch (e: any) {
      toast(e?.message || 'Kunde inte spara förslaget.', 'err');
    } finally {
      setApplying(null);
    }
  }

  function reject(id: string) {
    setMessages((cur) => cur.map((m) => (m.proposals ? { ...m, proposals: m.proposals.filter((x) => x.id !== id) } : m)));
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>AI-COACH · CLAUDE</div>
          <h1 className="page-title">AI-coach</h1>
          <p className="page-sub">
            {isManager
              ? 'Teamanalys, trender och uppföljningar utifrån verkliga registreringar. Skrivskyddad — AI:n ändrar aldrig siffror eller mål.'
              : 'Din personliga coach. Den använder bara dina registreringar och föreslår aldrig siffror utan att du godkänner.'}
          </p>
        </div>
      </div>

      <div className="ai-layout">
        <div className="card ai-chat">
          <div className="chat-head">
            <span className="ai-orb" aria-hidden="true">✦</span>
            <div>
              <b>Label Lab Coach</b>
              <div className="card-note">Datadriven · Sweden/Stockholm · aldrig påhittad statistik</div>
            </div>
            {busy && <Badge tone="violet">Tänker…</Badge>}
          </div>

          <div className="chat-scroll" ref={listRef}>
            {messages.length === 0 && (
              <div className="ai-empty">
                <div className="ai-orb big" aria-hidden="true">✦</div>
                <h3>{isManager ? 'Vad vill du veta om teamet?' : 'Vad vill du veta om din månad?'}</h3>
                <p>Ställ en fråga eller välj ett förslag. Coachen ser bara det den faktiskt har underlag för.</p>
                <div className="suggestion-grid">
                  {suggestions.map((s) => <button key={s} className="suggestion" onClick={() => send(s)}>{s}</button>)}
                  {!isManager && <button className="suggestion" onClick={() => quick('plan')}>Ge mig en konkret plan för resten av månaden</button>}
                  {isManager && <button className="suggestion" onClick={() => quick('team')}>Få en teamanalys med uppföljningsförslag</button>}
                </div>
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`ai-msg ${m.role}`}>
                <div className="ai-bubble">
                  {m.role === 'assistant' && <div className="ai-author"><span className="ai-orb" aria-hidden="true">✦</span> Coach</div>}
                  {m.content ? <p style={{ whiteSpace: 'pre-wrap' }}>{m.content}</p> : m.error ? <p className="error-text">{error || 'Inget svar. Kontrollera att AI-nyckeln är konfigurerad.'}</p> : null}
                  {m.proposals && m.proposals.length > 0 && (
                    <div className="stack" style={{ gap: 10, marginTop: 10 }}>
                      {m.proposals.map((p) => <ProposalCard key={p.id} p={p} onApply={() => apply(p)} onReject={() => reject(p.id)} busy={applying === p.id} />)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && messages.length > 0 && <div className="ai-msg assistant"><div className="ai-bubble"><span className="skel" style={{ display: 'inline-block', width: 160, height: 14 }} /></div></div>}
          </div>

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isManager ? 'Fråga om teamet, trender eller uppföljning…' : 'Fråga om din månad, takt eller nästa steg…'}
              maxLength={1200}
              disabled={busy}
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
              <Icon name="sparkles" size={15} /> Skicka
            </button>
          </form>
        </div>

        <aside className="stack">
          <div className="card">
            <div className="card-head">
              <div><div className="card-kicker">UNDERLAG</div><h3>{isManager ? 'Teamet' : 'Din månad'}</h3></div>
              {me && <Avatar name={me.display_name} role={me.role} size="sm" />}
            </div>
            {loading || !data ? <Skeleton height={160} /> : isManager ? (
              <div className="stack" style={{ gap: 8 }}>
                {data.team.filter((t) => t.role === 'seller').map((t) => {
                  const s = buildMonthStats(t.username, t.display_name, t.entries.map((e) => ({ ...e, note: null, rating: null, mood: null, tags: [] })), t.goals, monthKey);
                  return (
                    <div key={t.username} className="setting-row">
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t.display_name}</span>
                      <span className="dim" style={{ fontSize: 12 }}>{fmt(s.sales)} sälj · {s.goalPct}% · {s.registeredWorkdays}/{s.elapsedWorkdays} dagar</span>
                    </div>
                  );
                })}
              </div>
            ) : stats ? (
              <>
                <MetricRow label="Sälj denna månad"><b>{fmt(stats.sales)}</b> av {fmt(stats.goals.monthly_sales)}</MetricRow>
                <MetricRow label="TB"><b>{fmtMoney(stats.tb)}</b></MetricRow>
                <MetricRow label="Måluppfyllelse"><b>{stats.goalPct}%</b></MetricRow>
                <MetricRow label="Takt"><b>{stats.avgPerWorkday == null ? '–' : f1(stats.avgPerWorkday)}</b> sälj/arbetsdag</MetricRow>
                <MetricRow label="Täckning"><b>{stats.registeredWorkdays}/{stats.elapsedWorkdays}</b> vardagar</MetricRow>
                <MetricRow label="Prognos"><b>{stats.projection != null ? fmt(stats.projection) : '–'}</b> <Badge tone={stats.paceReliable ? 'green' : 'gold'}>{paceText(stats)}</Badge></MetricRow>
                <div className="card-note" style={{ marginTop: 8 }}>Dagens registrering: {today ? `${today.sales} sälj` : 'saknas (räknas inte som noll)'}</div>
              </>
            ) : null}
          </div>
          <div className="card">
            <div className="card-head"><div><div className="card-kicker">SÅ ARBETAR COACHEN</div><h3>Tryggt &amp; transparens</h3></div></div>
            <ul className="insight-list">
              <li>Använder endast registrerad data — inga påhittade siffror.</li>
              <li>Saknade dagar tolkas som saknad uppgift, aldrig noll.</li>
              <li>Förslag på registrering, mål eller kommentar sparas först när du godkänner.</li>
              <li>Chefer kan aldrig ändra säljarnas siffror eller mål via AI.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
