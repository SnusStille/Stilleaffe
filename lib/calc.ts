export type Mood = 'fire' | 'great' | 'ok' | 'tired' | 'bad' | null;
export type Row = {
  id: number; entry_date: string; sales: number; tb_sek: number; hours: number | null;
  note: string | null; rating: number | null; mood: Mood; tags: string[];
};
export type Goals = {
  daily_sales: number; daily_tb: number;
  weekly_sales: number; weekly_tb: number;
  monthly_sales: number; monthly_tb: number;
};
export type Activity = { id: number; author: string; event: string; payload: any; created_at: string };

export const DEF: Goals = { daily_sales: 7, daily_tb: 3000, weekly_sales: 35, weekly_tb: 15000, monthly_sales: 140, monthly_tb: 60000 };

export const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const today = () => {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
const stockholmDate = () => { const [y, m, d] = today().split('-').map(Number); return new Date(y, m - 1, d); };
export const mon = (d: string) => d.slice(0, 7);
export const year = (d: string) => d.slice(0, 4);
export const fmt = (n: number) => Math.round(n).toLocaleString('sv-SE');
export const fmtMoney = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';
export const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('sv-SE');
export const sum = (a: any[], k: string) => a.reduce((s, r) => s + Number(r[k] || 0), 0);
export const avg = (a: any[], k: string) => a.length ? sum(a, k) / a.length : 0;
export const pct = (a: number, b: number) => (b > 0 ? Math.min(999, Math.round((a / b) * 100)) : 0);
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function wd(from: Date, to: Date) {
  let c = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const w = d.getDay(); if (w > 0 && w < 6) c++;
  }
  return c;
}
// Swedish week (ISO: Monday first)
export function weekKey(d: Date) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const w = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return tmp.getUTCFullYear() + '-W' + String(w).padStart(2, '0');
}
export function weekRange(key?: string): { start: Date; end: Date } {
  const n = new Date();
  if (!key) key = weekKey(n);
  const [yr, wstr] = key.split('-W');
  const y = Number(yr), w = Number(wstr);
  const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  if (dow <= 4) monday.setUTCDate(simple.getUTCDate() - dow + 1);
  else monday.setUTCDate(simple.getUTCDate() + 8 - dow);
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()), end: new Date(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate()) };
}
export const workdaysLeft = () => { const n = stockholmDate(); return wd(n, new Date(n.getFullYear(), n.getMonth() + 1, 0)); };
export const workdaysTotal = () => { const n = stockholmDate(); return wd(new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)); };
export const workdaysDone = () => { const n = stockholmDate(); const end = new Date(n); end.setDate(end.getDate() - 1); return wd(new Date(n.getFullYear(), n.getMonth(), 1), end); };
export const workdaysElapsed = () => { const n = stockholmDate(); return wd(new Date(n.getFullYear(), n.getMonth(), 1), n); };

