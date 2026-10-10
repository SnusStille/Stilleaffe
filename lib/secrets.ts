import { createClient } from '@/lib/supabase-shim';
import { invalidatePasswordCache } from '@/lib/auth';
import { getSupabaseAdminConfig, validateSupabaseAdminKey } from '@/lib/supabase-config';

export const admin = () => {
  const { url, key } = getSupabaseAdminConfig();
  const keyProblem = validateSupabaseAdminKey(key);
  if (keyProblem) throw new Error(keyProblem);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
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

// Alla tillgängliga nycklar i prioritetsordning (miljövariabel först, sedan sparad i databasen).
// Om den första är avstängd/ogiltig provar AI-rutten nästa i stället för att ge upp.
export async function getKeys(): Promise<string[]> {
  const out: string[] = [];
  const env = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (env) out.push(env);
  try {
    const { data } = await admin().from('app_settings').select('value').eq('key', 'anthropic_api_key').maybeSingle();
    const db = (data?.value || '').trim();
    if (db && !out.includes(db)) out.push(db);
  } catch {}
  return out;
}
