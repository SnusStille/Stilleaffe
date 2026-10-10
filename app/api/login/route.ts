import { NextResponse } from 'next/server';
import { token, invalidatePasswordCache, pwFor, AUTH_VERSION, AUTH_COOKIE } from '@/lib/auth';

const tries = new Map<string, { count: number; until: number }>();
const MAX_TRIES = 10;
const WINDOW_MS = 10 * 60 * 1000;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const isForm = !(req.headers.get('content-type') || '').includes('json');
  const back = (e: string, status: number) =>
    isForm
      ? NextResponse.redirect(new URL('/login?e=' + encodeURIComponent(e), req.url), 303)
      : NextResponse.json({ error: e }, { status });
  try {
    invalidatePasswordCache();
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const now = Date.now();
    let lim = tries.get(ip);
    if (!lim || lim.until < now) lim = { count: 0, until: now + WINDOW_MS };
    if (lim.count >= MAX_TRIES) return back('rate', 429);

    let roleIn = 'seller', passwordIn = '';
    try {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('json')) {
        const b = await req.json();
        roleIn = String(b?.role || 'seller');
        passwordIn = String(b?.password || '');
      } else {
        const f = await req.formData();
        roleIn = String(f.get('role') || 'seller');
        passwordIn = String(f.get('password') || '');
      }
    } catch { return back('bad', 400); }

    const role: 'seller' | 'manager' = roleIn === 'manager' ? 'manager' : 'seller';
    const password = (passwordIn || '').trim();
    if (!password) return back('pw', 401);

    const pw = await pwFor(role);
    if (!pw) { console.error('[login] saknar lösenord för', role); return back('missing', 500); }
    const [got, want] = await Promise.all([token(password, role), token(pw, role)]);
    if (got !== want) { lim.count += 1; tries.set(ip, lim); return back('pw', 401); }

    tries.delete(ip);
    const cookieVal = `${AUTH_VERSION}.${role}.${want}`;
    const isProd = process.env.NODE_ENV === 'production';
    const res = isForm
      ? NextResponse.redirect(new URL('/', req.url), 303)
      : NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, cookieVal, {
      httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err: any) {
    console.error('[login]', err);
    return back('server', 500);
  }
}
