import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';
import { getGoalsFor, normalizeGoals } from '@/lib/users';

export const dynamic = 'force-dynamic';
const privateHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s, headers: privateHeaders });

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  return NextResponse.json({ goals: await getGoalsFor(session.username) }, { headers: privateHeaders });
}

export async function POST(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  if (session.role !== 'seller') return err('Bara säljaren kan ändra sina egna mål.', 403);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return err('Ogiltig förfrågan');
  }
  const goals = normalizeGoals(b);
  if (!Number.isInteger(goals.daily_sales) || goals.daily_sales < 0) return err('Ogiltigt dagsmål.');
  if (!Number.isInteger(goals.weekly_sales) || goals.weekly_sales < 0) return err('Ogiltigt veckomål.');
  if (!Number.isInteger(goals.monthly_sales) || goals.monthly_sales < 0) return err('Ogiltigt månadsmål.');
  if (goals.daily_tb < 0 || goals.weekly_tb < 0 || goals.monthly_tb < 0) return err('Ogiltigt TB-mål.');

  const { error } = await admin()
    .from('user_goals')
    .upsert({ username: session.username, ...goals, updated_at: new Date().toISOString() });
  if (error) return err('Kunde inte spara mål: ' + error.message, 500);
  return NextResponse.json({ ok: true, goals }, { headers: privateHeaders });
}
