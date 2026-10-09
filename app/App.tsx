'use client';
import { useCallback, useEffect, useState } from 'react';
import { DEF, Goals, iso, Row, f1, fmt, mon, pct, prevRange, range, sum, today, workdaysDone, workdaysLeft, workdaysTotal } from '@/lib/calc';

const TABS: [string, string][] = [['Översikt', '◐'], ['Registrera', '＋'], ['Historik', '☰'], ['Statistik', '▥'], ['Mål', '◎'], ['Kommentarer', '✎'], ['AI-coach', '✦']];
type Prop = { id: string; tool: string; input: any; done?: boolean };
type Msg = { r: 'u' | 'a'; t: string; e?: boolean; props?: Prop[] };
const GL: any = { daily_sales: 'dagsmål sälj', daily_tb: 'dagsmål TB', monthly_sales: 'månadsmål sälj', monthly_tb: 'månadsmål TB' };
const desc = (p: Prop) => p.tool === 'registrera_dag' ? `Registrera ${p.input.entry_date}: ${p.input.sales} sälj, ${fmt(p.input.tb_sek)} kr${p.input.hours ? ', ' + p.input.hours + ' h' : ''}` : p.tool === 'satt_mal' ? 'Ändra mål: ' + Object.entries(p.input).map(([k, v]) => `${GL[k] || k} ${fmt(Number(v))}`).join(', ') : `Skicka kommentar: "${p.input.body}"`;
function buildAlerts(rows: Row[], g: Goals, role: string, unread: number): string[] {
  const a: string[] = [], hr = new Date().getHours(), t = rows.find(r => r.entry_date === today()), ms = sum(rows.filter(r => mon(r.entry_date) === mon(today())), 'sales');
  const plan = g.monthly_sales * (workdaysDone() / Math.max(workdaysTotal(), 1)), who = role === 'seller' ? 'Du' : 'Stille';
  if (unread) a.push(`${unread} ny${unread > 1 ? 'a kommentarer' : ' kommentar'}`);
  if (!rows.length) return a;
  if (hr >= 15 && !t) a.push(`${who} har inget registrerat idag än`);
  else if (t && hr >= 15 && t.sales < g.daily_sales) a.push(`Dagsmål: ${g.daily_sales - t.sales} sälj kvar`);
  if (plan - ms >= 2) a.push(`${who} ligger ${f1(plan - ms)} sälj efter månadsplanen`);
  return a;
}
function confetti() {
  if (typeof document === 'undefined') return;
  const w = document.createElement('div'); w.className = 'confetti';
  for (let i = 0; i < 44; i++) { const e = document.createElement('i'); e.style.cssText = `left:${Math.random() * 100}%;background:hsl(${120 + Math.random() * 60},80%,60%);animation-delay:${Math.random() * 0.3}s;--x:${(Math.random() - 0.5) * 220}px`; w.appendChild(e); }
  document.body.appendChild(w); setTimeout(() => w.remove(), 2400);
}
function CountUp({ n }: { n: number }) {
  const [v, setV] = useState(0);
  useEffect(() => { let f = 0; const t0 = performance.now(); const step = (t: number) => { const p = Math.min((t - t0) / 700, 1); setV(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) f = requestAnimationFrame(step); }; f = requestAnimationFrame(step); return () => cancelAnimationFrame(f); }, [n]);
  return <>{v}</>;
}

