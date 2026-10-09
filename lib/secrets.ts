import { createClient } from '@supabase/supabase-js';
// Server-only. Tabellen app_settings har RLS utan policies: webbläsaren kan aldrig läsa den.
const base = (u?: string) => { try { return new URL((u || '').trim()).origin; } catch { return (u || '').trim(); } }; // klipper bort ev. /rest/v1 etc.
export const admin = () => createClient(base(process.env.NEXT_PUBLIC_SUPABASE_URL), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });

export async function keyStatus(): Promise<{ configured: boolean; source: 'env' | 'db' | null }> {
  if (process.env.ANTHROPIC_API_KEY) return { configured: true, source: 'env' };
  try {
    const { data } = await admin().from('app_settings').select('value').eq('key', 'anthropic_api_key').maybeSingle();
    return data?.value ? { configured: true, source: 'db' } : { configured: false, source: null };
  } catch { return { configured: false, source: null }; }
}
export async function getKey(): Promise<string | null> {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const { data } = await admin().from('app_settings').select('value').eq('key', 'anthropic_api_key').maybeSingle();
    return data?.value || null;
  } catch { return null; }
}
export const setKey = (v: string) => admin().from('app_settings').upsert({ key: 'anthropic_api_key', value: v });
export const delKey = () => admin().from('app_settings').delete().eq('key', 'anthropic_api_key');
