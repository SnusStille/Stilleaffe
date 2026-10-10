export type Row = { id: number; entry_date: string; sales: number; tb_sek: number; hours: number | null; note: string | null };
export type Goals = { daily_sales: number; daily_tb: number; monthly_sales: number; monthly_tb: number };
export const DEF: Goals = { daily_sales: 7, daily_tb: 3000, monthly_sales: 140, monthly_tb: 60000 };

export const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const today = () => iso(new Date());
export const mon = (d: string) => d.slice(0, 7); // YYYY-MM
export const year = (d: string) => d.slice(0, 4);
export const qtr = (d: string) => year(d) + '-Q' + (Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1);
export const fmt = (n: number) => Math.round(n).toLocaleString('sv-SE');
export const fmtMoney = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';
export const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('sv-SE');
export const sum = (a: any[], k: string) => a.reduce((s, r) => s + Number(r[k] || 0), 0);
export const avg = (a: any[], k: string) => a.length ? sum(a, k) / a.length : 0;
export const pct = (a: number, b: number) => (b > 0 ? Math.min(999, Math.round((a / b) * 100)) : 0);

export function wd(from: Date, to: Date) {
  let c = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const w = d.getDay();
    if (w > 0 && w < 6) c++;
  }
  return c;
}
export const workdaysLeft = () => { const n = new Date(); return Math.max(wd(new Date(n.getFullYear(), n.getMonth(), n.getDate()), new Date(n.getFullYear(), n.getMonth() + 1, 0)), 1); };
export const workdaysTotal = () => { const n = new Date(); return wd(new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)); };
export const workdaysDone = () => { const n = new Date(); return wd(new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1)); };

export function range(a: Row[], k: string): Row[] {
  const n = new Date(), t = today();
  const w = new Date(n); w.setDate(n.getDate() - ((n.getDay() + 6) % 7)); // måndag
  const we = new Date(w); we.setDate(w.getDate() + 6); // söndag
  const monthStart = iso(new Date(n.getFullYear(), n.getMonth(), 1));
  const monthEnd = iso(new Date(n.getFullYear(), n.getMonth() + 1, 0));
  const pmStart = iso(new Date(n.getFullYear(), n.getMonth() - 1, 1));
  const pmEnd = iso(new Date(n.getFullYear(), n.getMonth(), 0));
  const yStart = iso(new Date(n.getFullYear(), 0, 1));
  if (k === 'Idag') return a.filter(r => r.entry_date === t);
  if (k === 'Denna vecka') return a.filter(r => r.entry_date >= iso(w) && r.entry_date <= iso(we));
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

export function groupByMonth(rows: Row[]): { label: string; sales: number; tb: number; days: number }[] {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const k = mon(r.entry_date);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ label: k, sales: sum(v, 'sales'), tb: sum(v, 'tb_sek'), days: v.length }));
}

export function streakAt(rows: Row[], g: Goals, d: Date = new Date()): number {
  const set = new Map(rows.map(r => [r.entry_date, r.sales]));
  let n = 0;
  const cur = new Date(d);
  if ((set.get(iso(cur)) || 0) < g.daily_sales) cur.setDate(cur.getDate() - 1);
  for (let i = 0; i < 366; i++) {
    const w = cur.getDay();
    if (w === 0 || w === 6) { cur.setDate(cur.getDate() - 1); continue; }
    if ((set.get(iso(cur)) || 0) >= g.daily_sales) { n++; cur.setDate(cur.getDate() - 1); } else break;
  }
  return n;
}

export function bestStreak(rows: Row[], g: Goals): number {
  const set = new Map(rows.map(r => [r.entry_date, r.sales]));
  const sorted = [...set.keys()].sort();
  let best = 0, cur = 0, prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(k + 'T12:00');
    const w = d.getDay();
    if (w === 0 || w === 6) continue;
    if ((set.get(k) || 0) < g.daily_sales) { cur = 0; prev = d; continue; }
    if (prev) {
      // räkna bara om det är nästföljande arbetsdag
      let skip = 1;
      const p = new Date(prev); p.setDate(p.getDate() + 1);
      while (p < d && (p.getDay() === 0 || p.getDay() === 6)) { p.setDate(p.getDate() + 1); skip++; }
      if (iso(p) !== k) cur = 0;
    }
    cur++;
    if (cur > best) best = cur;
    prev = d;
  }
  return best;
}

export function pbDay(rows: Row[]): Row | null {
  let best: Row | null = null;
  for (const r of rows) if (!best || r.sales > best.sales) best = r;
  return best;
}

export function pbTB(rows: Row[]): Row | null {
  let best: Row | null = null;
  for (const r of rows) if (!best || r.tb_sek > best.tb_sek) best = r;
  return best;
}

export function compareMonths(rows: Row[]) {
  const m = groupByMonth(rows);
  if (m.length < 2) return null;
  const cur = m[m.length - 1];
  const prev = m[m.length - 2];
  return {
    cur, prev,
    salesDiff: cur.sales - prev.sales,
    tbDiff: cur.tb - prev.tb,
    salesPct: prev.sales ? Math.round((cur.sales - prev.sales) / prev.sales * 100) : 0,
    tbPct: prev.tb ? Math.round((cur.tb - prev.tb) / prev.tb * 100) : 0,
  };
}

export function dateInputToday(): string { return today(); }