const api = (b: any) => fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
function Heat({ rows, goal }: { rows: Row[]; goal: number }) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth(), last = new Date(y, m + 1, 0).getDate(), first = (new Date(y, m, 1).getDay() + 6) % 7, by = new Map(rows.map(r => [r.entry_date, r.sales]));
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)];
  return <div className="heat">{['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d, i) => <span key={i} className="hd">{d}</span>)}{cells.map((d, i) => { if (!d) return <span key={i} />; const k = iso(new Date(y, m, d)), v = by.get(k);
    return <span key={i} className="hc" title={v == null ? k + ' – ej registrerad' : `${k}: ${v} sälj`} style={v != null ? { background: `rgba(52,224,138,${0.18 + Math.min(v / Math.max(goal, 1), 1.2) * 0.6})`, color: '#04170c', fontWeight: 700 } : undefined}>{d}</span>; })}</div>;
}
function Stat({ k, v, s, c, bar }: { k: string; v: any; s?: string; c?: string; bar?: number }) {
  return <div className="c"><div className="k">{k}</div><div className={'v ' + (c || '')}>{v}</div><div className="s">{s}</div>{bar != null && <div className="bar"><i style={{ width: bar + '%' }} /></div>}</div>;
}
function Chart({ a, goal }: { a: Row[]; goal?: number }) {
  if (!a.length) return <span className="s">Ingen data än</span>;
  const m = Math.max(...a.map(r => r.sales), 1);
  return <div className="ch">{a.map(r => <div key={r.id}><em>{r.sales}</em><b className={goal && r.sales >= goal ? 'hit' : ''} style={{ height: (r.sales / m) * 110 }} />{r.entry_date.slice(8)}/{r.entry_date.slice(5, 7)}</div>)}</div>;
}
function Ring({ p }: { p: number }) {
  const r = 68, c = 2 * Math.PI * r;
  return <div className="ring"><svg width="160" height="160"><circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" />
    <circle cx="80" cy="80" r={r} fill="none" stroke="#34e08a" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ transition: 'stroke-dashoffset .9s' }} /></svg>
    <div className="t"><b>{p}%</b><span>av dagsmålet</span></div></div>;
}

