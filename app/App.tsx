'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEF, Goals, Row,
  avg, bestStreak, f1, fmt, fmtMoney, groupByMonth,
  iso, mon, pbDay, pbTB, pct, prevRange,
  qtr, range, streakAt, sum, today, workdaysDone, workdaysLeft, workdaysTotal, compareMonths,
} from '@/lib/calc';

type TabId = 'overview' | 'register' | 'history' | 'stats' | 'goals' | 'comments' | 'ai' | 'year' | 'settings';
const TABS: { id: TabId; label: string; ic: string }[] = [
  { id: 'overview', label: 'Översikt', ic: '◐' },
  { id: 'register', label: 'Registrera', ic: '＋' },
  { id: 'history',  label: 'Historik',  ic: '☰' },
  { id: 'stats',    label: 'Statistik', ic: '▥' },
  { id: 'year',     label: 'Årsvy',     ic: '▤' },
  { id: 'goals',    label: 'Mål',       ic: '◎' },
  { id: 'comments', label: 'Kommentarer', ic: '✎' },
  { id: 'ai',       label: 'AI-coach',  ic: '✦' },
  { id: 'settings', label: 'Inställningar', ic: '⚙' },
];

type Prop = { id: string; tool: string; input: any; done?: boolean };
type Msg = { r: 'u' | 'a'; t: string; e?: boolean; props?: Prop[] };
const GL: Record<string, string> = {
  daily_sales: 'dagsmål sälj', daily_tb: 'dagsmål TB',
  monthly_sales: 'månadsmål sälj', monthly_tb: 'månadsmål TB',
};
const desc = (p: Prop) =>
  p.tool === 'registrera_dag' ? `Registrera ${p.input.entry_date}: ${p.input.sales} sälj, ${fmt(p.input.tb_sek)} kr${p.input.hours ? ', ' + p.input.hours + ' h' : ''}` :
  p.tool === 'satt_mal' ? 'Ändra mål: ' + Object.entries(p.input).map(([k, v]) => `${GL[k] || k} ${fmt(Number(v))}`).join(', ') :
  p.tool === 'skriv_kommentar' ? `Skicka kommentar: "${p.input.body}"` :
  JSON.stringify(p.input);

const THEMES: { id: string; label: string; cls: string; emoji: string }[] = [
  { id: 'default',  label: 'Sälj',     cls: 't-seller',   emoji: '🟢' },
  { id: 'midnight', label: 'Midnatt',  cls: 't-midnight', emoji: '🌌' },
  { id: 'sunset',   label: 'Solnedgång', cls: 't-sunset', emoji: '🌅' },
  { id: 'forest',   label: 'Skog',     cls: 't-forest',   emoji: '🌿' },
  { id: 'neon',     label: 'Neon',     cls: 't-neon',     emoji: '💜' },
];

function applyTheme(id: string) {
  if (typeof document === 'undefined') return;
  if (id === 'default') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', id);
}

function buildAlerts(rows: Row[], g: Goals, role: string, unread: number): string[] {
  const a: string[] = [];
  const hr = new Date().getHours();
  const t = rows.find(r => r.entry_date === today());
  const ms = sum(rows.filter(r => mon(r.entry_date) === mon(today())), 'sales');
  const plan = g.monthly_sales * (workdaysDone() / Math.max(workdaysTotal(), 1));
  const who = role === 'seller' ? 'Du' : 'Stille';
  if (unread) a.push(`${unread} ny${unread > 1 ? 'a kommentarer' : ' kommentar'}`);
  if (!rows.length) return a;
  if (hr >= 15 && !t) a.push(`${who} har inget registrerat idag än`);
  else if (t && hr >= 15 && t.sales < g.daily_sales) a.push(`Dagsmål: ${g.daily_sales - t.sales} sälj kvar`);
  if (plan - ms >= 2) a.push(`${who} ligger ${f1(plan - ms)} sälj efter månadsplanen`);
  else if (ms - plan >= 3) a.push(`${who} ligger ${f1(ms - plan)} sälj före planen 🔥`);
  return a;
}

function confetti() {
  if (typeof document === 'undefined') return;
  const w = document.createElement('div'); w.className = 'confetti';
  for (let i = 0; i < 80; i++) {
    const e = document.createElement('i');
    const hue = 90 + Math.random() * 200;
    const spread = (Math.random() - 0.5) * 260;
    const rot = Math.random() * 1080 - 540;
    e.style.cssText = `left:${Math.random() * 100}%;background:hsl(${hue},80%,60%);animation-delay:${Math.random() * 0.4}s;--x:${spread}px;--r:${rot}deg;`;
    w.appendChild(e);
  }
  document.body.appendChild(w);
  setTimeout(() => w.remove(), 2400);
}

function CountUp({ n, dur = 800, prefix = '', suffix = '' }: { n: number; dur?: number; prefix?: string; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setV(n * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n, dur]);
  return <>{prefix}{n >= 100 ? fmt(Math.round(v)) : Math.round(v * 10) / 10}{suffix}</>;
}

function Ring({ p, label = 'av dagsmålet', sub }: { p: number; label?: string; sub?: string }) {
  const r = 70, c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg width="170" height="170" viewBox="0 0 170 170">
        <defs>
          <linearGradient id="grgV5" x1="0" x2="1"><stop offset="0" stopColor="var(--acc1)" /><stop offset="1" stopColor="var(--gr2)" /></linearGradient>
        </defs>
        <circle cx="85" cy="85" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="13" />
        <circle cx="85" cy="85" r={r} fill="none" stroke="url(#grgV5)" strokeWidth="13" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, p)) / 100)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)', transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      </svg>
      <div className="t"><b>{p}%</b><span>{label}</span>{sub && <span style={{ fontSize: 11, opacity: .7 }}>{sub}</span>}</div>
    </div>
  );
}

