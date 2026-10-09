import { NextResponse } from 'next/server';
import { token, pwFor } from '@/lib/auth';
const tries = new Map<string, number[]>();

// Fungerar med vanlig formulärpost (utan JavaScript) och med JSON.
export async function POST(req: Request) {
  const isForm = !(req.headers.get('content-type') || '').includes('json');
  const back = (e: string, status: number) => isForm ? NextResponse.redirect(new URL('/login?e=' + e, req.url), 303) : NextResponse.json({ error: e }, { status });
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0], now = Date.now(), t = (tries.get(ip) || []).filter(x => now - x < 600000);
  if (t.length >= 8) return back('rate', 429);
  let role = 'seller', password = '';
  try {
    if (isForm) { const f = await req.formData(); role = String(f.get('role') || ''); password = String(f.get('password') || ''); }
    else { const b = await req.json(); role = String(b.role || ''); password = String(b.password || ''); }
  } catch {}
  role = role === 'manager' ? 'manager' : 'seller';
  const pw = pwFor(role);
  if (!pw) return back('missing', 500);
  if ((await token(password, role)) !== (await token(pw, role))) { t.push(now); tries.set(ip, t); return back('pw', 401); }
  const res = isForm ? NextResponse.redirect(new URL('/', req.url), 303) : NextResponse.json({ ok: true });
  res.cookies.set('sd_auth', `${role}.${await token(pw, role)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
