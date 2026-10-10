import { createClient } from '@/lib/supabase-shim';

export type Role = 'seller' | 'manager';

// Hämtar lösenord – först från DB (app_settings) om användaren bytt,
// sedan från ENV. Trimmar och returnerar undefined om lösenordet är tomt.
const base = (u?: string) => {
  try { return new URL((u || '').trim()).origin; } catch { return (u || '').trim(); }
};

function adminClient() {
  const url = base(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !/^https?:\/\//.test(url)) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

let _dbCache: Record<string, string> | null = null;
let _dbCacheAt = 0;
const DB_TTL = 10_000; // 10s cache per request

async function dbOverride(key: string): Promise<string | null> {
  try {
    const sb = adminClient();
    if (!sb) return null;
    const now = Date.now();
    if (!_dbCache || now - _dbCacheAt > DB_TTL) {
      const { data } = await sb.from('app_settings').select('key,value');
      const map: Record<string, string> = {};
      for (const r of data || []) if (r?.key) map[r.key] = String(r.value ?? '');
      _dbCache = map; _dbCacheAt = now;
    }
    return _dbCache[key] ?? null;
  } catch { return null; }
}

// Tillåt att åsidosätta cachen (t.ex. direkt efter lösenordsbyte)
export function invalidatePasswordCache() { _dbCache = null; _dbCacheAt = 0; }

export async function pwFor(r: string): Promise<string | undefined> {
  if (r !== 'seller' && r !== 'manager') return undefined;
  const key = r === 'seller' ? 'seller_password' : 'manager_password';
  const fromDb = await dbOverride(key);
  const raw = fromDb ?? (r === 'seller' ? process.env.SELLER_PASSWORD : process.env.MANAGER_PASSWORD);
  const pw = (raw || '').trim();
  return pw.length >= 1 ? pw : undefined;
}

function secretFor(role: string): string {
  const explicit = (process.env.SESSION_SECRET || '').trim();
  if (explicit.length >= 8) return explicit + '::sd-v7::' + role;
  const sp = (process.env.SELLER_PASSWORD || '').trim();
  const mp = (process.env.MANAGER_PASSWORD || '').trim();
  return 'sd-fallv7::' + sp + '::' + mp + '::' + role + '::v7';
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function token(pw: string, role: string): Promise<string> {
  // V5: inkludera även en hårdkodad salt i signaturen för att förhindra
  // att någon som känner till formatet kan byta cookie-värde.
  const msg = 'sd-session-v7:' + role + ':' + pw;
  const sec = secretFor(role);
  const keyData = new TextEncoder().encode(sec + '::key');
  const k = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return bufferToHex(s);
}
