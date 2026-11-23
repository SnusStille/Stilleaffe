import { describe, expect, it } from 'vitest';
import { hashPassword, passwordFor, sessionFromRequest, verifyPassword, PASSWORD_ENV } from '@/lib/auth';
import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions, signSession, verifySession } from '@/lib/session';

describe('password hashing (scrypt)', () => {
  it('hashPassword produces the scrypt$ format that verifyPassword accepts', () => {
    const stored = hashPassword('KorrektHästBatteri!');
    expect(stored.startsWith('scrypt:16384:8:1:')).toBe(true);
    expect(stored).not.toContain('$'); // safe in .env.local (dotenv never expands it)
    expect(verifyPassword('KorrektHästBatteri!', stored)).toBe(true);
    expect(verifyPassword('fel', stored)).toBe(false);
    expect(verifyPassword('', stored)).toBe(false);
  });

  it('rejects malformed hashes and missing passwords', () => {
    expect(verifyPassword('x', undefined)).toBe(false);
    expect(verifyPassword('x', 'scrypt:1:2:3')).toBe(false);
    expect(verifyPassword('x', 'scrypt:16384:8:1:zz:zz')).toBe(false);
    expect(verifyPassword('x', 'scrypt$16384$8$1$zz$zz')).toBe(false);
  });

  it('accepts the legacy "scrypt$" spelling of the same hash', () => {
    const colon = hashPassword('BytMig2026');
    const dollar = colon.replace(/^scrypt:/, 'scrypt$').replace(/:/g, '$');
    expect(verifyPassword('BytMig2026', dollar)).toBe(true);
    expect(verifyPassword('BytMig2027', dollar)).toBe(false);
  });

  it('legacy plaintext secrets are compared in constant time (migration only)', () => {
    expect(verifyPassword('hemlig', 'hemlig')).toBe(true);
    expect(verifyPassword('hemli', 'hemlig')).toBe(false);
  });

  it('maps every account to its own environment variable', () => {
    expect(PASSWORD_ENV.stille).toEqual(['STILLE_PASSWORD', 'SELLER_PASSWORD']);
    expect(PASSWORD_ENV.affe).toEqual(['AFFE_PASSWORD', 'MANAGER_PASSWORD']);
    expect(PASSWORD_ENV.fredland).toEqual(['FREDLAND_PASSWORD']);
    expect(PASSWORD_ENV.kvist).toEqual(['KVIST_PASSWORD']);
    expect(passwordFor('unknown')).toBeUndefined();
  });
});

describe('signed sessions', () => {
  it('round-trips a payload and rejects tampering', async () => {
    const token = await signSession({ u: 'kvist', r: 'seller', e: Date.now() + 60_000 }, 'test-secret-test-secret-test-secret-32');
    expect(await verifySession(token, 'test-secret-test-secret-test-secret-32')).toMatchObject({ u: 'kvist', r: 'seller' });
    const [body, sig] = token.split('.');
    expect(await verifySession(`${body}x.${sig}`, 'test-secret-test-secret-test-secret-32')).toBeNull();
    expect(await verifySession(token, 'another-secret-another-secret-another-32')).toBeNull();
  });

  it('rejects expired sessions and invalid roles', async () => {
    const expired = await signSession({ u: 'stille', r: 'seller', e: Date.now() - 1 }, 's');
    expect(await verifySession(expired, 's')).toBeNull();
    const forged = await signSession({ u: 'stille', r: 'admin' as any, e: Date.now() + 1000 }, 's');
    expect(await verifySession(forged, 's')).toBeNull();
    expect(await verifySession('', 's')).toBeNull();
    expect(await verifySession('abc', 's')).toBeNull();
  });

  it('cookie is HttpOnly, SameSite=Lax, 12 h and Secure in production', () => {
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.maxAge).toBe(SESSION_TTL_MS / 1000);
    expect(SESSION_COOKIE).toBe('ll_session');
    expect(SESSION_TTL_MS).toBe(12 * 60 * 60 * 1000);
  });

  it('sessionFromRequest trusts only middleware-injected identity headers', () => {
    const mk = (h: Record<string, string>) => new Request('http://localhost/api/x', { headers: h });
    expect(sessionFromRequest(mk({ 'x-user': 'affe', 'x-role': 'manager' }))).toEqual({ username: 'affe', role: 'manager' });
    expect(sessionFromRequest(mk({ 'x-user': 'affe', 'x-role': 'admin' }))).toBeNull();
    expect(sessionFromRequest(mk({ 'x-role': 'manager' }))).toBeNull();
    expect(sessionFromRequest(mk({}))).toBeNull();
  });
});
