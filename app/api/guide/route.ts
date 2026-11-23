import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const privateHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s, headers: privateHeaders });

export async function GET(req: Request) {
  if (!sessionFromRequest(req)) return err('Inte inloggad', 401);
  try {
    const { data, error } = await admin().from('guide_overrides').select('id,body,updated_by,updated_at');
    if (error) return NextResponse.json({ overrides: {}, note: error.message }, { headers: privateHeaders });
    const overrides: Record<string, { body: any; updated_by: string; updated_at: string }> = {};
    for (const row of data || []) overrides[row.id] = { body: row.body, updated_by: row.updated_by, updated_at: row.updated_at };
    return NextResponse.json({ overrides }, { headers: privateHeaders });
  } catch (e: any) {
    return NextResponse.json({ overrides: {}, note: e?.message || 'Databasfel' }, { headers: privateHeaders });
  }
}

export async function POST(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  if (session.role !== 'manager') return err('Bara chefer kan uppdatera spelguiden.', 403);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return err('Ogiltig förfrågan');
  }
  const id = String(b.id || '');
  if (!/^[a-z0-9-]{3,80}$/.test(id)) return err('Ogiltigt avsnitts-id.');
  const body = b.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return err('Ogiltigt innehåll.');
  const serialized = JSON.stringify(body);
  if (serialized.length > 30_000) return err('Innehållet är för stort.');
  try {
    const { error } = await admin()
      .from('guide_overrides')
      .upsert({ id, body, updated_by: session.username, updated_at: new Date().toISOString() });
    return error ? err('Kunde inte spara: ' + error.message, 500) : NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (e: any) {
    return err('Databasen är inte konfigurerad: ' + (e?.message || 'okänt fel'), 503);
  }
}

export async function DELETE(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  if (session.role !== 'manager') return err('Bara chefer kan uppdatera spelguiden.', 403);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return err('Ogiltig förfrågan');
  }
  const id = String(b.id || '');
  if (!/^[a-z0-9-]{3,80}$/.test(id)) return err('Ogiltigt avsnitts-id.');
  try {
    const { error } = await admin().from('guide_overrides').delete().eq('id', id);
    return error ? err('Kunde inte återställa: ' + error.message, 500) : NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (e: any) {
    return err('Databasen är inte konfigurerad: ' + (e?.message || 'okänt fel'), 503);
  }
}
