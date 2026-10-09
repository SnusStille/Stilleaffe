import { NextResponse } from 'next/server';
import { token, pwFor } from '@/lib/auth';
const tries = new Map<string, number[]>();
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0], now = Date.now(), t = (tries.get(ip) || []).filter(x => now - x < 600000);
  if (t.length >= 8) return NextResponse.json({ error: 'För många försök – vänta en stund.' }, { status: 429 });
  let b: any = {}; try { b = await req.json(); } catch {}
  const role = b.role === 'manager' ? 'manager' : 'seller', pw = pwFor(role);
  if (!pw) return NextResponse.json({ error: 'Lösenord saknas i miljövariablerna (SELLER_PASSWORD / MANAGER_PASSWORD).' }, { status: 500 });
  if (typeof b.password !== 'string' || (await token(b.password, role)) !== (await token(pw, role))) { t.push(now); tries.set(ip, t); return NextResponse.json({ error: 'Fel lösenord.' }, { status: 401 }); }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('sd_auth', `${role}.${await token(pw, role)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
