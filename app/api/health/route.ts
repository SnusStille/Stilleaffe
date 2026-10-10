import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
// Öppen diagnos – inga hemligheter, bara ja/nej + vad som saknas.
export async function GET() {
  const env = {
    SELLER_PASSWORD: !!process.env.SELLER_PASSWORD,
    MANAGER_PASSWORD: !!process.env.MANAGER_PASSWORD,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
  };
  let db = 'ej testad';
  let dbDetail: any = null;
  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    if (!url) { db = 'Saknar NEXT_PUBLIC_SUPABASE_URL'; }
    else {
      const sb = admin();
      const q = await sb.from('goals').select('id', { count: 'exact', head: true });
      if (q.error) { db = 'FEL'; dbDetail = q.error.message; }
      else db = 'ok';
    }
  } catch (e: any) { db = 'FEL'; dbDetail = e?.message || String(e); }
  return NextResponse.json({ v: 'v5', env, db, dbDetail });
}
