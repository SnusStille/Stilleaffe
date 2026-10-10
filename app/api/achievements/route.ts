import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { ACHIEVEMENTS, DEF, Goals, Row } from '@/lib/calc';
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const VALID = new Set(ACHIEVEMENTS.map(a => a.key));
function roleFor(req: Request) { const r = req.headers.get('x-role') || ''; return r === 'seller' || r === 'manager' ? r : ''; }

export async function GET(req: Request) {
  if (!roleFor(req)) return err('Inte inloggad', 401);
  const { data, error } = await admin().from('achievements').select('key, unlocked_at').order('unlocked_at', { ascending: true });
  if (error) return err('Databasfel: ' + error.message, 500);
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: Request) {
  const role = roleFor(req);
  if (!role) return err('Inte inloggad', 401);
  if (role !== 'seller') return err('Endast Stille kan uppnå märken', 403);
  let b: any; try { b = await req.json(); } catch { return err('Ogiltig'); }
  const key = String(b.key || '');
  if (!VALID.has(key)) return err('Okänt märke');
  const sb = admin();
  const [r, g] = await Promise.all([
    sb.from('sales_entries').select('id,entry_date,sales,tb_sek,hours,note,rating,mood,tags').order('entry_date'),
    sb.from('goals').select('*').eq('id', 1).maybeSingle(),
  ]);
  if (r.error) return err('Databasfel: ' + r.error.message, 500);
  if (g.error) return err('Databasfel: ' + g.error.message, 500);
  const rows = (r.data || []).map((x: any) => ({ ...x, sales: Number(x.sales), tb_sek: Number(x.tb_sek) })) as Row[];
  const goals: Goals = g.data ? {
    daily_sales: Number(g.data.daily_sales), daily_tb: Number(g.data.daily_tb),
    weekly_sales: Number(g.data.weekly_sales), weekly_tb: Number(g.data.weekly_tb),
    monthly_sales: Number(g.data.monthly_sales), monthly_tb: Number(g.data.monthly_tb),
  } : DEF;
  const definition = ACHIEVEMENTS.find(a => a.key === key)!;
  if (!definition.cond(rows, goals, new Set())) return err('Milstolpen är inte uppnådd ännu.', 409);
  const { data, error } = await sb.from('achievements').upsert({ key }, { onConflict: 'key', ignoreDuplicates: true }).select('key').maybeSingle();
  if (error) return err('Databasfel: ' + error.message, 500);
  return NextResponse.json({ ok: true, newly: data != null });
}
