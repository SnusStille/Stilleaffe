import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';
import { getUsers } from '@/lib/users';
import type { CommentItem } from '@/lib/types';

const privateHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s, headers: privateHeaders });
const REACTIONS = ['👍', '❤️', '🔥', '🎉', '😂', '😎', '💪'];
const validDate = (d: unknown): d is string => {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = Date.parse(d + 'T00:00:00Z');
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d;
};

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  let sb: ReturnType<typeof admin>;
  try {
    sb = admin();
  } catch (e: any) {
    return err('Databasen är inte konfigurerad: ' + (e?.message || 'okänt fel'), 503);
  }
  const [comments, seen, users] = await Promise.all([
    sb.from('comments').select('*').order('id', { ascending: false }).limit(200),
    sb.from('app_settings').select('value').eq('key', 'seen_' + session.username).maybeSingle(),
    getUsers(),
  ]);
  if (comments.error) return err('Databasfel: ' + comments.error.message, 500);
  const byName = new Map(users.map((u) => [u.username, u]));
  const items: CommentItem[] = (comments.data || []).map((c: any) => {
    const author = byName.get(c.author_username) || byName.get(c.author === 'manager' ? 'affe' : 'stille');
    return {
      id: Number(c.id),
      author_username: c.author_username || (c.author === 'manager' ? 'affe' : 'stille'),
      author_name: author?.display_name || (c.author === 'manager' ? 'Affe' : 'Stille'),
      author_role: author?.role || (c.author === 'manager' ? 'manager' : 'seller'),
      body: String(c.body || ''),
      entry_date: c.entry_date || null,
      reaction: c.reaction || null,
      pinned: !!c.pinned,
      created_at: c.created_at,
    };
  });
  const seenId = Number(seen.data?.value || 0);
  return NextResponse.json(
    {
      items,
      unread: items.filter((x) => x.author_username !== session.username && x.id > seenId).length,
      reactions: REACTIONS,
    },
    { headers: privateHeaders },
  );
}

export async function POST(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return err('Ogiltig förfrågan');
  }
  // Validate the payload before any storage access.
  const creating = !['seen', 'react', 'pin'].includes(String(b.action || ''));
  if (creating) {
    const body = String(b.body || '').trim().slice(0, 2000);
    if (!body) return err('Skriv något först.');
    if (b.entry_date && !validDate(b.entry_date)) return err('Ogiltigt datum.');
  } else if (b.action === 'react') {
    const id = Number(b.id);
    const reaction = String(b.reaction || '');
    if (!Number.isSafeInteger(id) || id < 1) return err('Ogiltigt kommentar-id');
    if (reaction && !REACTIONS.includes(reaction)) return err('Ogiltig reaktion');
  } else if (b.action === 'pin') {
    const id = Number(b.id);
    if (!Number.isSafeInteger(id) || id < 1 || typeof b.pinned !== 'boolean') return err('Ogiltig pin-förfrågan');
  }
  let sb: ReturnType<typeof admin>;
  try {
    sb = admin();
  } catch (e: any) {
    return err('Databasen är inte konfigurerad: ' + (e?.message || 'okänt fel'), 503);
  }

  if (b.action === 'seen') {
    const { data, error } = await sb.from('comments').select('id').order('id', { ascending: false }).limit(1);
    if (error) return err('Databasfel: ' + error.message, 500);
    const { error: settingError } = await sb
      .from('app_settings')
      .upsert({ key: 'seen_' + session.username, value: String(data?.[0]?.id || 0) });
    return settingError ? err('Databasfel: ' + settingError.message, 500) : NextResponse.json({ ok: true });
  }

  if (b.action === 'react') {
    const id = Number(b.id);
    const reaction = String(b.reaction || '');
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
  const { error, data } = await sb
    .from('comments')
    .insert({ author: session.role, author_username: session.username, body, entry_date: b.entry_date || null })
    .select()
    .single();
  return error ? err(error.message, 500) : NextResponse.json({ ok: true, item: data });
}
