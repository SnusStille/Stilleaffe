import type { Role } from './types';

export type SessionPayload = {
  u: string;
  r: Role;
  e: number;
};

const encoder = new TextEncoder();

function base64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return new Uint8Array(sig);
}

/**
 * Session secret. Vercel Secret `SESSION_SECRET` (>= 32 chars) is strongly
 * recommended. Without it we derive a stable key from the configured passwords
 * so the app still works during migration; /api/health flags the weaker setup.
 */
export function sessionSecret(): string {
  const explicit = (process.env.SESSION_SECRET || '').trim();
  if (explicit.length >= 32) return explicit;
  const material = [
    process.env.STILLE_PASSWORD,
    process.env.SELLER_PASSWORD,
    process.env.AFFE_PASSWORD,
    process.env.MANAGER_PASSWORD,
    process.env.FREDLAND_PASSWORD,
    process.env.KVIST_PASSWORD,
  ]
    .map((v) => (v || '').trim())
    .join('::');
  return 'label-lab-derived::' + material + '::v1';
}

export async function signSession(payload: SessionPayload, secret = sessionSecret()): Promise<string> {
  const body = base64Url(encoder.encode(JSON.stringify(payload)));
  const sig = base64Url(await hmac(secret, `ll-session-v1:${body}`));
  return `${body}.${sig}`;
}

export async function verifySession(token: string, secret = sessionSecret()): Promise<SessionPayload | null> {
  if (!token || token.length > 2000) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = await hmac(secret, `ll-session-v1:${body}`);
  let given: Uint8Array;
  try {
    given = base64UrlDecode(sig);
  } catch {
    return null;
  }
  if (!bytesEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as SessionPayload;
    if (!payload || typeof payload.u !== 'string' || (payload.r !== 'seller' && payload.r !== 'manager')) return null;
    if (!Number.isFinite(payload.e) || payload.e <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'll_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  };
}
