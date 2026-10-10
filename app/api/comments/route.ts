import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const REACTIONS = ['👍','❤️','🔥','🎉','😂','😎','💪'];
const validDate = (d: unknown): d is string => { if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false; const t = Date.parse(d + 'T00:00:00Z'); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d; };

function roleFor(req: Request) {
  const role = req.headers.get('x-role') || '';
  return role === 'seller' || role === 'manager' ? role : '';
}

export async function GET(req: Request) {
  const role = roleFor(req);
  if (!role) return err('Inte inloggad', 401);
  const sb = admin();
  const [c, s] = await Promise.all([
    sb.from('comments').select('*').order('id', { ascending: false }).limit(200),
    sb.from('app_settings').select('value').eq('key', 'seen_' + role).maybeSingle(),
  ]);
  if (c.error) return err('Databasfel: ' + c.error.message, 500);
  if (s.error) return err('Databasfel: ' + s.error.message, 500);
  const seen = Number(s.data?.value || 0);
  return NextResponse.json({
    items: c.data || [],
    unread: (c.data || []).filter((x: any) => x.author !== role && x.id > seen).length,
    reactions: REACTIONS,
  });
}

export async function POST(req: Request) {
  const role = roleFor(req);
  if (!role) return err('Inte inloggad', 401);
  const sb = admin();
  let b: any;
  try { b = await req.json(); } catch { return err('Ogiltig förfrågan'); }

  if (b.action === 'seen') {
    const { data, error } = await sb.from('comments').select('id').order('id', { ascending: false }).limit(1);
    if (error) return err('Databasfel: ' + error.message, 500);
    const { error: settingError } = await sb.from('app_settings').upsert({ key: 'seen_' + role, value: String(data?.[0]?.id || 0) });
    return settingError ? err('Databasfel: ' + settingError.message, 500) : NextResponse.json({ ok: true });
  }

  if (b.action === 'react') {
    const id = Number(b.id), reaction = String(b.reaction || '');
    if (!Number.isSafeInteger(id) || id < 1) return err('Ogiltigt kommentar-id');
    if (reaction && !REACTIONS.includes(reaction)) return err('Ogiltig reaktion');
    const { data: existing, error: readError } = await sb.from('comments').select('reaction').eq('id', id).maybeSingle();
    if (readError) return err('Databasfel: ' + readError.message, 500);
    if (!existing) return err('Hittar inte kommentaren', 404);
    const next = existing.reaction === reaction ? null : reaction || null;
    const { error } = await sb.from('comments').update({ reaction: next }).eq('id', id);
    return error ? err('Kunde inte spara reaktion: ' + error.message, 500) : NextResponse.json({ ok: true, reaction: next });
  }

  if (b.action === 'pin') {
    const id = Number(b.id);
    if (!Number.isSafeInteger(id) || id < 1 || typeof b.pinned !== 'boolean') return err('Ogiltig pin-förfrågan');
    const { error } = await sb.from('comments').update({ pinned: b.pinned }).eq('id', id);
    return error ? err('Kunde inte uppdatera pin: ' + error.message, 500) : NextResponse.json({ ok: true, pinned: b.pinned });
  }

  const body = String(b.body || '').trim().slice(0, 2000);
  if (!body) return err('Skriv något först.');
  if (b.entry_date && !validDate(b.entry_date)) return err('Ogiltigt datum.');
  const d = b.entry_date ? b.entry_date as string : null;
  const { error, data } = await sb.from('comments').insert({ author: role, body, entry_date: d }).select().single();
  return error ? err(error.message, 500) : NextResponse.json({ ok: true, item: data });
}
