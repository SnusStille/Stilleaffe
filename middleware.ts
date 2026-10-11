import { NextResponse, type NextRequest } from 'next/server';
import { token, pwFor, AUTH_COOKIE, AUTH_VERSION } from '@/lib/auth';

function isOpen(p: string): boolean {
  return (
    p === '/login' ||
    p === '/api/login' ||
    p === '/api/logout' ||
    p === '/api/health' ||
    p === '/favicon.ico' ||
    p.startsWith('/_next/') ||
    p.startsWith('/icon') ||
    p === '/wallstreet-inspiration.webp' ||
    p === '/wallstreet-floor-original.jpg' ||
    p.startsWith('/manifest')
  );
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname: p } = req.nextUrl;

    const cookieVal = req.cookies.get(AUTH_COOKIE)?.value || '';
    const vDot = cookieVal.indexOf('.');
    const ver = vDot > 0 ? cookieVal.slice(0, vDot) : '';
    const rest = vDot > 0 ? cookieVal.slice(vDot + 1) : '';
    const rDot = rest.indexOf('.');
    const role = rDot > 0 ? rest.slice(0, rDot) : '';
    const hash = rDot > 0 ? rest.slice(rDot + 1) : '';

    let ok = false;
    let loggedInRole: '' | 'seller' | 'manager' = '';
    if (ver === AUTH_VERSION && (role === 'seller' || role === 'manager')) {
      const pw = await pwFor(role); // V5: async (kan läsa från DB)
      if (pw && hash) {
        try {
          const want = await token(pw, role);
          if (want === hash) { ok = true; loggedInRole = role; }
        } catch { ok = false; }
      }
    }

    if (ok && p === '/login') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (isOpen(p)) {
      const h = new Headers(req.headers);
      if (ok) h.set('x-role', loggedInRole);
      else h.delete('x-role'); // Never pass through a client-supplied role header to open routes.
      return NextResponse.next({ request: { headers: h } });
    }

    if (!ok) {
      if (p.startsWith('/api/')) {
        return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 });
      }
      const dest = new URL('/login', req.url);
      if (cookieVal) dest.searchParams.set('e', 'session');
      return NextResponse.redirect(dest);
    }

    const h = new Headers(req.headers);
    h.set('x-role', loggedInRole);
    return NextResponse.next({ request: { headers: h } });
  } catch (err: any) {
    console.error('[middleware]', err);
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Serverfel' }, { status: 500 });
    }
    const dest = new URL('/login', req.url);
    dest.searchParams.set('e', 'server');
    return NextResponse.redirect(dest);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)'],
};
