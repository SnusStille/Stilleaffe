import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';
import { classifySupabaseAdminKey, getSupabaseAdminConfig } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStore = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

type Probe = { status: 'ok' | 'FEL' | 'saknas'; detail?: string };

async function probe(fn: () => Promise<any>): Promise<Probe> {
  try {
    const result = await fn();
    if (result?.error) return { status: 'FEL', detail: result.error.message };
    return { status: 'ok' };
  } catch (e: any) {
    return { status: 'FEL', detail: e?.message || String(e) };
  }
}

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  const isManager = session?.role === 'manager';

  // Public part: liveness + version only. No configuration details leak to anonymous callers.
  const config = getSupabaseAdminConfig();
  let dbStatus: 'ok' | 'FEL' | 'saknas' = 'saknas';
  if (config.url) {
    const p = await probe(() => admin().from('app_users').select('username', { head: true }));
    dbStatus = p.status === 'ok' ? 'ok' : 'FEL';
  }
  const base = { ok: dbStatus === 'ok', v: 'label-lab-1.0', db: dbStatus, now: new Date().toISOString() };
  if (!isManager) return NextResponse.json(base, { headers: noStore });

  // Manager-only diagnostics
  const env = {
    STILLE_PASSWORD: !!process.env.STILLE_PASSWORD?.trim() || !!process.env.SELLER_PASSWORD?.trim(),
    AFFE_PASSWORD: !!process.env.AFFE_PASSWORD?.trim() || !!process.env.MANAGER_PASSWORD?.trim(),
    FREDLAND_PASSWORD: !!process.env.FREDLAND_PASSWORD?.trim(),
    KVIST_PASSWORD: !!process.env.KVIST_PASSWORD?.trim(),
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY?.trim(),
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY?.trim(),
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || '(standard claude-sonnet-5-5)',
    SESSION_SECRET: !!process.env.SESSION_SECRET?.trim() && (process.env.SESSION_SECRET || '').trim().length >= 32,
  };
  const adminKey = { source: config.keySource, type: classifySupabaseAdminKey(config.key) };

  let db: Probe = { status: 'saknas', detail: 'NEXT_PUBLIC_SUPABASE_URL saknas' };
  const tables: Record<string, Probe> = {};
  let migration: Record<string, Probe> = {};

  if (config.url) {
    try {
      const sb = admin();
      const [sales, goals, userGoals, users, comments, activity, guide, audit, achievements] = await Promise.all([
        probe(() => sb.from('sales_entries').select('id,seller_username,entry_date,sales,brandkollen_sales,konsumentkollen_sales', { head: true })),
        probe(() => sb.from('goals').select('id', { head: true }).eq('id', 1)),
        probe(() => sb.from('user_goals').select('username', { head: true })),
        probe(() => sb.from('app_users').select('username', { head: true })),
        probe(() => sb.from('comments').select('id,author_username', { head: true })),
        probe(() => sb.from('activity_log').select('id,actor_username', { head: true })),
        probe(() => sb.from('guide_overrides').select('id', { head: true })),
        probe(() => sb.from('sales_audit').select('id,actor_username', { head: true })),
        probe(() => sb.from('achievements').select('username', { head: true })),
      ]);
      tables.sales_entries = sales;
      tables.goals = goals;
      tables.user_goals = userGoals;
      tables.app_users = users;
      tables.comments = comments;
      tables.activity_log = activity;
      tables.guide_overrides = guide;
      tables.sales_audit = audit;
      tables.achievements = achievements;

      const failed = Object.values(tables).filter((t) => t.status === 'FEL');
      db = failed.length ? { status: 'FEL', detail: failed.map((t) => t.detail).join('; ') } : { status: 'ok' };

      migration = {
        app_users: users,
        seller_username: sales,
        product_split: sales,
        user_goals: userGoals,
        comments_attribution: comments,
        activity_attribution: activity,
        guide_overrides: guide,
        sales_audit: audit,
        achievements,
      };
    } catch (e: any) {
      db = { status: 'FEL', detail: e?.message || String(e) };
    }
  }

  return NextResponse.json({ ...base, env, adminKey, db, tables, migration }, { headers: noStore });
}
