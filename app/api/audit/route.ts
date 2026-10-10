import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';

export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate', Pragma: 'no-cache' };

// Läsbar för båda rollerna. Skrivs bara av servern när Stille ändrar/tar bort siffror.
export async function GET(req: Request) {
  const role = req.headers.get('x-role') || '';
  if (role !== 'seller' && role !== 'manager') return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 });
  try {
    const { data, error } = await admin().from('sales_audit').select('*').order('id', { ascending: false }).limit(100);
    if (error) return NextResponse.json({ items: [], missing: true, error: error.message }, { headers: privateHeaders });
    return NextResponse.json({ items: data || [] }, { headers: privateHeaders });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || 'Databasfel' }, { headers: privateHeaders });
  }
}
