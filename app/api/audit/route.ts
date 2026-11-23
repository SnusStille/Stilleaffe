import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';
import { getUsers } from '@/lib/users';

export const dynamic = 'force-dynamic';
const privateHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s, headers: privateHeaders });

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  try {
    const [query, users] = await Promise.all([
      (async () => {
        let q = admin().from('sales_audit').select('*');
        if (session.role === 'seller') q = q.eq('seller_username', session.username);
        return q.order('id', { ascending: false }).limit(150);
      })(),
      getUsers(),
    ]);
    if (query.error) return NextResponse.json({ items: [], missing: true, error: query.error.message }, { headers: privateHeaders });
    const byName = new Map(users.map((u) => [u.username, u.display_name]));
    const items = (query.data || []).map((a: any) => ({
      ...a,
      actor_name: a.actor_username ? byName.get(a.actor_username) || a.actor_username : a.author || 'System',
      seller_name: a.seller_username ? byName.get(a.seller_username) || a.seller_username : null,
    }));
    return NextResponse.json({ items }, { headers: privateHeaders });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || 'Databasfel' }, { headers: privateHeaders });
  }
}
