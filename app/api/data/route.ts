import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';
import { getAllGoals, getUsers, normalizeGoals } from '@/lib/users';
import type { DataPayload, Entry, PublicEntry, TeamMember } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const privateHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};

const fail = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status, headers: privateHeaders });

function toEntry(row: any): Entry {
  return {
    id: Number(row.id),
    seller_username: String(row.seller_username || 'stille'),
    entry_date: String(row.entry_date),
    sales: Number(row.sales || 0),
    tb_sek: Number(row.tb_sek || 0),
    hours: row.hours == null ? null : Number(row.hours),
    note: row.note ?? null,
    rating: row.rating == null ? null : Number(row.rating),
    mood: row.mood || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    brandkollen_sales: row.brandkollen_sales == null ? null : Number(row.brandkollen_sales),
    konsumentkollen_sales: row.konsumentkollen_sales == null ? null : Number(row.konsumentkollen_sales),
    brandkollen_tb: row.brandkollen_tb == null ? null : Number(row.brandkollen_tb),
    konsumentkollen_tb: row.konsumentkollen_tb == null ? null : Number(row.konsumentkollen_tb),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function publicEntry(e: Entry): PublicEntry {
  return {
    id: e.id,
    seller_username: e.seller_username,
    entry_date: e.entry_date,
    sales: e.sales,
    tb_sek: e.tb_sek,
    hours: e.hours,
    brandkollen_sales: e.brandkollen_sales,
    konsumentkollen_sales: e.konsumentkollen_sales,
    brandkollen_tb: e.brandkollen_tb,
    konsumentkollen_tb: e.konsumentkollen_tb,
  };
}

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return fail('Inte inloggad', 401);

  let sb: ReturnType<typeof admin>;
  try {
    sb = admin();
  } catch (e: any) {
    return fail('Databasen är inte konfigurerad: ' + (e?.message || 'okänt fel'), 503);
  }

  try {
    const [users, goalsMap, sales, activity] = await Promise.all([
      getUsers(),
      getAllGoals(),
      sb.from('sales_entries').select('*').order('entry_date', { ascending: true }),
      sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(30),
    ]);

    if (sales.error) {
      const hint = /seller_username|column/i.test(sales.error.message)
        ? ' Migreringen (supabase/migrations) verkar inte vara körd ännu.'
        : '';
      return fail('Databasfel: ' + sales.error.message + hint, 500);
    }

    const allEntries: Entry[] = (sales.data || []).map(toEntry);
    const me = users.find((u) => u.username === session.username);
    if (!me) return fail('Ditt konto är inaktiverat eller saknas.', 403);

    const team: TeamMember[] = users.map((u) => {
      const own = allEntries.filter((e) => e.seller_username === u.username);
      return {
        username: u.username,
        display_name: u.display_name,
        role: u.role,
        goals: goalsMap[u.username] || normalizeGoals({}),
        entries: own.map(publicEntry),
      };
    });

    const payload: DataPayload = {
      me: { username: me.username, display_name: me.display_name, role: me.role },
      team,
      myEntries: allEntries.filter((e) => e.seller_username === me.username),
      activity: (activity.data || []).map((a: any) => ({
        id: Number(a.id),
        actor_username: a.actor_username || null,
        actor_name:
          users.find((u) => u.username === a.actor_username)?.display_name ||
          (a.actor_username ? String(a.actor_username) : 'System'),
        event: String(a.event || ''),
        payload: (a.payload as Record<string, unknown>) || {},
        created_at: a.created_at,
      })),
      now: new Date().toISOString(),
    };

    return NextResponse.json(payload, { headers: privateHeaders });
  } catch (e: any) {
    return fail('Databasfel: ' + (e?.message || String(e)), 500);
  }
}
