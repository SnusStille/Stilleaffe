import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function GET(req: Request) {
  const role = req.headers.get('x-role') || '', sb = admin();
  const [c, s] = await Promise.all([sb.from('comments').select('*').order('id', { ascending: false }).limit(100), sb.from('app_settings').select('value').eq('key', 'seen_' + role).maybeSingle()]);
  if (c.error) return err('Databasfel: ' + c.error.message, 500);
  const seen = Number(s.data?.value || 0);
  return NextResponse.json({ items: c.data, unread: (c.data || []).filter((x: any) => x.author !== role && x.id > seen).length });
}
export async function POST(req: Request) {
  const role = req.headers.get('x-role') || '', sb = admin();
  let b: any; try { b = await req.json(); } catch { return err('Ogiltig förfrågan'); }
  if (b.action === 'seen') {
    const { data } = await sb.from('comments').select('id').order('id', { ascending: false }).limit(1);
    await sb.from('app_settings').upsert({ key: 'seen_' + role, value: String(data?.[0]?.id || 0) });
    return NextResponse.json({ ok: true });
  }
  const body = String(b.body || '').trim().slice(0, 1000);
  if (!body) return err('Skriv något först.');
  const d = typeof b.entry_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.entry_date) ? b.entry_date : null;
  const { error } = await sb.from('comments').insert({ author: role, body, entry_date: d });
  return error ? err(error.message, 500) : NextResponse.json({ ok: true });
}