export function range(a: Row[], k: string): Row[] {
  const n = new Date(), t = today();
  const wk = weekRange(), wkEnd = iso(wk.end), wkStart = iso(wk.start);
  const monthStart = iso(new Date(n.getFullYear(), n.getMonth(), 1));
  const monthEnd = iso(new Date(n.getFullYear(), n.getMonth() + 1, 0));
  const pmStart = iso(new Date(n.getFullYear(), n.getMonth() - 1, 1));
  const pmEnd = iso(new Date(n.getFullYear(), n.getMonth(), 0));
  const yStart = iso(new Date(n.getFullYear(), 0, 1));
  if (k === 'Idag') return a.filter(r => r.entry_date === t);
  if (k === 'Denna vecka') return a.filter(r => r.entry_date >= wkStart && r.entry_date <= wkEnd);
  if (k === 'Denna månad') return a.filter(r => r.entry_date >= monthStart && r.entry_date <= monthEnd);
  if (k === 'Föregående månad') return a.filter(r => r.entry_date >= pmStart && r.entry_date <= pmEnd);
  if (k === 'Detta år') return a.filter(r => r.entry_date >= yStart);
  return a;
}
export function prevRange(a: Row[], k: string): Row[] {
  const n = new Date();
  if (k === 'Denna månad') {
    const s = iso(new Date(n.getFullYear(), n.getMonth() - 1, 1));
    const e = iso(new Date(n.getFullYear(), n.getMonth(), 0));
    return a.filter(r => r.entry_date >= s && r.entry_date <= e);
  }
  if (k === 'Denna vecka') {
    const w = new Date(n); w.setDate(n.getDate() - ((n.getDay() + 6) % 7) - 7);
    const e = new Date(w); e.setDate(w.getDate() + 6);
    return a.filter(r => r.entry_date >= iso(w) && r.entry_date <= iso(e));
  }
  return [];
}
export function weekSales(rows: Row[]): { key: string; sales: number; tb: number }[] {
  const m = new Map<string, { sales: number; tb: number }>();
  for (const r of rows) {
    const d = new Date(r.entry_date + 'T12:00');
    const k = weekKey(d);
    if (!m.has(k)) m.set(k, { sales: 0, tb: 0 });
    const v = m.get(k)!; v.sales += r.sales; v.tb += r.tb_sek;
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, v]) => ({ key, ...v })).slice(-12);
}
export function groupByMonth(rows: Row[]): { label: string; sales: number; tb: number; days: number; hours: number }[] {
  const map = new Map<string, Row[]>();
  for (const r of rows) { const k = mon(r.entry_date); if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ label: k, sales: sum(v, 'sales'), tb: sum(v, 'tb_sek'), days: v.length, hours: sum(v, 'hours') }));
}
export function streakAt(rows: Row[], g: Goals, d: Date = new Date()): number {
  const set = new Map(rows.map(r => [r.entry_date, r.sales]));
  let n = 0; const cur = new Date(d);
  if ((set.get(iso(cur)) || 0) < g.daily_sales) cur.setDate(cur.getDate() - 1);
  for (let i = 0; i < 366; i++) {
    const w = cur.getDay(); if (w === 0 || w === 6) { cur.setDate(cur.getDate() - 1); continue; }
    if ((set.get(iso(cur)) || 0) >= g.daily_sales) { n++; cur.setDate(cur.getDate() - 1); } else break;
  }
  return n;
}
export function bestStreak(rows: Row[], g: Goals): number {
  const set = new Map(rows.map(r => [r.entry_date, r.sales]));
  const sorted = [...set.keys()].sort();
  let best = 0, cur = 0, prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(k + 'T12:00'); const w = d.getDay();
    if (w === 0 || w === 6) continue;
    if ((set.get(k) || 0) < g.daily_sales) { cur = 0; prev = d; continue; }
    if (prev) {
      const p = new Date(prev); p.setDate(p.getDate() + 1);
      while (p < d && (p.getDay() === 0 || p.getDay() === 6)) p.setDate(p.getDate() + 1);
      if (iso(p) !== k) cur = 0;
    }
    cur++; if (cur > best) best = cur; prev = d;
  }
  return best;
}
export function pbDay(rows: Row[]): Row | null { return rows.reduce<Row | null>((b, r) => (!b || r.sales > b.sales ? r : b), null); }
export function pbTB(rows: Row[]): Row | null { return rows.reduce<Row | null>((b, r) => (!b || r.tb_sek > b.tb_sek ? r : b), null); }
export function compareMonths(rows: Row[]) {
  const [yearNum, monthNum, dayNum] = today().split('-').map(Number);
  const curKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
  const previousMonth = new Date(yearNum, monthNum - 2, 1);
  const prevKey = mon(iso(previousMonth));
  const previousMonthLastDay = new Date(yearNum, monthNum - 1, 0).getDate();
  const prevThrough = iso(new Date(yearNum, monthNum - 2, Math.min(dayNum, previousMonthLastDay)));
  const curRows = rows.filter(r => mon(r.entry_date) === curKey && r.entry_date <= today());
  const prevRows = rows.filter(r => mon(r.entry_date) === prevKey && r.entry_date <= prevThrough);
  // Don't manufacture a zero month when either period has not been registered.
  if (!curRows.length || !prevRows.length) return null;
  const cur = { label: curKey, sales: sum(curRows, 'sales'), tb: sum(curRows, 'tb_sek'), days: curRows.length };
  const prev = { label: prevKey, sales: sum(prevRows, 'sales'), tb: sum(prevRows, 'tb_sek'), days: prevRows.length };
  return {
    cur,
    prev,
    salesDiff: cur.sales - prev.sales,
    tbDiff: cur.tb - prev.tb,
    salesPct: prev.sales ? Math.round((cur.sales - prev.sales) / prev.sales * 100) : null,
    tbPct: prev.tb ? Math.round((cur.tb - prev.tb) / prev.tb * 100) : null,
  };
}
export const MOOD_EMOJI: Record<string, string> = { fire: '🔥', great: '😄', ok: '🙂', tired: '😴', bad: '😩' };
export const MOOD_LABEL: Record<string, string> = { fire: 'På topp', great: 'Bra', ok: 'Okej', tired: 'Trött', bad: 'Dålig' };

