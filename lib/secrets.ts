import { createClient } from '@/lib/supabase-shim';
import { getSupabaseAdminConfig, validateSupabaseAdminKey } from '@/lib/supabase-config';

/**
 * Server-only Supabase admin client (service-role key). Every caller must still
 * enforce application-level authorization — the service key bypasses RLS.
 */
export const admin = () => {
  const { url, key } = getSupabaseAdminConfig();
  const keyProblem = validateSupabaseAdminKey(key);
  if (keyProblem) throw new Error(keyProblem);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};

/**
 * The Anthropic key lives in Vercel Secrets (ANTHROPIC_API_KEY). A legacy key
 * stored in app_settings is still read so existing installations keep working,
 * but it can no longer be written from the UI.
 */
export async function keyStatus(): Promise<{ configured: boolean; source: 'env' | 'db' | null }> {
  if ((process.env.ANTHROPIC_API_KEY || '').trim()) return { configured: true, source: 'env' };
  try {
    const { data } = await admin().from('app_settings').select('value').eq('key', 'anthropic_api_key').maybeSingle();
    return data?.value ? { configured: true, source: 'db' } : { configured: false, source: null };
  } catch {
    return { configured: false, source: null };
  }
}

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
