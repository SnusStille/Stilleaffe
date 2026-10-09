export type Row = { id: number; entry_date: string; sales: number; tb_sek: number; hours: number | null; note: string | null };
export type Goals = { daily_sales: number; daily_tb: number; monthly_sales: number; monthly_tb: number };
export const DEF: Goals = { daily_sales: 7, daily_tb: 3000, monthly_sales: 140, monthly_tb: 60000 };
export const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const today = () => iso(new Date());
export const mon = (d: string) => d.slice(0, 7);
export const fmt = (n: number) => Math.round(n).toLocaleString('sv-SE');
export const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('sv-SE');
export const sum = (a: any[], k: string) => a.reduce((s, r) => s + Number(r[k] || 0), 0);
export const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
export function wd(from: Date, to: Date) { let c = 0; for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w > 0 && w < 6) c++; } return c; }
export const workdaysLeft = () => { const n = new Date(); return Math.max(wd(n, new Date(n.getFullYear(), n.getMonth() + 1, 0)), 1); };
export const workdaysTotal = () => { const n = new Date(); return wd(new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)); };
export const workdaysDone = () => { const n = new Date(); return wd(new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1)); };
export function range(a: Row[], k: string) {
  const n = new Date(), t = today(), w = new Date(n); w.setDate(n.getDate() - ((n.getDay() + 6) % 7));
  const pm = mon(iso(new Date(n.getFullYear(), n.getMonth() - 1, 15)));
  return k === 'Idag' ? a.filter(r => r.entry_date === t) : k === 'Denna vecka' ? a.filter(r => r.entry_date >= iso(w))
    : k === 'Denna månad' ? a.filter(r => mon(r.entry_date) === mon(t)) : k === 'Föregående månad' ? a.filter(r => mon(r.entry_date) === pm) : a;
}
export function prevRange(a: Row[], k: string) {
  const n = new Date();
  if (k === 'Denna månad') return a.filter(r => mon(r.entry_date) === mon(iso(new Date(n.getFullYear(), n.getMonth() - 1, 15))));
  if (k === 'Denna vecka') { const w = new Date(n); w.setDate(n.getDate() - ((n.getDay() + 6) % 7) - 7); const e = new Date(w); e.setDate(w.getDate() + 7); return a.filter(r => r.entry_date >= iso(w) && r.entry_date < iso(e)); }
  return [];
}
