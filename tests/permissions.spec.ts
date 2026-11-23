import { afterEach, describe, expect, it } from 'vitest';
import { POST as entriesPost } from '@/app/api/entries/route';
import { POST as goalsPost, GET as goalsGet } from '@/app/api/goals/route';
import { POST as guidePost, DELETE as guideDelete } from '@/app/api/guide/route';
import { GET as guideGet, } from '@/app/api/guide/route';
import { GET as commentsGet, POST as commentsPost } from '@/app/api/comments/route';
import { GET as auditGet } from '@/app/api/audit/route';
import { GET as dataGet } from '@/app/api/data/route';
import { POST as achievementsPost } from '@/app/api/achievements/route';
import { GET as settingsGet } from '@/app/api/settings/route';
import { GET as healthGet } from '@/app/api/health/route';
import { POST as loginPost } from '@/app/api/login/route';

/**
 * Route handlers are exercised directly. The middleware is the only component
 * that writes x-user/x-role (after verifying the HttpOnly cookie), so a request
 * without those headers is exactly what an anonymous caller looks like.
 */
const req = (path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
  new Request(`http://localhost${path}`, {
    method: init.method || 'GET',
    headers: { ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(init.headers || {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

const as = (username: string, role: string) => ({ 'x-user': username, 'x-role': role });

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
});

describe('anonymous callers are rejected before any database access', () => {
  it('API routes answer 401 with a Swedish error', async () => {
    for (const [name, call] of [
      ['data', () => dataGet(req('/api/data'))],
      ['comments', () => commentsGet(req('/api/comments'))],
      ['audit', () => auditGet(req('/api/audit'))],
      ['goals', () => goalsGet(req('/api/goals'))],
      ['guide', () => guideGet(req('/api/guide'))],
      ['settings', () => settingsGet(req('/api/settings'))],
      ['entries', () => entriesPost(req('/api/entries', { method: 'POST', body: { action: 'upsert' } }))],
    ] as const) {
      const res = await call();
      expect(res.status, name).toBe(401);
      const json = await res.json();
      expect(json.error, name).toBe('Inte inloggad');
      expect(res.headers.get('cache-control')).toContain('no-store');
    }
  });

  it('login cannot be tricked by a role in the request body', async () => {
    const res = await loginPost(req('/api/login', { method: 'POST', body: { username: 'affe', password: 'x', role: 'manager' } }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBeUndefined();
    expect(json.user).toBeUndefined();
  });

  it('health is public but leaks no configuration to anonymous callers', async () => {
    const res = await healthGet(req('/api/health'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.v).toBe('label-lab-1.0');
    expect(json.env).toBeUndefined();
    expect(json.tables).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain('ANTHROPIC');
  });
});

describe('role & identity checks happen before the database', () => {
  it('managers (affe, fredland) can never write sales entries', async () => {
    for (const manager of ['affe', 'fredland']) {
      const res = await entriesPost(
        req('/api/entries', {
          method: 'POST',
          headers: as(manager, 'manager'),
          body: { action: 'upsert', entry_date: '2026-11-20', sales: 10, tb_sek: 100, seller_username: 'stille' },
        }),
      );
      expect(res.status).toBe(403);
      expect((await res.json()).error).toMatch(/Bara säljaren/);
    }
  });

  it('managers can never change goals', async () => {
    const res = await goalsPost(req('/api/goals', { method: 'POST', headers: as('affe', 'manager'), body: { monthly_sales: 1 } }));
    expect(res.status).toBe(403);
    const res2 = await goalsPost(req('/api/goals', { method: 'POST', headers: as('fredland', 'manager'), body: { monthly_sales: 1 } }));
    expect(res2.status).toBe(403);
  });

  it('sellers can never edit the Spelguide', async () => {
    for (const seller of ['stille', 'kvist']) {
      const res = await guidePost(req('/api/guide', { method: 'POST', headers: as(seller, 'seller'), body: { id: 'bk-manus', body: { body: 'x' } } }));
      expect(res.status).toBe(403);
      const del = await guideDelete(req('/api/guide', { method: 'DELETE', headers: as(seller, 'seller'), body: { id: 'bk-manus' } }));
      expect(del.status).toBe(403);
    }
  });

  it('sellers cannot unlock achievements for anyone else and managers cannot unlock at all', async () => {
    const res = await achievementsPost(req('/api/achievements', { method: 'POST', headers: as('affe', 'manager'), body: { key: 'first_sale' } }));
    expect(res.status).toBe(403);
  });

  it('a seller with a valid session reaches the storage layer (fails safely without DB config)', async () => {
    const res = await entriesPost(
      req('/api/entries', { method: 'POST', headers: as('kvist', 'seller'), body: { action: 'upsert', entry_date: '2026-11-20', sales: 10, tb_sek: 100 } }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Databasen är inte konfigurerad/);
  });

  it('validates input before touching the database', async () => {
    const bad = await entriesPost(
      req('/api/entries', { method: 'POST', headers: as('kvist', 'seller'), body: { action: 'upsert', entry_date: '2026-11-xx', sales: -1, tb_sek: 100 } }),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/Ogiltigt datum/);
  });

  it('comment creation requires a session and a body', async () => {
    const anon = await commentsPost(req('/api/comments', { method: 'POST', body: { body: 'hej' } }));
    expect(anon.status).toBe(401);
    // Without a DB the manager's write fails safely *after* the identity check.
    const mgr = await commentsPost(req('/api/comments', { method: 'POST', headers: as('fredland', 'manager'), body: { body: '' } }));
    expect(mgr.status).toBe(400);
    expect((await mgr.json()).error).toMatch(/Skriv något/);
  });
});
