import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
// Öppen diagnos: visar bara ja/nej, aldrig värden.
export async function GET() {
  const env = { SELLER_PASSWORD: !!process.env.SELLER_PASSWORD, MANAGER_PASSWORD: !!process.env.MANAGER_PASSWORD, NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY };
  let db = 'ej testad';
  try { const { error } = await admin().from('goals').select('id').limit(1); db = error ? 'FEL: ' + error.message : 'ok'; } catch (e: any) { db = 'FEL: ' + (e?.message || 'okänt'); }
  return NextResponse.json({ env, db });
}
