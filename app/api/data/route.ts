import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function GET(req: Request) {
  const role = req.headers.get('x-role') || '';
  if (role !== 'seller' && role !== 'manager') return err('Inte inloggad', 401);
  let sb;
  try { sb = admin(); } catch (e: any) { return err('Databas: ' + (e?.message || 'kunde inte ansluta'), 500); }
  const [r, g] = await Promise.all([
    sb.from('sales_entries').select('*').order('entry_date'),
    sb.from('goals').select('*').eq('id', 1).maybeSingle(),
  ]);
  if (r.error) return err('Databasfel: ' + r.error.message, 500);
  if (g.error) return err('Databasfel (goals): ' + g.error.message, 500);
  return NextResponse.json({ rows: r.data || [], goals: g.data || null, role });
}

export async function POST(req: Request) {
  if (req.headers.get('x-role') !== 'seller') return err('Bara säljaren kan ändra siffror och mål.', 403);
  let b: any; try { b = await req.json(); } catch { return err('Ogiltig förfrågan'); }
  const sb = admin();
  if (b.action === 'upsert') {
    const sales = Number(b.sales), tb = Number(b.tb_sek), hours = b.hours == null || b.hours === '' ? null : Number(b.hours);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.entry_date) || !Number.isInteger(sales) || sales < 0 || !(tb >= 0) || (hours !== null && !(hours >= 0 && hours <= 24))) return err('Ogiltiga värden');
    const { error } = await sb.from('sales_entries').upsert({ entry_date: b.entry_date, sales, tb_sek: tb, hours, note: b.note ? String(b.note).slice(0, 500) : null }, { onConflict: 'entry_date' });
    if (error) return err(error.message, 500);
    if (b.replace_id) await sb.from('sales_entries').delete().eq('id', Number(b.replace_id)).neq('entry_date', b.entry_date);
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'delete') {
    if (!Number.isInteger(Number(b.id))) return err('Ogiltigt id');
    await sb.from('sales_entries').delete().eq('id', Number(b.id));
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'goals') {
    const v = ['daily_sales', 'daily_tb', 'monthly_sales', 'monthly_tb'].map(k => Math.max(0, Number(b[k]) || 0));
    const { error } = await sb.from('goals').upsert({ id: 1, daily_sales: Math.round(v[0]), daily_tb: v[1], monthly_sales: Math.round(v[2]), monthly_tb: v[3] });
    return error ? err(error.message, 500) : NextResponse.json({ ok: true });
  }
  return err('Okänd åtgärd');
}
