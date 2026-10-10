import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const validDate = (d: unknown): d is string => { if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false; const t = Date.parse(d + 'T00:00:00Z'); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d; };

export async function GET(req: Request) {
  const role = req.headers.get('x-role') || '';
  if (role !== 'seller' && role !== 'manager') return err('Inte inloggad', 401);
  let sb;
  try { sb = admin(); } catch (e: any) { return NextResponse.json({ error: 'Databas: ' + (e?.message || 'kunde inte ansluta'), role }, { status: 500 }); }
  try {
    const [r, g, act] = await Promise.all([
      sb.from('sales_entries').select('*').order('entry_date'),
      sb.from('goals').select('*').eq('id', 1).maybeSingle(),
      sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(15),
    ]);
    if (r.error) return NextResponse.json({ error: 'Databasfel: ' + r.error.message, role }, { status: 500 });
    if (g.error) return NextResponse.json({ error: 'Databasfel (goals): ' + g.error.message, role }, { status: 500 });
    return NextResponse.json({
      rows: r.data || [],
      goals: g.data || null,
      role,
      activity: act.data || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Databasfel: ' + (e?.message || String(e)), role }, { status: 500 });
  }
}

async function audit(sb: any, entry_date: string, action: 'create' | 'update' | 'delete', before: any, after: any) {
  try {
    const pick = (r: any) => r ? { sales: r.sales, tb_sek: r.tb_sek, hours: r.hours ?? null, note: r.note ?? null, mood: r.mood ?? null, rating: r.rating ?? null, tags: r.tags ?? [] } : null;
    await sb.from('sales_audit').insert({ entry_date, action, author: 'seller', before: pick(before), after: pick(after) });
  } catch {}
}

async function logEvent(sb: any, author: string, event: string, payload: any = {}) {
  try { await sb.from('activity_log').insert({ author, event, payload }); } catch {}
}

export async function POST(req: Request) {
  if (req.headers.get('x-role') !== 'seller') return err('Bara säljaren kan ändra siffror och mål.', 403);
  let b: any; try { b = await req.json(); } catch { return err('Ogiltig förfrågan'); }
  const sb = admin();
  if (b.action === 'upsert') {
    const sales = Number(b.sales), tb = Number(b.tb_sek);
    const hours = b.hours === undefined ? undefined : b.hours == null || b.hours === '' ? null : Number(b.hours);
    const note = b.note === undefined ? undefined : b.note ? String(b.note).trim().slice(0, 500) : null;
    const mood = b.mood === undefined ? undefined : ['fire','great','ok','tired','bad'].includes(b.mood) ? b.mood : null;
    const rating = b.rating === undefined ? undefined : Number.isInteger(Number(b.rating)) && Number(b.rating) >= 1 && Number(b.rating) <= 5 ? Number(b.rating) : null;
    const tags = b.tags === undefined ? undefined : Array.isArray(b.tags) ? b.tags.filter((x: any) => typeof x === 'string').slice(0, 8).map((x: string) => x.slice(0, 30)) : [];
    if (!validDate(b.entry_date) || !Number.isInteger(sales) || sales < 0 || !(tb >= 0) || (hours != null && !(hours >= 0 && hours <= 24))) return err('Ogiltiga värden');
    const existed = await sb.from('sales_entries').select('*').eq('entry_date', b.entry_date).maybeSingle();
    const values = {
      entry_date: b.entry_date, sales, tb_sek: tb,
      hours: hours === undefined ? existed.data?.hours ?? null : hours,
      note: note === undefined ? existed.data?.note ?? null : note,
      mood: mood === undefined ? existed.data?.mood ?? null : mood,
      rating: rating === undefined ? existed.data?.rating ?? null : rating,
      tags: tags === undefined ? existed.data?.tags ?? [] : tags,
    };
    const { error } = await sb.from('sales_entries').upsert(values, { onConflict: 'entry_date' });
    if (error) return err(error.message, 500);
    const changed = !existed.data || ['sales', 'tb_sek', 'hours', 'note', 'mood', 'rating'].some(k => String((existed.data as any)[k] ?? '') !== String((values as any)[k] ?? ''));
    if (changed) await audit(sb, b.entry_date, existed.data ? 'update' : 'create', existed.data, values);
    if (b.replace_id) await sb.from('sales_entries').delete().eq('id', Number(b.replace_id)).neq('entry_date', b.entry_date);
    // events
    const prevSales = existed.data?.sales || 0;
    if (!existed.data && sales >= 1) await logEvent(sb, 'seller', 'entry_new', { entry_date: b.entry_date, sales, tb });
    else if (existed.data && prevSales < sales) await logEvent(sb, 'seller', 'entry_updated', { entry_date: b.entry_date, sales, delta: sales - prevSales });
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'delete') {
    if (!Number.isInteger(Number(b.id))) return err('Ogiltigt id');
    const old = await sb.from('sales_entries').select('*').eq('id', Number(b.id)).maybeSingle();
    await sb.from('sales_entries').delete().eq('id', Number(b.id));
    if (old.data) await audit(sb, old.data.entry_date, 'delete', old.data, null);
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'goals') {
    const v = ['daily_sales','daily_tb','weekly_sales','weekly_tb','monthly_sales','monthly_tb'].map(k => Math.max(0, Number(b[k]) || 0));
    const [daily_sales, daily_tb, weekly_sales, weekly_tb, monthly_sales, monthly_tb] = v;
    const { error } = await sb.from('goals').upsert({ id: 1, daily_sales: Math.round(daily_sales), daily_tb, weekly_sales: Math.round(weekly_sales), weekly_tb, monthly_sales: Math.round(monthly_sales), monthly_tb });
    if (error) return err(error.message, 500);
    await logEvent(sb, 'seller', 'goals_updated', { daily_sales, monthly_sales });
    return NextResponse.json({ ok: true });
  }
  return err('Okänd åtgärd');
}