const api = (b: any) => fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(b) }).then(r => r.json());

function Stat({ k, v, s, c, bar, icon }: { k: string; v: any; s?: string; c?: string; bar?: number; icon?: string }) {
  return (
    <div className="c">
      {icon && <div className="kpi-icon">{icon}</div>}
      <div className="k">{k}</div>
      <div className={'v num ' + (c || '')}>{v}</div>
      <div className="s">{s}</div>
      {bar != null && <div className="bar"><i style={{ width: Math.max(0, Math.min(100, bar)) + '%' }} /></div>}
    </div>
  );
}

function Heat({ rows, goal }: { rows: Row[]; goal: number }) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const by = new Map(rows.map(r => [r.entry_date, r.sales]));
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)];
  return (
    <div className="heat">
      {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map(d => <span key={d} className="hd">{d}</span>)}
      {cells.map((d, i) => {
        if (!d) return <span key={i} />;
        const k = iso(new Date(y, m, d));
        const v = by.get(k);
        const isToday = k === today();
        return <span key={i} className={'hc' + (isToday ? ' today' : '')}
          title={v == null ? k + ' – ej registrerad' : `${k}: ${v} sälj, ${fmtMoney(rows.find(r=>r.entry_date===k)!.tb_sek)}`}
          style={v != null ? { background: `rgba(52,224,138,${0.18 + Math.min(v / Math.max(goal, 1), 1.2) * 0.6})`, color: '#04170c', fontWeight: 700 } : undefined}>
          {d}
        </span>;
      })}
    </div>
  );
}

function Chart({ a, goal }: { a: Row[]; goal?: number }) {
  if (!a.length) return <span className="s">Ingen data än</span>;
  const m = Math.max(...a.map(r => r.sales), goal || 1, 1);
  return (
    <div className="ch">
      {a.map(r => (
        <div key={r.id} title={`${r.entry_date}: ${r.sales} sälj, ${fmtMoney(r.tb_sek)}${r.note ? ' – ' + r.note : ''}`}>
          <em>{r.sales}</em>
          <b className={goal && r.sales >= goal ? 'hit' : ''} style={{ height: Math.max(3, (r.sales / m) * 130) }} />
          <span className="s">{r.entry_date.slice(8)}/{r.entry_date.slice(5, 7)}</span>
        </div>
      ))}
    </div>
  );
}

function YearHeat({ rows, goal }: { rows: Row[]; goal: number }) {
  // GitHub-liknande årsheatmap (365 dagar bakåt)
  const n = new Date();
  const days: { date: string; sales: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  const by = new Map(rows.map(r => [r.entry_date, r.sales]));
  for (let i = 364; i >= 0; i--) {
    const d = new Date(n); d.setDate(n.getDate() - i);
    const k = iso(d);
    const v = by.get(k);
    const pctv = v != null ? v / Math.max(goal, 1) : 0;
    const l: 0|1|2|3|4 = v == null ? 0 : pctv < 0.5 ? 1 : pctv < 0.8 ? 2 : pctv < 1 ? 3 : 4;
    days.push({ date: k, sales: v ?? 0, level: l });
  }
  // Gruppera i veckor (kolumner)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <div>
      <div className="year-heat">
        {weeks.map((w, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateRows: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: 7 }).map((_, j) => {
              const d = w[j];
              if (!d) return <div key={j} />;
              return <div key={j} className="d" data-l={d.level} title={`${d.date}: ${d.sales ?? 0} sälj`} />;
            })}
          </div>
        ))}
      </div>
      <div className="row-tight" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <span className="s">Mindre</span>
        <div className="d" data-l="0" style={{ width: 12, height: 12, borderRadius: 3 }} />
        <div className="d" data-l="1" style={{ width: 12, height: 12, borderRadius: 3 }} />
        <div className="d" data-l="2" style={{ width: 12, height: 12, borderRadius: 3 }} />
        <div className="d" data-l="3" style={{ width: 12, height: 12, borderRadius: 3 }} />
        <div className="d" data-l="4" style={{ width: 12, height: 12, borderRadius: 3 }} />
        <span className="s">Mer</span>
      </div>
    </div>
  );
}

