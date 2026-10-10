import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { classifySupabaseAdminKey, getSupabaseAdminConfig } from '@/lib/supabase-config';

// This is a live diagnostic, not a build-time snapshot. Never return key material.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStore = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  const config = getSupabaseAdminConfig();
  const env = {
    SELLER_PASSWORD: !!process.env.SELLER_PASSWORD?.trim(),
    MANAGER_PASSWORD: !!process.env.MANAGER_PASSWORD?.trim(),
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY?.trim(),
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY?.trim(),
    SESSION_SECRET: !!process.env.SESSION_SECRET?.trim(),
  };
  const adminKey = {
    source: config.keySource,
    type: classifySupabaseAdminKey(config.key),
  };

  let db = 'ej testad';
  let dbDetail: string | null = null;
  const dbProbes: Record<string, string> = {
    sales_entries: 'ej testad',
    goals: 'ej testad',
    activity_log: 'ej testad',
  };

  try {
    if (!config.url) {
      db = 'Saknar NEXT_PUBLIC_SUPABASE_URL';
    } else {
      const sb = admin();
      // HEAD + select=* exercises the same table SELECT permissions as the app,
      // without returning sales or activity data from this public health endpoint.
      const [sales, goals, activity] = await Promise.all([
        sb.from('sales_entries').select('*', { head: true }).order('entry_date'),
        sb.from('goals').select('*', { head: true }).eq('id', 1),
        sb.from('activity_log').select('*', { head: true }).order('created_at', { ascending: false }).limit(15),
      ]);
      const failures: string[] = [];
      for (const [name, result] of [
        ['sales_entries', sales],
        ['goals', goals],
        ['activity_log', activity],
      ] as const) {
        if (result.error) {
          dbProbes[name] = 'FEL';
          failures.push(`${name}: ${result.error.message}`);
        } else {
          dbProbes[name] = 'ok';
        }
      }
      db = failures.length ? 'FEL' : 'ok';
      dbDetail = failures.length ? failures.join('; ') : null;
    }
  } catch (e: any) {
    db = 'FEL';
    dbDetail = e?.message || String(e);
  }

  return NextResponse.json(
    { v: 'v7', env, adminKey, db, dbDetail, dbProbes },
    { headers: noStore },
  );
}
