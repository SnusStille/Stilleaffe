import { NextResponse } from 'next/server';
import { admin, keyStatus } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';
import { getUsers } from '@/lib/users';

export const dynamic = 'force-dynamic';

const privateHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Inte inloggad' }, { status: 401, headers: privateHeaders });
  const settings: Record<string, string> = {};
  try {
    const { data } = await admin().from('app_settings').select('key,value');
    for (const r of data || []) {
      // Only expose non-sensitive, user-facing flags (e.g. seen markers).
      if (!/^seen_[a-z0-9_-]{1,40}$/.test(r.key)) continue;
      settings[r.key] = r.value;
    }
  } catch {}
  const users = session.role === 'manager' ? await getUsers() : undefined;
  const ai = await keyStatus().catch(() => ({ configured: false, source: null }));
  return NextResponse.json(
    { ok: true, serverNow: new Date().toISOString(), me: session, settings, users, ai: { configured: ai.configured, source: ai.source } },
    { headers: privateHeaders },
  );
}
