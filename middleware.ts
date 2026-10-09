import { NextResponse, type NextRequest } from 'next/server';
import { token, pwFor } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname, [role, hash] = (req.cookies.get('sd_auth')?.value || '').split('.'), pw = pwFor(role);
  const ok = !!pw && hash === (await token(pw, role));
  const open = p.startsWith('/login') || p === '/api/login' || p === '/api/health';
  if (!ok && !open) return p.startsWith('/api') ? NextResponse.json({ error: 'Inte inloggad' }, { status: 401 }) : NextResponse.redirect(new URL(req.cookies.get('sd_auth') ? '/login?e=session' : '/login', req.url));
  if (ok && p.startsWith('/login')) return NextResponse.redirect(new URL('/', req.url));
  const h = new Headers(req.headers); h.delete('x-role'); if (ok) h.set('x-role', role); // alltid överskriven av servern
  return NextResponse.next({ request: { headers: h } });
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)'] };
