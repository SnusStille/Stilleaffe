import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/middleware';
export async function POST() {
  const r = NextResponse.json({ ok: true });
  r.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 });
  return r;
}
