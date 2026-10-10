import { createClient } from '@/lib/supabase-shim';
import { invalidatePasswordCache } from '@/lib/auth';

const base = (u?: string) => {
  try { return new URL((u || '').trim()).origin; } catch { return (u || '').trim(); }
};

export const admin = () => {
  const url = base(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function keyStatus(): Promise<{ configured: boolean; source: 'env' | 'db' | null }> {
  if ((process.env.ANTHROPIC_API_KEY || '').trim()) return { configured: true, source: 'env' };
  try {
    const { data } = await admin().from('app_settings').select('value').eq('key', 'anthropic_api_key').maybeSingle();
    return data?.value ? { configured: true, source: 'db' } : { configured: false, source: null };
  } catch { return { configured: false, source: null }; }
}

export async function getKey(): Promise<string | null> {
  const env = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (env) return env;
  try {
    const { data } = await admin().from('app_settings').select('value').eq('key', 'anthropic_api_key').maybeSingle();
    return (data?.value || '').trim() || null;
  } catch { return null; }
}

export const setKey = (v: string) => admin().from('app_settings').upsert({ key: 'anthropic_api_key', value: v });
export const delKey = async () => { invalidatePasswordCache(); await admin().from('app_settings').delete().eq('key', 'anthropic_api_key'); };
