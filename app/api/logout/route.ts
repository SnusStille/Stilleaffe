import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';
export async function POST() {
  const r = NextResponse.json({ ok: true });
  r.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 });
  return r;
}
