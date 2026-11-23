import { createClient } from '@supabase/supabase-js';
import type { AuthUser, Goals, Role } from './types';
import { DEFAULT_GOALS } from './calc';

export const FALLBACK_USERS: AuthUser[] = [
  { username: 'stille', display_name: 'Stille', role: 'seller' },
  { username: 'affe', display_name: 'Affe', role: 'manager' },
  { username: 'fredland', display_name: 'Fredland', role: 'manager' },
  { username: 'kvist', display_name: 'Kvist', role: 'seller' },
];

let userCache: { at: number; users: AuthUser[] } | null = null;
const USER_TTL = 30_000;

function admin() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function normalizeRole(value: unknown): Role {
  return value === 'manager' ? 'manager' : 'seller';
}

export async function getUsers(): Promise<AuthUser[]> {
  const now = Date.now();
  if (userCache && now - userCache.at < USER_TTL) return userCache.users;
  const sb = admin();
  if (!sb) return FALLBACK_USERS;
  const { data, error } = await sb
    .from('app_users')
    .select('username,display_name,role')
    .eq('is_active', true)
    .order('username');
  if (error || !data?.length) return FALLBACK_USERS;
  const users = data.map((r: any) => ({
    username: String(r.username),
    display_name: String(r.display_name || r.username),
    role: normalizeRole(r.role),
  }));
  userCache = { at: now, users };
  return users;
}

export async function getUser(username: string): Promise<AuthUser | undefined> {
  const users = await getUsers();
  return users.find((u) => u.username === username);
}

export async function getGoalsFor(username: string): Promise<Goals> {
  const sb = admin();
  if (!sb) return DEFAULT_GOALS;
  const { data, error } = await sb.from('user_goals').select('*').eq('username', username).maybeSingle();
  if (!error && data) return normalizeGoals(data);
  // Compatibility fallback during migration.
  const legacy = await sb.from('goals').select('*').eq('id', 1).maybeSingle();
  if (!legacy.error && legacy.data) return normalizeGoals(legacy.data);
  return DEFAULT_GOALS;
}

export async function getAllGoals(): Promise<Record<string, Goals>> {
  const out: Record<string, Goals> = {};
  const sb = admin();
  if (!sb) return out;
  const { data, error } = await sb.from('user_goals').select('*');
  if (!error && data) for (const r of data) out[String(r.username)] = normalizeGoals(r);
  return out;
}

export function normalizeGoals(r: any): Goals {
  return {
    daily_sales: Number(r.daily_sales ?? DEFAULT_GOALS.daily_sales) || 0,
    daily_tb: Number(r.daily_tb ?? DEFAULT_GOALS.daily_tb) || 0,
    weekly_sales: Number(r.weekly_sales ?? DEFAULT_GOALS.weekly_sales) || 0,
    weekly_tb: Number(r.weekly_tb ?? DEFAULT_GOALS.weekly_tb) || 0,
    monthly_sales: Number(r.monthly_sales ?? DEFAULT_GOALS.monthly_sales) || 0,
    monthly_tb: Number(r.monthly_tb ?? DEFAULT_GOALS.monthly_tb) || 0,
  };
}

export const isSeller = (role: Role) => role === 'seller';
export const isManager = (role: Role) => role === 'manager';
