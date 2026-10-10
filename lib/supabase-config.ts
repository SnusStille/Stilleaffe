export type SupabaseAdminKeySource = 'SUPABASE_SECRET_KEY' | 'SUPABASE_SERVICE_ROLE_KEY' | null;
export type SupabaseAdminKeyType =
  | 'missing'
  | 'secret-key'
  | 'publishable-key (not suitable for server admin)'
  | 'legacy JWT: service_role'
  | 'legacy JWT: anon (not suitable for server admin)'
  | 'legacy JWT: other role'
  | 'unrecognized';

const normalizeUrl = (value?: string) => {
  const raw = (value || '').trim();
  try { return new URL(raw).origin; } catch { return raw; }
};

export function getSupabaseAdminConfig(): {
  url: string;
  key: string;
  keySource: SupabaseAdminKeySource;
} {
  const secretKey = (process.env.SUPABASE_SECRET_KEY || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return {
    url: normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    // Prefer the explicitly named modern secret key if both variables are set.
    key: secretKey || serviceRoleKey,
    keySource: secretKey
      ? 'SUPABASE_SECRET_KEY'
      : serviceRoleKey
        ? 'SUPABASE_SERVICE_ROLE_KEY'
        : null,
  };
}

function legacyJwtRole(key: string): string | null {
  const payloadPart = key.split('.')[1];
  if (!payloadPart) return null;
  try {
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export function classifySupabaseAdminKey(key: string): SupabaseAdminKeyType {
  const trimmed = (key || '').trim();
  if (!trimmed) return 'missing';
  if (trimmed.startsWith('sb_secret_')) return 'secret-key';
  if (trimmed.startsWith('sb_publishable_')) return 'publishable-key (not suitable for server admin)';
  const role = legacyJwtRole(trimmed);
  if (role === 'service_role') return 'legacy JWT: service_role';
  if (role === 'anon') return 'legacy JWT: anon (not suitable for server admin)';
  if (role) return 'legacy JWT: other role';
  return 'unrecognized';
}

export function validateSupabaseAdminKey(key: string): string | null {
  const type = classifySupabaseAdminKey(key);
  if (type === 'missing') {
    return 'Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.';
  }
  if (type === 'publishable-key (not suitable for server admin)') {
    return 'The configured Supabase key is a publishable key. Use a server-side sb_secret_ key or a legacy service_role JWT.';
  }
  if (type === 'legacy JWT: anon (not suitable for server admin)') {
    return 'The configured legacy Supabase JWT has role=anon. Use the service_role JWT or an sb_secret_ key.';
  }
  if (type === 'legacy JWT: other role') {
    return 'The configured legacy Supabase JWT does not have role=service_role.';
  }
  return null;
}