const QUOTES: { t: string; a: string }[] = [
  { t: 'Sälj är inte något du gör mot någon – det är något du gör för någon.', a: 'Zig Ziglar' },
  { t: 'Varje nej tar dig närmare ett ja.', a: '' },
  { t: 'Skillnaden mellan en bra dag och en dålig dag är din attityd.', a: '' },
  { t: 'Du missar 100% av de skotten du inte tar.', a: 'Wayne Gretzky' },
  { t: 'Framgång är att gå från misslyckande till misslyckande utan att tappa entusiasmen.', a: 'Winston Churchill' },
  { t: 'Den enda plats där framgång kommer före arbete är i ordboken.', a: 'Vidal Sassoon' },
  { t: 'Gör det svåra medan det är lätt, gör det stora medan det är litet.', a: 'Lao Tzu' },
  { t: 'Sälj handlar om relationer, inte transaktioner.', a: '' },
  { t: 'Ett mål utan en plan är bara en önskan.', a: 'Antoine de Saint-Exupéry' },
  { t: 'Lilla varje dag blir stort till slut.', a: '' },
  { t: 'Den som väntar på något gott väntar aldrig för länge – men den som agerar får det snabbare.', a: '' },
  { t: 'Disciplin är bron mellan mål och resultat.', a: 'Jim Rohn' },
];
export function quoteOfDay(): { t: string; a: string } {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[day % QUOTES.length];
}

export type Achievement = { key: string; name: string; emoji: string; desc: string; cond: (rows: Row[], g: Goals, unlocked: Set<string>) => boolean };
export const ACHIEVEMENTS: Achievement[] = [
  { key: 'first_entry', name: 'Första steget', emoji: '🌱', desc: 'Du registrerade din första dag!', cond: r => r.length >= 1 },
  { key: 'first_goal', name: 'Dagsmål nått!', emoji: '🎯', desc: 'Du nådde dagsmålet en gång.', cond: (r, g) => g.daily_sales > 0 && r.some(x => x.sales >= g.daily_sales) },
  { key: 'entries_10', name: '10 dagar', emoji: '📅', desc: '10 registrerade dagar.', cond: r => r.length >= 10 },
  { key: 'entries_50', name: 'Disciplin', emoji: '📚', desc: '50 registrerade dagar.', cond: r => r.length >= 50 },
  { key: 'streak_3', name: 'I form', emoji: '🔥', desc: '3 dagar i rad med mål.', cond: (r, g) => bestStreak(r, g) >= 3 },
  { key: 'streak_7', name: 'En hel vecka!', emoji: '💪', desc: '7 arbetsdagar i rad med mål.', cond: (r, g) => bestStreak(r, g) >= 7 },
  { key: 'streak_14', name: 'Två veckor!', emoji: '🏅', desc: '14 arbetsdagar i rad.', cond: (r, g) => bestStreak(r, g) >= 14 },
  { key: 'streak_30', name: 'Månadens kung', emoji: '👑', desc: '30 arbetsdagar i rad.', cond: (r, g) => bestStreak(r, g) >= 30 },
  { key: 'ten_sales', name: 'Dubbel siffra', emoji: '🚀', desc: 'En dag med 10+ sälj.', cond: r => r.some(x => x.sales >= 10) },
  { key: 'fifteen_sales', name: 'Monsterdag', emoji: '💎', desc: 'En dag med 15+ sälj.', cond: r => r.some(x => x.sales >= 15) },
  { key: 'twenty_sales', name: 'Legendarisk', emoji: '⚡', desc: 'En dag med 20+ sälj.', cond: r => r.some(x => x.sales >= 20) },
  { key: 'month_goal', name: 'Månadsmästare', emoji: '🏆', desc: 'Du nådde månadsmålet!', cond: (r, g) => g.monthly_sales > 0 && sum(r.filter(x => mon(x.entry_date) === mon(today())), 'sales') >= g.monthly_sales },
  { key: 'tb_100k_month', name: 'Sexsiffrigt', emoji: '💰', desc: 'Över 100 000 kr TB på en månad.', cond: r => { const m = groupByMonth(r); return m.some(x => x.tb >= 100000); } },
];

export function greeting(): string {
  const hr = new Date().getHours();
  if (hr < 5) return 'God natt';
  if (hr < 10) return 'God morgon';
  if (hr < 18) return 'Hej';
  if (hr < 23) return 'God kväll';
  return 'God natt';
}