export default function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [g, setG] = useState<Goals>(DEF);
  const [role, setRole] = useState<'' | 'seller' | 'manager'>('');
  const [tab, setTab] = useState<TabId>('overview');
  const [edit, setEdit] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [rg, setRg] = useState<'Idag' | 'Denna vecka' | 'Denna månad' | 'Föregående månad' | 'Detta år' | 'Allt'>('Denna månad');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [ks, setKs] = useState<{ configured: boolean; source: string | null }>({ configured: false, source: null });
  const [keyIn, setKeyIn] = useState('');
  const can = role === 'seller';
  const [cm, setCm] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [cText, setCText] = useState('');
  const [cDate, setCDate] = useState('');
  const [bell, setBell] = useState(false);
  const [err, setErr] = useState('');
  const [hl, setHl] = useState('');
  const [theme, setTheme] = useState<string>('default');
  const [themeInit, setThemeInit] = useState(false);
  // Settings state
  const [curPw, setCurPw] = useState(''); const [newPw, setNewPw] = useState(''); const [newPw2, setNewPw2] = useState(''); const [pwMsg, setPwMsg] = useState<{t:string;ok?:boolean}|null>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const say = useCallback((t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); }, []);

  // Theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sd_theme') || 'default';
      setTheme(saved); applyTheme(saved);
    } catch {}
    setThemeInit(true);
  }, []);
  useEffect(() => {
    if (!themeInit) return;
    applyTheme(theme);
    try { localStorage.setItem('sd_theme', theme); } catch {}
  }, [theme, themeInit]);

  const load = useCallback(async () => {
    let j: any = {};
    try { j = await (await fetch('/api/data', { credentials: 'same-origin' })).json(); }
    catch { j = { error: 'Kunde inte nå servern.' }; }
    if (j.error) { setErr(j.error); setLoading(false); return; }
    setErr('');
    const mapped = (j.rows || []).map((x: any) => ({
      ...x, sales: Number(x.sales), tb_sek: Number(x.tb_sek),
      hours: x.hours == null ? null : Number(x.hours),
    }));
    setRows(mapped);
    const gg: Goals = j.goals ? {
      daily_sales: Number(j.goals.daily_sales) || DEF.daily_sales,
      daily_tb: Number(j.goals.daily_tb) || DEF.daily_tb,
      monthly_sales: Number(j.goals.monthly_sales) || DEF.monthly_sales,
      monthly_tb: Number(j.goals.monthly_tb) || DEF.monthly_tb,
    } : DEF;
    setG(gg);
    setRole(j.role || '');
    setLoading(false);
    loadC();
    fetch('/api/ai/key', { credentials: 'same-origin' }).then(x => x.json()).then(k => { if (k.configured !== undefined) setKs(k); }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadC = useCallback(async () => {
    try {
      const j = await (await fetch('/api/comments', { credentials: 'same-origin' })).json();
      if (j.items) { setCm(j.items); setUnread(j.unread || 0); }
    } catch {}
  }, []);
  useEffect(() => { const t = setInterval(loadC, 45000); return () => clearInterval(t); }, [loadC]);
  useEffect(() => {
    if (tab === 'comments')
      fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: '{"action":"seen"}' })
        .then(() => setUnread(0)).catch(() => {});
  }, [tab]);
  useEffect(() => {
    if (!bell) return;
    const on = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBell(false); };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [bell]);
  useEffect(() => {
    if (loading || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let sent: string[] = []; try { sent = JSON.parse(localStorage.getItem('sd_n') || '[]'); } catch {}
    const key = today();
    const fresh = buildAlerts(rows, g, role, unread).filter(x => !sent.includes(key + x));
    fresh.forEach(x => new Notification('Säljdashboard', { body: x }));
    if (fresh.length) try { localStorage.setItem('sd_n', JSON.stringify([...sent.slice(-30), ...fresh.map(x => key + x)])); } catch {}
  }, [rows, g, role, unread, loading]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const d = String(f.get('d')), s = Number(f.get('s')), tb = Number(f.get('t'));
    const hh = String(f.get('h') || ''), h = hh === '' ? null : Number(hh);
    if (!Number.isInteger(s) || s < 0 || !(tb >= 0) || (h !== null && !(h >= 0 && h <= 24))) return alert('Ogiltiga värden.');
    const ex = rows.find(r => r.entry_date === d && r.id !== edit);
    if (ex && !confirm(`Det finns redan en registrering för ${d} (${ex.sales} sälj). Ersätta den?`)) return;
    const r = await api({ action: 'upsert', entry_date: d, sales: s, tb_sek: tb, hours: h, note: String(f.get('n') || '').trim() || null, replace_id: edit });
    if (r.error) return alert('Kunde inte spara: ' + r.error);
    if (s >= g.daily_sales && d === today()) confetti();
    setEdit(null); await load(); setTab('overview'); say(ex ? 'Ersatte tidigare registrering' : 'Sparat ✓');
  }
  async function del(id: number) {
    if (!confirm('Ta bort registreringen?')) return;
    const r = await api({ action: 'delete', id });
    if (r.error) return alert('Kunde inte ta bort: ' + r.error);
    await load(); say('Borttaget ✓');
  }
  async function saveGoals(ng: Goals) {
    const r = await api({ action: 'goals', ...ng });
    if (r.error) return alert(r.error);
    setG(ng); say('Mål sparade ✓');
  }
  function csv() {
    const BOM = '\uFEFF';
    const t = BOM + 'datum;sälj;tb (kr);timmar;anteckning\n' + rows.map(r => [r.entry_date, r.sales, r.tb_sek, r.hours ?? '', '"' + (r.note || '').replace(/"/g, '""') + '"'].join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' }));
    a.download = `salj-${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  async function quick() {
    const r = await api({ action: 'upsert', entry_date: today(), sales: ts + 1, tb_sek: tt, hours: todayRow?.hours ?? null, note: todayRow?.note ?? null });
    if (r.error) return alert(r.error);
    await load(); say('+1 sälj 🔥');
    if (ts + 1 === g.daily_sales) confetti();
  }
  async function ask(question: string) {
    const hist: Msg[] = [...msgs, { r: 'u', t: question }];
    setMsgs(hist); setBusy(true);
    try {
      const j = await (await fetch('/api/ai', {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ today: today(), wl: workdaysLeft(), messages: hist.filter(m => !m.e).slice(-8).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t })) }),
      })).json();
      const ps = (j.proposals || []).map((p: any, i: number) => ({ ...p, id: Date.now() + '-' + i }));
      setMsgs(m => [...m, { r: 'a', t: j.text || (ps.length ? 'Jag föreslår:' : j.error || 'Något gick fel.'), e: !j.text && !ps.length, props: ps }]);
    } catch { setMsgs(m => [...m, { r: 'a', t: 'AI är inte tillgänglig just nu.', e: true }]); }
    setBusy(false);
  }
  async function apply(p: Prop) {
    let r: any;
    if (p.tool === 'registrera_dag') r = await api({ action: 'upsert', entry_date: p.input.entry_date, sales: p.input.sales, tb_sek: p.input.tb_sek, hours: p.input.hours ?? null, note: p.input.note ?? null });
    else if (p.tool === 'satt_mal') r = await api({ action: 'goals', ...g, ...p.input });
    else r = await fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ action: 'add', body: p.input.body, entry_date: p.input.entry_date || null }) }).then(x => x.json());
    if (r.error) return alert(r.error);
    setMsgs(m => m.map(x => ({ ...x, props: x.props?.map(y => y.id === p.id ? { ...y, done: true } : y) })));
    await load(); say('Klart ✓');
  }
  async function postC(e: React.FormEvent) {
    e.preventDefault(); if (!cText.trim()) return;
    const j = await (await fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ action: 'add', body: cText.trim(), entry_date: cDate || null }) })).json();
    if (j.error) return alert(j.error);
    setCText(''); setCDate(''); loadC(); say('Skickat ✓');
  }
  async function keyCall(method: string, key?: string) {
    const r = await fetch('/api/ai/key', { method, headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: key ? JSON.stringify({ key }) : undefined });
    const j = await r.json(); if (!r.ok) return alert(j.error); setKs(j); setKeyIn(''); say(j.configured ? 'Nyckel sparad ✓' : 'Nyckel borttagen');
  }
  async function doLogout() {
    if (!confirm('Logga ut?')) return;
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.replace('/login?e=logged_out');
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null);
    if (newPw.length < 4) return setPwMsg({ t: 'Lösenordet måste vara minst 4 tecken.' });
    if (newPw !== newPw2) return setPwMsg({ t: 'De nya lösenorden matchar inte.' });
    const r = await fetch('/api/password', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ current: curPw, next: newPw }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setPwMsg({ t: j.error || 'Kunde inte byta lösenord.' });
    setPwMsg({ t: 'Lösenord bytt ✓', ok: true }); setCurPw(''); setNewPw(''); setNewPw2(''); say('Lösenord uppdaterat');
  }

  if (loading) return <div className="center"><div className="sk"><i /><i /><i /></div></div>;

  const todayRow = rows.find(r => r.entry_date === today());
  const mo = rows.filter(r => mon(r.entry_date) === mon(today()));
  const ts = todayRow?.sales || 0, tt = todayRow?.tb_sek || 0;
  const ms = sum(mo, 'sales'), mt = sum(mo, 'tb_sek');
  const wl = Math.max(workdaysLeft(), 1);
  const planS = g.monthly_sales * (workdaysDone() / Math.max(workdaysTotal(), 1));
  const ahead = ms - planS;
  const A = range(rows, rg), B = prevRange(rows, rg);
  const hh = A.filter(r => r.hours != null);
  const best = [...A].sort((a, b) => b.sales - a.sales)[0];
  const dl = sum(A, 'sales') - sum(B, 'sales');
  const streak = streakAt(rows, g);
  const bStreak = bestStreak(rows, g);
  const proj = mo.length >= 5 ? (ms / Math.max(mo.length, 1)) * workdaysTotal() : null;
  const wdAvg = [1, 2, 3, 4, 5].map(w => {
    const x = rows.filter(r => new Date(r.entry_date + 'T12:00').getDay() === w);
    return { n: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'][w - 1], v: x.length ? sum(x, 'sales') / x.length : 0 };
  });
  const wmax = Math.max(...wdAvg.map(x => x.v), 1);
  const pbd = pbDay(rows), pbt = pbTB(rows);
  const cmpM = compareMonths(rows);
  const months = groupByMonth(rows).slice(-12);
  const mmax = Math.max(1, ...months.map(m => m.sales));
  const badges = [
    { n: 'Första registreringen', i: '🌱', ok: rows.length >= 1 },
    { n: '10 registrerade dagar', i: '📅', ok: rows.length >= 10 },
    { n: 'Dagsmål nått', i: '🎯', ok: rows.some(r => r.sales >= g.daily_sales && g.daily_sales > 0) },
    { n: '5 dagar i rad', i: '🔥', ok: streak >= 5 },
    { n: '10 dagar i rad', i: '🏅', ok: streak >= 10 },
    { n: 'Rekorddag 10+ sälj', i: '🚀', ok: rows.some(r => r.sales >= 10) },
    { n: 'Rekorddag 15+ sälj', i: '💎', ok: rows.some(r => r.sales >= 15) },
    { n: 'Månadsmål nått', i: '🏆', ok: ms >= g.monthly_sales && g.monthly_sales > 0 },
  ];
  const er = edit ? rows.find(r => r.id === edit) : null;
  const hr = new Date().getHours();
  const alerts = buildAlerts(rows, g, role, unread);
  const greet = hr < 10 ? 'God morgon' : hr < 18 ? 'Hej' : 'God kväll';
  const dayName = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  const tabIndex = TABS.findIndex(t => t.id === tab);
  const activeTab = TABS[tabIndex];

  return (
    <div className="app">
      <aside aria-label="Navigation">
        <div className="logo"><i>S</i><div><div>Säljdashboard</div><small>Privat uppföljning</small></div></div>
        {TABS.map(t => (
          <button key={t.id} className={'nv ' + (tab === t.id ? 'on' : '')} onClick={() => { setTab(t.id); setEdit(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="ic">{t.ic}</span><span>{t.label}</span>
            {t.id === 'comments' && unread > 0 && <em className="dot-mini">{unread}</em>}
          </button>
        ))}
        <div className="who">
          <b>{can ? 'Stille' : 'Affe'}</b>
          <span className={'role'}>{can ? 'Säljare' : 'Chef'}</span>
          <div className="row"><a onClick={doLogout}>Logga ut</a></div>
        </div>
      </aside>
      <main>
        <div className="top">
          <span className="chip">
            {activeTab?.label} {activeTab?.id !== 'overview' && <span className="muted">· {can ? 'Stille' : 'Affe'}</span>}
          </span>
          <div style={{ position: 'relative' }} ref={bellRef}>
            <button className="b bellb" onClick={() => setBell(b => !b)} aria-label="Notiser">
              🔔{alerts.length > 0 && <i className="dot">{alerts.length}</i>}
            </button>
            {bell && (
              <div className="c pop">
                <div className="k">Notiser</div>
                {alerts.length ? alerts.map(x => <p key={x} className="al">{x}</p>) : <p className="s">Allt lugnt just nu 👌</p>}
                {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                  <button className="b" onClick={() => { Notification.requestPermission().then(() => setBell(false)); }}>Aktivera webbläsarnotiser</button>
                )}
                {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                  <p className="s">Webbläsarnotiser är blockerade.</p>
                )}
              </div>
            )}
          </div>
        </div>
        {err && (
          <div className="c errb">
            ⚠️ {err}
            <br /><span className="s">Kontrollera <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code> och att <code>supabase/schema.sql</code> är körd. Öppna <code>/api/health</code> för detaljer.</span>
          </div>
        )}

        {tab === 'overview' && <>
          <h2>{greet}, {can ? 'Stille' : 'Affe'} 👋</h2>
          <p className="sub">{dayName}</p>
          {!rows.length ? (
            <div className="c" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 44 }}>🚀</div>
              <h2 style={{ marginTop: 8 }}>Dags för första registreringen</h2>
              <p className="sub">Inga resultat sparade än.</p>
              {can && <button className="b pri" onClick={() => setTab('register')}>Registrera dagens siffror</button>}
            </div>
          ) : <>
            <div className="c hero">
              <Ring p={pct(ts, g.daily_sales)} sub={`${ts}/${g.daily_sales}`} />
              <div>
                <div className="k">Idag</div>
                <div className="v" style={{ fontSize: 38 }}><CountUp n={ts} suffix={` / ${g.daily_sales} sälj`} /></div>
                <p style={{ margin: '6px 0 14px', color: 'var(--mu2)' }}>
                  {ts < g.daily_sales
                    ? <>Det behövs <b className="ok">{g.daily_sales - ts} sälj</b> till för att nå dagsmålet.</>
                    : <b className="ok">Dagsmålet är nått! 🎉</b>}<br />
                  TB: <b style={{ color: 'var(--tx)' }}>{fmtMoney(tt)}</b> av {fmtMoney(g.daily_tb)} ({pct(tt, g.daily_tb)}%).
                </p>
                <div className="row" style={{ margin: 0 }}>
                  {can && <button className="b pri" onClick={quick}>+1 sälj</button>}
                  {can && <button className="b" onClick={() => setTab('register')}>Registrera dagens siffror</button>}
                  <button className="b" onClick={() => setTab('ai')}>✦ Fråga AI-coachen</button>
                </div>
              </div>
            </div>
            <div className="c" style={{ marginBottom: 14 }}>
              <div className="k">Dagens takt</div>
              <div className="row" style={{ margin: '8px 0 0' }}>
                <input style={{ width: 150 }} type="number" min="0" step="0.5" placeholder="Timmar kvar" value={hl} onChange={e => setHl(e.target.value)} />
                <span className="s">
                  {ts >= g.daily_sales ? 'Målet är nått 🎉' :
                    Number(hl) > 0 && (g.daily_sales - ts) > 0 ? `Ett sälj var ${Math.max(1, Math.round(Number(hl) * 60 / (g.daily_sales - ts)))}:e minut för att nå målet` :
                    'Ange hur många timmar du har kvar idag'}
                </span>
              </div>
            </div>

            <div className="g">
              <Stat k="TB idag" v={fmtMoney(tt)} s={`mål ${fmtMoney(g.daily_tb)} · ${pct(tt, g.daily_tb)}%`} bar={pct(tt, g.daily_tb)} icon="💰" />
              <Stat k="Månadens sälj" v={fmt(ms)} s={`mål ${fmt(g.monthly_sales)} · ${pct(ms, g.monthly_sales)}%`} bar={pct(ms, g.monthly_sales)} icon="📈" />
              <Stat k="Månadens TB" v={fmtMoney(mt)} s={`mål ${fmtMoney(g.monthly_tb)}`} bar={pct(mt, g.monthly_tb)} icon="💸" />
              <Stat k="Mot plan" v={(ahead >= 0 ? '+' : '') + f1(ahead) + ' sälj'} s={ahead >= 0 ? 'Före plan' : 'Efter plan'} c={ahead >= 0 ? 'ok' : 'bad'} icon="📊" />
              <Stat k="Streak 🔥" v={streak + ' dgr'} s={`bästa: ${bStreak}`} c={streak ? 'ok' : ''} icon="🔥" />
              <Stat k="Snitt/dag" v={mo.length ? f1(ms / mo.length) : '–'} s={`över ${mo.length} dagar`} icon="📅" />
              <Stat k="Snitt TB/sälj" v={ms ? fmtMoney(mt / ms) : '–'} s="denna månad" icon="🏷" />
              <Stat k="Prognos" v={proj != null ? fmt(Math.round(proj)) + ' sälj' : '–'} s={proj != null ? (proj >= g.monthly_sales ? 'Når målet' : 'Under målet') : '≥5 dagar för prognos'} c={proj != null ? (proj >= g.monthly_sales ? 'ok' : 'bad') : ''} icon="🔮" />
              <Stat k="Krävs/dag" v={f1(Math.max(g.monthly_sales - ms, 0) / wl) + ' sälj'} s={`${wl} arbetsdagar kvar`} icon="⏳" />
            </div>

            {cmpM && (
              <div className="c">
                <div className="k">Jämfört med förra månaden</div>
                <div className="row" style={{ marginTop: 10, marginBottom: 0 }}>
                  <div>
                    <div className="s">Förra månaden: {fmt(cmpM.prev.sales)} sälj / {fmtMoney(cmpM.prev.tb)}</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>
                      {cmpM.cur.sales} sälj <span className={'stat-change ' + (cmpM.salesDiff >= 0 ? 'up' : 'down')}>
                        {cmpM.salesDiff >= 0 ? '▲' : '▼'} {Math.abs(cmpM.salesDiff)} ({cmpM.salesPct >= 0 ? '+' : ''}{cmpM.salesPct}%)
                      </span>
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--bd)', paddingLeft: 20 }}>
                    <div className="s">TB: {fmtMoney(cmpM.prev.tb)}</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>
                      {fmtMoney(cmpM.cur.tb)} <span className={'stat-change ' + (cmpM.tbDiff >= 0 ? 'up' : 'down')}>
                        {cmpM.tbDiff >= 0 ? '▲' : '▼'} {fmtMoney(Math.abs(cmpM.tbDiff))} ({cmpM.tbPct >= 0 ? '+' : ''}{cmpM.tbPct}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pbd && (
              <div className="c">
                <div className="k">Rekord</div>
                <div className="row" style={{ marginTop: 8, marginBottom: 0 }}>
                  <div>🏅 Flest sälj på en dag: <b>{pbd.sales}</b> <span className="s">({pbd.entry_date})</span></div>
                  {pbt && <div>💰 Högst TB på en dag: <b>{fmtMoney(pbt.tb_sek)}</b> <span className="s">({pbt.entry_date})</span></div>}
                </div>
              </div>
            )}

            <div className="c">
              <div className="k">Senaste 14 dagarna</div>
              <Chart a={rows.slice(-14)} goal={g.daily_sales} />
            </div>
            <div className="c" style={{ marginTop: 14 }}>
              <div className="k">Månadskalender</div>
              <Heat rows={rows} goal={g.daily_sales} />
            </div>
          </>}
        </>}

        {tab === 'register' && <>
          <h2>{er ? 'Ändra registrering' : 'Registrera resultat'}</h2>
          <p className="sub">Samma datum ersätter den gamla registreringen.</p>
          {can ? (
            <div className="c" style={{ maxWidth: 560 }}>
              <form key={edit ?? 'new'} onSubmit={save}>
                <label>Datum<input name="d" type="date" required defaultValue={er?.entry_date || today()} /></label>
                <div className="two">
                  <label>Antal sälj<input name="s" type="number" min="0" step="1" inputMode="numeric" required defaultValue={er?.sales} /></label>
                  <label>Totalt TB (kr)<input name="t" type="number" min="0" step="1" inputMode="numeric" required defaultValue={er?.tb_sek} /></label>
                </div>
                <label>Arbetade timmar (valfritt)<input name="h" type="number" min="0" max="24" step="0.25" inputMode="decimal" defaultValue={er?.hours ?? ''} /></label>
                <label>Anteckning (valfritt)<textarea name="n" rows={3} defaultValue={er?.note || ''} placeholder="T.ex. bra flow på eftermiddagen…" /></label>
                <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
                  <button className="b pri">{er ? 'Uppdatera' : 'Spara resultat'}</button>
                  {edit && <button type="button" className="b" onClick={() => setEdit(null)}>Avbryt</button>}
                </div>
              </form>
            </div>
          ) : <p className="s">Bara säljaren kan registrera.</p>}
        </>}

        {tab === 'history' && <>
          <h2>Historik</h2>
          <p className="sub">{rows.length} registrerade dagar · senaste uppdatering {new Date().toLocaleTimeString('sv-SE')}</p>
          <div className="row">
            <button className="b" onClick={csv} disabled={!rows.length}>Exportera CSV (Excel)</button>
          </div>
          <div className="c sc">
            <table>
              <thead><tr><th>Datum</th><th>Sälj</th><th>TB</th><th>Tim</th><th>TB/sälj</th><th>Anteckning</th><th style={{ textAlign: 'right' }}>Åtgärd</th></tr></thead>
              <tbody>
                {[...rows].reverse().map(r => (
                  <tr key={r.id}>
                    <td className="num">{r.entry_date}</td>
                    <td><b>{r.sales}</b> {r.sales >= g.daily_sales && <span className="tag">mål</span>}</td>
                    <td className="num">{fmtMoney(r.tb_sek)}</td>
                    <td className="num">{r.hours ?? '–'}</td>
                    <td className="num">{r.sales ? fmtMoney(r.tb_sek / r.sales) : '–'}</td>
                    <td className="text-truncate" style={{ maxWidth: 240 }} title={r.note || ''}>{r.note || <span className="muted">–</span>}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {can && <><button className="b sm" onClick={() => { setEdit(r.id); setTab('register'); }}>Ändra</button> <button className="b sm r" onClick={() => del(r.id)}>Ta bort</button></>}
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={7} className="s" style={{ textAlign: 'center', padding: 24 }}>Inga registreringar än</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {tab === 'stats' && <>
          <h2>Statistik</h2>
          <p className="sub">Dagar utan registrering räknas inte som noll.</p>
          <div className="row">
            <select value={rg} onChange={e => setRg(e.target.value as any)}>
              {['Idag', 'Denna vecka', 'Denna månad', 'Föregående månad', 'Detta år', 'Allt'].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="g">
            <Stat k="Sälj" v={fmt(sum(A, 'sales'))} icon="🎯" />
            <Stat k="TB" v={fmtMoney(sum(A, 'tb_sek'))} icon="💰" />
            <Stat k="TB/sälj" v={sum(A, 'sales') ? fmtMoney(sum(A, 'tb_sek') / sum(A, 'sales')) : '–'} icon="🏷" />
            <Stat k="Sälj/dag" v={A.length ? f1(sum(A, 'sales') / A.length) : '–'} s={`${A.length} dagar`} icon="📅" />
            <Stat k="Sälj/timme" v={sum(hh, 'hours') ? f1(sum(hh, 'sales') / sum(hh, 'hours')) : '–'} s="när timmar finns" icon="⏱" />
            <Stat k="Snitt timmar/dag" v={hh.length ? f1(sum(hh, 'hours') / hh.length) : '–'} s={`${hh.length} dagar med tid`} icon="⌛" />
            <Stat k="Bästa dag (sälj)" v={best ? best.sales : '–'} s={best?.entry_date} icon="🏆" />
            <Stat k="Mot fg period" v={B.length ? ((dl >= 0 ? '+' : '') + dl) : '–'} s="sälj" c={dl >= 0 ? 'ok' : 'bad'} icon="📊" />
          </div>
          <div className="c">
            <div className="k">Dagliga sälj ({rg})</div>
            <Chart a={A.slice(-21)} goal={g.daily_sales} />
          </div>
          <div className="c" style={{ marginTop: 14 }}>
            <div className="k">Snitt sälj per veckodag</div>
            <div className="ch">
              {wdAvg.map(x => <div key={x.n}><em>{x.v ? f1(x.v) : '–'}</em><b style={{ height: (x.v / wmax) * 110 }} />{x.n}</div>)}
            </div>
          </div>
          <div className="c" style={{ marginTop: 14 }}>
            <div className="k">Märken</div>
            <div className="badges">{badges.map(b => <span key={b.n} className={'bd ' + (b.ok ? 'on' : '')}>{b.i} {b.n}</span>)}</div>
          </div>
        </>}

        {tab === 'year' && <>
          <h2>Årsvy</h2>
          <p className="sub">Översikt över senaste 12 månaderna + 365-dagars heatmap.</p>
          <div className="g">
            <Stat k="Årets sälj" v={fmt(sum(rows.filter(r => r.entry_date.startsWith(String(new Date().getFullYear()))), 'sales'))} icon="📅" />
            <Stat k="Årets TB" v={fmtMoney(sum(rows.filter(r => r.entry_date.startsWith(String(new Date().getFullYear()))), 'tb_sek'))} icon="💰" />
            <Stat k="Längsta streak" v={bStreak + ' dgr'} icon="🔥" />
            <Stat k="Registrerade dagar" v={rows.length} icon="✅" />
          </div>
          <div className="c">
            <div className="k">Månadsvis (senaste 12)</div>
            <div className="bar-chart h" style={{ marginTop: 10 }}>
              {months.map(m => (
                <div key={m.label} className="bar-row">
                  <div className="lbl num">{m.label} <span className="s">({m.days}d)</span></div>
                  <div className="track"><i style={{ width: Math.round((m.sales / mmax) * 100) + '%' }} /></div>
                  <div className="val num">{fmt(m.sales)} <span className="s">/ {fmtMoney(m.tb)}</span></div>
                </div>
              ))}
              {!months.length && <p className="s">Ingen data än.</p>}
            </div>
          </div>
          <div className="c" style={{ marginTop: 14 }}>
            <div className="k">365-dagars översikt</div>
            <div style={{ marginTop: 10 }}><YearHeat rows={rows} goal={g.daily_sales} /></div>
          </div>
        </>}

        {tab === 'goals' && <>
          <h2>Mål</h2>
          <p className="sub">Sätt dag- och månadsmål. Inget sparas förrän du klickar Spara.</p>
          {can ? (
            <div className="c" style={{ maxWidth: 600, marginBottom: 14 }}>
              <form key={JSON.stringify(g)} onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                saveGoals({ daily_sales: Number(f.get('a')), daily_tb: Number(f.get('b')), monthly_sales: Number(f.get('c')), monthly_tb: Number(f.get('d')) });
              }}>
                <div className="two">
                  <label>Dagsmål sälj<input name="a" type="number" min="0" defaultValue={g.daily_sales} /></label>
                  <label>Dagsmål TB (kr)<input name="b" type="number" min="0" defaultValue={g.daily_tb} /></label>
                  <label>Månadsmål sälj<input name="c" type="number" min="0" defaultValue={g.monthly_sales} /></label>
                  <label>Månadsmål TB (kr)<input name="d" type="number" min="0" defaultValue={g.monthly_tb} /></label>
                </div>
                <button className="b pri">Spara mål</button>
              </form>
            </div>
          ) : <p className="s">Bara säljaren kan ändra mål.</p>}
          <div className="g">
            <Stat k="Sälj kvar" v={fmt(Math.max(g.monthly_sales - ms, 0))} s={f1(Math.max(g.monthly_sales - ms, 0) / wl) + ' per dag'} icon="⏳" />
            <Stat k="TB kvar" v={fmtMoney(Math.max(g.monthly_tb - mt, 0))} s={fmtMoney(Math.max(g.monthly_tb - mt, 0) / wl) + '/dag'} icon="⌛" />
          </div>
        </>}

        {tab === 'comments' && <>
          <h2>Kommentarer</h2>
          <p className="sub">Mellan Stille och Affe. Koppla gärna en kommentar till ett datum.</p>
          <div className="c" style={{ maxWidth: 640, marginBottom: 14 }}>
            <form onSubmit={postC}>
              <textarea rows={2} maxLength={1000} placeholder={can ? 'Skriv till Affe…' : 'Skriv till Stille…'} value={cText} onChange={e => setCText(e.target.value)} />
              <div className="row" style={{ margin: 0 }}>
                <input type="date" style={{ width: 170 }} value={cDate} onChange={e => setCDate(e.target.value)} title="Koppla till en dag (valfritt)" />
                <button className="b pri">Skicka</button>
              </div>
            </form>
          </div>
          <div className="chat" style={{ maxWidth: 640 }}>
            {cm.map(c => (
              <div key={c.id} className={'msg ' + (c.author === role ? 'u' : 'a')}>
                <div className="s">{c.author === 'seller' ? 'Stille' : 'Affe'}{c.entry_date ? ' · om ' + c.entry_date : ''} · {new Date(c.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</div>
                {c.body}
              </div>
            ))}
            {!cm.length && <p className="s">Inga kommentarer än.</p>}
          </div>
        </>}

        {tab === 'ai' && <>
          <h2>AI-coach</h2>
          <p className="sub">Kan föreslå och göra ändringar åt dig – du godkänner alltid först.</p>
          {!ks.configured && (
            <div className="c" style={{ maxWidth: 560, marginBottom: 14 }}>
              <div className="k">Aktivera AI</div>
              <p className="s" style={{ marginTop: 6 }}>Klistra in din Anthropic-nyckel (<code>sk-ant-…</code>). Den sparas bara på servern.</p>
              {can ? (
                <form onSubmit={e => { e.preventDefault(); keyCall('POST', keyIn); }}>
                  <input type="password" placeholder="sk-ant-…" value={keyIn} onChange={e => setKeyIn(e.target.value)} autoComplete="off" />
                  <button className="b pri" style={{ marginTop: 8 }}>Spara nyckel</button>
                </form>
              ) : <p className="s">Stille lägger in nyckeln.</p>}
            </div>
          )}
          {ks.configured && (
            <div className="row">
              <span className="tag">✓ AI aktiv ({ks.source === 'env' ? 'miljövariabel' : 'sparad nyckel'})</span>
              {can && ks.source === 'db' && <button className="b ghost" onClick={() => { if (confirm('Ta bort nyckeln?')) keyCall('DELETE'); }}>Ta bort nyckel</button>}
            </div>
          )}
          {ks.configured && <>
            <div className="row">
              {(can ? ['Hur ligger jag till idag?', 'Föreslå dagens mål', 'Registrera idag: 5 sälj och 3000 kr', 'Veckosammanfattning', 'Peppa mig'] : ['Hur går det för Stille?', 'Veckosammanfattning', 'Skriv en peppande kommentar']).map(x => (
                <button key={x} className="b" disabled={busy} onClick={() => ask(x)}>{x}</button>
              ))}
            </div>
            <div className="chat">
              {msgs.map((m, i) => (
                <div key={i} className={`msg ${m.r} ${m.e ? 'e' : ''}`}>
                  {m.t}
                  {m.props?.map(p => (
                    <div key={p.id} className="sug">
                      {desc(p)}<br />
                      {p.done ? <span className="tag">✓ Gjort</span> : <button className="b pri" style={{ marginTop: 8 }} onClick={() => apply(p)}>Godkänn</button>}
                    </div>
                  ))}
                </div>
              ))}
              {busy && <div className="msg a s">Tänker…</div>}
            </div>
            <form onSubmit={e => { e.preventDefault(); if (q.trim()) { ask(q.trim()); setQ(''); } }} style={{ maxWidth: 640, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input value={q} maxLength={500} onChange={e => setQ(e.target.value)} placeholder="Fråga eller be AI:n göra något…" />
              <button className="b pri" disabled={busy || !q.trim()}>Skicka</button>
            </form>
          </>}
        </>}

        {tab === 'settings' && <>
          <h2>Inställningar</h2>
          <p className="sub">Anpassa utseende och säkerhet.</p>
          <div className="c" style={{ maxWidth: 560, marginBottom: 14 }}>
            <div className="k">Tema</div>
            <div className="seg-theme" role="radiogroup" aria-label="Teman" style={{ marginTop: 10 }}>
              {THEMES.map(t => (
                <button key={t.id} type="button" className={theme === t.id ? 'on' : ''} onClick={() => setTheme(t.id)} aria-pressed={theme === t.id} title={t.label}>
                  <span className={t.cls} style={{ display: 'block', width: '100%', height: '100%', borderRadius: 8 }}>{t.emoji}</span>
                </button>
              ))}
            </div>
            <p className="s">Valet sparas lokalt i din webbläsare.</p>
          </div>

          <div className="c" style={{ maxWidth: 560, marginBottom: 14 }}>
            <div className="k">Byt lösenord ({can ? 'Stille' : 'Affe'})</div>
            <p className="s" style={{ marginTop: 6 }}>Kräver nuvarande lösenord. Det nya lösenordet gäller för alla enheter.</p>
            <form onSubmit={changePw} style={{ marginTop: 10 }}>
              <label>Nuvarande lösenord<input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} required autoComplete="current-password" /></label>
              <div className="two">
                <label>Nytt lösenord<input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={4} autoComplete="new-password" /></label>
                <label>Bekräfta nytt<input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} required minLength={4} autoComplete="new-password" /></label>
              </div>
              <div className="row" style={{ margin: 0 }}>
                <button className="b pri">Byt lösenord</button>
                {pwMsg && <span className={'s ' + (pwMsg.ok ? 'ok' : 'bad')} style={{ alignSelf: 'center' }}>{pwMsg.t}</span>}
              </div>
            </form>
          </div>

          <div className="c" style={{ maxWidth: 560 }}>
            <div className="k">Om</div>
            <p className="s" style={{ marginTop: 8 }}>Säljdashboard v5 · Next.js 14 · Supabase · lokal HMAC-sessionssäkerhet.</p>
            <div className="row" style={{ marginTop: 8, marginBottom: 0 }}>
              <button className="b ghost" onClick={() => window.open('/api/health', '_blank')}>Öppna hälsokontroll</button>
              <button className="b danger" onClick={doLogout}>Logga ut</button>
            </div>
          </div>
        </>}

        {toast && <div className="toast" role="status">{toast}</div>}
      </main>
    </div>
  );
}
