import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';
import { ACHIEVEMENTS, DEFAULT_GOALS } from '@/lib/calc';
import { getGoalsFor } from '@/lib/users';
import type { Entry, Goals } from '@/lib/types';

const privateHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s, headers: privateHeaders });
const VALID = new Set(ACHIEVEMENTS.map((a) => a.key));

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  const { data, error } = await admin()
    .from('achievements')
    .select('key,unlocked_at')
    .eq('username', session.username)
    .order('unlocked_at', { ascending: true });
  if (error) return err('Databasfel: ' + error.message, 500);
  return NextResponse.json({ items: data || [] }, { headers: privateHeaders });
}

export async function POST(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  if (session.role !== 'seller') return err('Endast säljare kan låsa upp märken.', 403);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return err('Ogiltig');
  }
  const key = String(b.key || '');
  if (!VALID.has(key)) return err('Okänt märke');

  const sb = admin();
  const [rows, goals] = await Promise.all([
    sb.from('sales_entries')
      .select('id,seller_username,entry_date,sales,tb_sek,hours,note,rating,mood,tags,brandkollen_sales,konsumentkollen_sales,brandkollen_tb,konsumentkollen_tb')
      .eq('seller_username', session.username)
      .order('entry_date'),
    getGoalsFor(session.username),
  ]);
  if (rows.error) return err('Databasfel: ' + rows.error.message, 500);
  const entries: Entry[] = (rows.data || []).map((x: any) => ({
    id: Number(x.id),
    seller_username: session.username,
    entry_date: String(x.entry_date),
    sales: Number(x.sales || 0),
    tb_sek: Number(x.tb_sek || 0),
    hours: x.hours == null ? null : Number(x.hours),
    note: x.note ?? null,
    rating: x.rating == null ? null : Number(x.rating),
    mood: x.mood || null,
    tags: Array.isArray(x.tags) ? x.tags : [],
    brandkollen_sales: x.brandkollen_sales == null ? null : Number(x.brandkollen_sales),
    konsumentkollen_sales: x.konsumentkollen_sales == null ? null : Number(x.konsumentkollen_sales),
    brandkollen_tb: x.brandkollen_tb == null ? null : Number(x.brandkollen_tb),
    konsumentkollen_tb: x.konsumentkollen_tb == null ? null : Number(x.konsumentkollen_tb),
  }));
  const def = ACHIEVEMENTS.find((a) => a.key === key)!;
  if (!def.cond(entries, goals as Goals)) return err('Milstolpen är inte uppnådd ännu.', 409);

  const { data, error } = await sb
    .from('achievements')
    .upsert({ username: session.username, key }, { onConflict: 'username,key', ignoreDuplicates: true })
    .select('key')
    .maybeSingle();
  if (error) return err('Databasfel: ' + error.message, 500);
  return NextResponse.json({ ok: true, newly: data != null }, { headers: privateHeaders });
}