export default function App() {
  const [rows, setRows] = useState<Row[]>([]), [g, setG] = useState<Goals>(DEF), [role, setRole] = useState(''), [uid, setUid] = useState('');
  const [tab, setTab] = useState(0), [edit, setEdit] = useState<number | null>(null), [toast, setToast] = useState(''), [loading, setLoading] = useState(true), [rg, setRg] = useState('Denna månad');
  const [msgs, setMsgs] = useState<Msg[]>([]), [q, setQ] = useState(''), [busy, setBusy] = useState(false), [ks, setKs] = useState<{ configured: boolean; source: string | null }>({ configured: false, source: null }), [keyIn, setKeyIn] = useState('');
  const can = role === 'seller';
  const [hl, setHl] = useState(''), [cm, setCm] = useState<any[]>([]), [unread, setUnread] = useState(0), [cText, setCText] = useState(''), [cDate, setCDate] = useState(''), [bell, setBell] = useState(false), [err, setErr] = useState('');
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };

  const load = useCallback(async () => {
    let j: any = {}; try { j = await (await fetch('/api/data')).json(); } catch { j = { error: 'Kunde inte nå servern.' }; }
    setErr(j.error || '');
    setRows((j.rows || []).map((x: any) => ({ ...x, sales: Number(x.sales), tb_sek: Number(x.tb_sek), hours: x.hours == null ? null : Number(x.hours) })));
    if (j.goals) setG({ daily_sales: j.goals.daily_sales, daily_tb: Number(j.goals.daily_tb), monthly_sales: j.goals.monthly_sales, monthly_tb: Number(j.goals.monthly_tb) });
    setRole(j.role || ''); setLoading(false); loadC();
    fetch('/api/ai/key').then(x => x.json()).then(k => k.configured !== undefined && setKs(k)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  const loadC = async () => { try { const j = await (await fetch('/api/comments')).json(); if (j.items) { setCm(j.items); setUnread(j.unread || 0); } } catch {} };
  useEffect(() => { const t = setInterval(loadC, 45000); return () => clearInterval(t); }, []);
  useEffect(() => { if (tab === 5) fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"action":"seen"}' }).then(() => setUnread(0)); }, [tab, cm.length]);
  useEffect(() => {
    if (loading || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let sent: string[] = []; try { sent = JSON.parse(localStorage.getItem('sd_n') || '[]'); } catch {}
    const key = today(), fresh = buildAlerts(rows, g, role, unread).filter(x => !sent.includes(key + x));
    fresh.forEach(x => new Notification('Säljdashboard', { body: x }));
    if (fresh.length) try { localStorage.setItem('sd_n', JSON.stringify([...sent.slice(-30), ...fresh.map(x => key + x)])); } catch {}
  }, [rows, g, role, unread, loading]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget), d = String(f.get('d')), s = Number(f.get('s')), tb = Number(f.get('t')), hh = String(f.get('h') || ''), h = hh === '' ? null : Number(hh);
    if (!Number.isInteger(s) || s < 0 || !(tb >= 0) || (h !== null && !(h >= 0 && h <= 24))) return alert('Ogiltiga värden.');
    const ex = rows.find(r => r.entry_date === d && r.id !== edit);
    if (ex && !confirm(`Det finns redan en registrering för ${d} (${ex.sales} sälj). Ersätta den?`)) return;
    const r = await api({ action: 'upsert', entry_date: d, sales: s, tb_sek: tb, hours: h, note: String(f.get('n') || '').trim() || null, replace_id: edit });
    if (r.error) return alert('Kunde inte spara: ' + r.error);
    if (s >= g.daily_sales && d === today()) confetti();
    setEdit(null); await load(); setTab(0); say(ex ? 'Ersatte tidigare registrering' : 'Sparat ✓');
  }
  async function del(id: number) { if (confirm('Ta bort registreringen?')) { await api({ action: 'delete', id }); load(); } }
  async function saveGoals(ng: Goals) { const r = await api({ action: 'goals', ...ng }); if (r.error) return alert(r.error); setG(ng); say('Mål sparade ✓'); }
  function csv() {
    const t = 'datum,sälj,tb,timmar,anteckning\n' + rows.map(r => [r.entry_date, r.sales, r.tb_sek, r.hours ?? '', '"' + (r.note || '').replace(/"/g, '""') + '"'].join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = 'sales.csv'; a.click();
  }
  async function quick() {
    const r = await api({ action: 'upsert', entry_date: today(), sales: ts + 1, tb_sek: tt, hours: todayRow?.hours ?? null, note: todayRow?.note ?? null });
    if (r.error) return alert(r.error); await load(); say('+1 sälj 🔥'); if (ts + 1 === g.daily_sales) confetti();
  }
  async function ask(question: string) {
    const hist: Msg[] = [...msgs, { r: 'u', t: question }];
    setMsgs(hist); setBusy(true);
    try {
      const j = await (await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ today: today(), wl: workdaysLeft(), messages: hist.filter(m => !m.e).slice(-8).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t })) }) })).json();
      const ps = (j.proposals || []).map((p: any, i: number) => ({ ...p, id: Date.now() + '-' + i }));
      setMsgs(m => [...m, { r: 'a', t: j.text || (ps.length ? 'Jag föreslår:' : j.error || 'Något gick fel.'), e: !j.text && !ps.length, props: ps }]);
    } catch { setMsgs(m => [...m, { r: 'a', t: 'AI är inte tillgänglig just nu.', e: true }]); }
    setBusy(false);
  }
  async function apply(p: Prop) {
    let r: any;
    if (p.tool === 'registrera_dag') r = await api({ action: 'upsert', entry_date: p.input.entry_date, sales: p.input.sales, tb_sek: p.input.tb_sek, hours: p.input.hours ?? null, note: p.input.note ?? null });
    else if (p.tool === 'satt_mal') r = await api({ action: 'goals', ...g, ...p.input });
    else r = await fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'add', body: p.input.body, entry_date: p.input.entry_date || null }) }).then(x => x.json());
    if (r.error) return alert(r.error);
    setMsgs(m => m.map(x => ({ ...x, props: x.props?.map(y => y.id === p.id ? { ...y, done: true } : y) })));
    await load(); say('Klart ✓');
  }
  async function postC(e: React.FormEvent) {
    e.preventDefault(); if (!cText.trim()) return;
    const j = await (await fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'add', body: cText.trim(), entry_date: cDate || null }) })).json();
    if (j.error) return alert(j.error); setCText(''); setCDate(''); loadC();
  }
  async function keyCall(method: string, key?: string) {
    const r = await fetch('/api/ai/key', { method, headers: { 'content-type': 'application/json' }, body: key ? JSON.stringify({ key }) : undefined }), j = await r.json();
    if (!r.ok) return alert(j.error); setKs(j); setKeyIn(''); say(j.configured ? 'Nyckel sparad ✓' : 'Nyckel borttagen');
  }

  if (loading) return <div className="center"><div className="sk"><i /><i /><i /></div></div>;
  const todayRow = rows.find(r => r.entry_date === today()), mo = rows.filter(r => mon(r.entry_date) === mon(today()));
  const ts = todayRow?.sales || 0, tt = todayRow?.tb_sek || 0, ms = sum(mo, 'sales'), mt = sum(mo, 'tb_sek'), wl = workdaysLeft();
  const planS = g.monthly_sales * (workdaysDone() / Math.max(workdaysTotal(), 1)), ahead = ms - planS;
  const A = range(rows, rg), B = prevRange(rows, rg), hh = A.filter(r => r.hours), best = [...A].sort((a, b) => b.sales - a.sales)[0], dl = sum(A, 'sales') - sum(B, 'sales');
  const set = new Map(rows.map(r => [r.entry_date, r.sales]));
  const streak = (() => { let n = 0; const d = new Date(); if ((set.get(today()) || 0) < g.daily_sales) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 90; i++) { const w = d.getDay(); if (w === 0 || w === 6) { d.setDate(d.getDate() - 1); continue; } if ((set.get(iso(d)) || 0) >= g.daily_sales) { n++; d.setDate(d.getDate() - 1); } else break; } return n; })();
  const proj = mo.length >= 5 ? (ms / mo.length) * workdaysTotal() : null;
  const wdAvg = [1, 2, 3, 4, 5].map(w => { const x = rows.filter(r => new Date(r.entry_date + 'T12:00').getDay() === w); return { n: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'][w - 1], v: x.length ? sum(x, 'sales') / x.length : 0 }; });
  const wmax = Math.max(...wdAvg.map(x => x.v), 1);
  const badges = [
    { n: 'Första registreringen', i: '🌱', ok: rows.length >= 1 }, { n: '10 registrerade dagar', i: '📅', ok: rows.length >= 10 },
    { n: 'Dagsmål nått', i: '🎯', ok: rows.some(r => r.sales >= g.daily_sales && g.daily_sales > 0) }, { n: '5 dagar i rad', i: '🔥', ok: streak >= 5 },
    { n: 'Rekorddag 10+ sälj', i: '🚀', ok: rows.some(r => r.sales >= 10) }, { n: 'Månadsmål nått', i: '🏆', ok: ms >= g.monthly_sales && g.monthly_sales > 0 },
  ];
  const er = edit ? rows.find(r => r.id === edit) : null;
  const hr = new Date().getHours(), alerts = buildAlerts(rows, g, role, unread);

  return <div className="app">
    <aside>
      <div className="logo"><i>S</i>Säljdashboard</div>
      {TABS.map(([n, ic], i) => <button key={n} className={'nv ' + (tab === i ? 'on' : '')} onClick={() => { setTab(i); setEdit(null); scrollTo(0, 0); }}><span>{ic}</span>{n}</button>)}
      <div className="who"><b>{can ? 'Stille' : 'Affe'}</b>{can ? 'Säljare' : 'Chef (läsläge)'}<br /><a onClick={async () => { await fetch('/api/logout', { method: 'POST' }); location.href = '/login'; }}>Logga ut</a></div>
    </aside>
    <main>
      <div className="top"><span className="chip">{can ? 'Stille · säljare' : 'Affe · chef'}</span><div style={{ position: 'relative' }}><button className="b bellb" onClick={() => setBell(!bell)}>🔔{alerts.length > 0 && <i className="dot">{alerts.length}</i>}</button>
        {bell && <div className="c pop"><div className="k">Notiser</div>{alerts.length ? alerts.map(x => <p key={x} className="al">{x}</p>) : <p className="s">Allt lugnt just nu 👌</p>}
          {typeof Notification !== 'undefined' && Notification.permission === 'default' && <button className="b" onClick={() => Notification.requestPermission().then(() => setBell(false))}>Aktivera webbläsarnotiser</button>}
          <p className="s" style={{ marginTop: 8 }}>Webbläsarnotiser visas när sidan är öppen.</p></div>}</div></div>
      {err && <div className="c errb">⚠️ {err}<br /><span className="s">Kontrollera NEXT_PUBLIC_SUPABASE_URL (bara https://xxxx.supabase.co), SUPABASE_SERVICE_ROLE_KEY och att schema.sql är körd.</span></div>}
      {tab === 0 && <>
        <h2>{hr < 10 ? 'God morgon' : hr < 18 ? 'Hej' : 'God kväll'}, {can ? 'Stille' : 'Affe'} 👋</h2>
        <p className="sub">{new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        {!rows.length ? <div className="c" style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 42 }}>🚀</div><h2>Dags för första registreringen</h2><p className="sub">Inga resultat sparade än.</p>{can && <button className="b pri" onClick={() => setTab(1)}>Registrera dagens siffror</button>}</div> : <>
          <div className="c hero"><Ring p={pct(ts, g.daily_sales)} /><div>
            <div className="k">Idag</div><div className="v" style={{ fontSize: 36 }}><CountUp n={ts} /> <span className="s">/ {g.daily_sales} sälj</span></div>
            <p style={{ margin: '6px 0 14px', color: 'var(--mu)' }}>{ts < g.daily_sales ? <>Det behövs <b className="ok">{g.daily_sales - ts} sälj</b> till för att nå dagsmålet.</> : <b className="ok">Dagsmålet är nått! 🎉</b>} TB hittills: <b style={{ color: 'var(--tx)' }}>{fmt(tt)} kr</b>.</p>
            <div className="row" style={{ margin: 0 }}>{can && <button className="b pri" onClick={quick}>+1 sälj</button>}{can && <button className="b" onClick={() => setTab(1)}>Registrera dagens siffror</button>}<button className="b" onClick={() => setTab(6)}>✦ Fråga AI-coachen</button></div></div></div>
          <div className="c" style={{ marginBottom: 14 }}><div className="k">Dagens takt</div><div className="row" style={{ margin: '8px 0 0' }}><input style={{ width: 130 }} type="number" min="0" step="0.5" placeholder="Timmar kvar" value={hl} onChange={e => setHl(e.target.value)} /><span className="s">{ts >= g.daily_sales ? 'Målet är redan nått 🎉' : Number(hl) > 0 ? `Ett sälj var ${Math.round(Number(hl) * 60 / (g.daily_sales - ts))}:e minut för att nå målet` : 'Ange hur många timmar du har kvar idag'}</span></div></div>
          <div className="g">
            <Stat k="TB idag" v={fmt(tt) + ' kr'} s={`mål ${fmt(g.daily_tb)} kr · ${pct(tt, g.daily_tb)}%`} bar={pct(tt, g.daily_tb)} />
            <Stat k="Månadens sälj" v={ms} s={`mål ${g.monthly_sales} · ${pct(ms, g.monthly_sales)}%`} bar={pct(ms, g.monthly_sales)} />
            <Stat k="Månadens TB" v={fmt(mt) + ' kr'} s={`mål ${fmt(g.monthly_tb)} kr`} bar={pct(mt, g.monthly_tb)} />
            <Stat k="Mot plan" v={(ahead >= 0 ? '+' : '') + f1(ahead) + ' sälj'} s={ahead >= 0 ? 'Före din plan' : 'Efter din plan'} c={ahead >= 0 ? 'ok' : 'bad'} />
            <Stat k="Snitt sälj / dag" v={mo.length ? f1(ms / mo.length) : '–'} s="registrerade dagar" />
            <Stat k="Snitt TB / sälj" v={ms ? fmt(mt / ms) + ' kr' : '–'} s="denna månad" />
            <Stat k="Streak 🔥" v={streak + ' dagar'} s="i rad med dagsmål nått" c={streak ? 'ok' : ''} />
            <Stat k="Prognos månaden" v={proj != null ? Math.round(proj) + ' sälj' : '–'} s={proj != null ? (proj >= g.monthly_sales ? 'På väg att nå målet (uppskattning)' : 'Under målet i nuvarande takt (uppskattning)') : 'Behöver minst 5 registrerade dagar'} c={proj != null ? (proj >= g.monthly_sales ? 'ok' : 'bad') : ''} />
            <Stat k="Krävs / arbetsdag" v={f1(Math.max(g.monthly_sales - ms, 0) / wl) + ' sälj'} s={`${wl} arbetsdagar kvar`} />
          </div>
          <div className="c"><div className="k">Senaste 7 registrerade dagarna</div><Chart a={rows.slice(-7)} goal={g.daily_sales} /></div>
          <div className="c" style={{ marginTop: 14 }}><div className="k">Månadskalender</div><Heat rows={rows} goal={g.daily_sales} /></div></>}
      </>}
      {tab === 1 && <><h2>{er ? 'Ändra registrering' : 'Registrera resultat'}</h2><p className="sub">Samma datum ersätter den gamla registreringen – du får en fråga först.</p>
        {can ? <div className="c" style={{ maxWidth: 560 }}><form key={edit ?? 'new'} onSubmit={save}>
          <label>Datum<input name="d" type="date" required defaultValue={er?.entry_date || today()} /></label>
          <div className="two"><label>Antal sälj<input name="s" type="number" min="0" step="1" inputMode="numeric" required defaultValue={er?.sales} /></label><label>Totalt TB (kr)<input name="t" type="number" min="0" step="1" inputMode="numeric" required defaultValue={er?.tb_sek} /></label></div>
          <label>Arbetade timmar (valfritt)<input name="h" type="number" min="0" max="24" step="0.25" inputMode="decimal" defaultValue={er?.hours ?? ''} /></label>
          <label>Anteckning (valfritt)<textarea name="n" rows={2} defaultValue={er?.note || ''} /></label>
          <button className="b pri">{er ? 'Uppdatera' : 'Spara resultat'}</button></form></div> : <p className="s">Bara säljaren kan registrera.</p>}</>}
      {tab === 2 && <><h2>Historik</h2><p className="sub">{rows.length} registrerade dagar</p><div className="row"><button className="b" onClick={csv}>Exportera CSV</button></div>
        <div className="c sc"><table><thead><tr><th>Datum</th><th>Sälj</th><th>TB</th><th>Timmar</th><th>Anteckning</th><th /></tr></thead><tbody>
          {[...rows].reverse().map(r => <tr key={r.id}><td>{r.entry_date}</td><td><b>{r.sales}</b> {r.sales >= g.daily_sales && <span className="tag">mål</span>}</td><td>{fmt(r.tb_sek)} kr</td><td>{r.hours ?? '–'}</td><td>{r.note}</td>
            <td style={{ whiteSpace: 'nowrap' }}>{can && <><button className="b" onClick={() => { setEdit(r.id); setTab(1); }}>Ändra</button> <button className="b" onClick={() => del(r.id)}>✕</button></>}</td></tr>)}
          {!rows.length && <tr><td colSpan={6} className="s">Inga registreringar än</td></tr>}</tbody></table></div></>}
      {tab === 3 && <><h2>Statistik</h2><p className="sub">Dagar utan registrering räknas inte som noll.</p>
        <div className="row"><select value={rg} onChange={e => setRg(e.target.value)}>{['Idag', 'Denna vecka', 'Denna månad', 'Föregående månad', 'Allt'].map(x => <option key={x}>{x}</option>)}</select></div>
        <div className="g"><Stat k="Sälj" v={sum(A, 'sales')} /><Stat k="TB" v={fmt(sum(A, 'tb_sek')) + ' kr'} /><Stat k="TB / sälj" v={sum(A, 'sales') ? fmt(sum(A, 'tb_sek') / sum(A, 'sales')) + ' kr' : '–'} />
          <Stat k="Sälj / registrerad dag" v={A.length ? f1(sum(A, 'sales') / A.length) : '–'} /><Stat k="Sälj / timme" v={sum(hh, 'hours') ? f1(sum(hh, 'sales') / sum(hh, 'hours')) : '–'} s="när timmar finns" />
          <Stat k="Bästa dag" v={best ? best.sales + ' sälj' : '–'} s={best?.entry_date} /><Stat k="Mot föregående period" v={B.length ? (dl >= 0 ? '+' : '') + dl : '–'} s="sälj" c={dl >= 0 ? 'ok' : 'bad'} /></div>
        <div className="c"><div className="k">Dagliga sälj</div><Chart a={A.slice(-14)} goal={g.daily_sales} /></div>
        <div className="c" style={{ marginTop: 14 }}><div className="k">Snitt sälj per veckodag (alla data)</div><div className="ch">{wdAvg.map(x => <div key={x.n}><em>{x.v ? f1(x.v) : '–'}</em><b style={{ height: (x.v / wmax) * 110 }} />{x.n}</div>)}</div></div>
        <div className="c" style={{ marginTop: 14 }}><div className="k">Märken</div><div className="badges">{badges.map(b => <span key={b.n} className={'bd ' + (b.ok ? 'on' : '')} title={b.ok ? 'Upplåst' : 'Låst'}>{b.i} {b.n}</span>)}</div></div></>}
      {tab === 4 && <><h2>Mål</h2><p className="sub">Förslag och beslutsstöd – inget ändras utan att du sparar.</p>
        {can && <div className="c" style={{ maxWidth: 560, marginBottom: 14 }}><form key={JSON.stringify(g)} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); saveGoals({ daily_sales: Number(f.get('a')), daily_tb: Number(f.get('b')), monthly_sales: Number(f.get('c')), monthly_tb: Number(f.get('d')) }); }}>
          <div className="two"><label>Dagsmål sälj<input name="a" type="number" min="0" defaultValue={g.daily_sales} /></label><label>Dagsmål TB (kr)<input name="b" type="number" min="0" defaultValue={g.daily_tb} /></label>
            <label>Månadsmål sälj<input name="c" type="number" min="0" defaultValue={g.monthly_sales} /></label><label>Månadsmål TB (kr)<input name="d" type="number" min="0" defaultValue={g.monthly_tb} /></label></div><button className="b pri">Spara mål</button></form></div>}
        <div className="g"><Stat k="Sälj kvar i månaden" v={Math.max(g.monthly_sales - ms, 0)} s={f1(Math.max(g.monthly_sales - ms, 0) / wl) + ' per arbetsdag'} /><Stat k="TB kvar i månaden" v={fmt(Math.max(g.monthly_tb - mt, 0)) + ' kr'} s={fmt(Math.max(g.monthly_tb - mt, 0) / wl) + ' kr per arbetsdag'} /></div></>}
      {tab === 5 && <><h2>Kommentarer</h2><p className="sub">Mellan Stille och Affe</p>
        <div className="c" style={{ maxWidth: 640, marginBottom: 14 }}><form onSubmit={postC}><textarea rows={2} maxLength={1000} placeholder={can ? 'Skriv till Affe…' : 'Skriv till Stille…'} value={cText} onChange={e => setCText(e.target.value)} />
          <div className="row" style={{ margin: 0 }}><input type="date" style={{ width: 170 }} value={cDate} onChange={e => setCDate(e.target.value)} title="Koppla till en dag (valfritt)" /><button className="b pri">Skicka</button></div></form></div>
        <div className="chat" style={{ maxWidth: 640 }}>{cm.map(c => <div key={c.id} className={'msg ' + (c.author === role ? 'u' : 'a')}><div className="s">{c.author === 'seller' ? 'Stille' : 'Affe'}{c.entry_date ? ' · om ' + c.entry_date : ''} · {new Date(c.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</div>{c.body}</div>)}{!cm.length && <p className="s">Inga kommentarer än.</p>}</div></>}
      {tab === 6 && <><h2>AI-coach</h2><p className="sub">Kan föreslå och göra ändringar åt dig – du godkänner först.</p>
        {!ks.configured && <div className="c" style={{ maxWidth: 560, marginBottom: 14 }}><div className="k">Aktivera AI</div><p className="s">Klistra in Anthropic API-nyckeln. Den sparas bara på servern och skickas aldrig tillbaka till webbläsaren.</p>
          {can ? <form onSubmit={e => { e.preventDefault(); keyCall('POST', keyIn); }}><input type="password" placeholder="sk-ant-…" value={keyIn} onChange={e => setKeyIn(e.target.value)} autoComplete="off" /><button className="b pri">Spara nyckel</button></form> : <p className="s">Stille lägger in nyckeln.</p>}</div>}
        {ks.configured && <div className="row"><span className="tag">✓ AI aktiv ({ks.source === 'env' ? 'miljövariabel' : 'sparad nyckel'})</span>{can && ks.source === 'db' && <button className="b ghost" onClick={() => confirm('Ta bort nyckeln?') && keyCall('DELETE')}>Ta bort nyckel</button>}</div>}
        {ks.configured && <>
          <div className="row">{(can ? ['Hur ligger jag till idag?', 'Föreslå dagens mål', 'Registrera idag: 5 sälj och 3000 kr', 'Veckosammanfattning', 'Skriv en kommentar till Affe om min dag'] : ['Hur går det för Stille?', 'Veckosammanfattning', 'Skriv en peppande kommentar till Stille']).map(x => <button key={x} className="b" disabled={busy} onClick={() => ask(x)}>{x}</button>)}</div>
          <div className="chat">{msgs.map((m, i) => <div key={i} className={`msg ${m.r} ${m.e ? 'e' : ''}`}>{m.t}{m.props?.map(p => <div key={p.id} className="sug">{desc(p)}<br />{p.done ? <span className="tag">✓ Gjort</span> : <button className="b pri" style={{ marginTop: 8 }} onClick={() => apply(p)}>Godkänn</button>}</div>)}</div>)}{busy && <div className="msg a s">Tänker…</div>}</div>
          <form onSubmit={e => { e.preventDefault(); if (q.trim()) { ask(q.trim()); setQ(''); } }} style={{ maxWidth: 640, gridTemplateColumns: '1fr auto' }}><input value={q} maxLength={500} onChange={e => setQ(e.target.value)} placeholder="Fråga eller be AI:n göra något…" /><button className="b pri" disabled={busy}>Skicka</button></form></>}
      </>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  </div>;
}
