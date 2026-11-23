import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/session';

const OPEN_PATHS = new Set([
  '/login',
  '/api/login',
  '/api/logout',
  '/api/health',
  '/favicon.ico',
  '/icon.svg',
  '/manifest.webmanifest',
]);

function isOpen(pathname: string): boolean {
  if (OPEN_PATHS.has(pathname)) return true;
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/brand/') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/manifest')
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  try {
    const raw = req.cookies.get(SESSION_COOKIE)?.value || '';
    const session = raw ? await verifySession(raw) : null;

    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const headers = new Headers(req.headers);
    if (session) {
      headers.set('x-user', session.u);
      headers.set('x-role', session.r);
    } else {
      // Never let a client-supplied identity header reach an open route.
      headers.delete('x-user');
      headers.delete('x-role');
    }

    if (isOpen(pathname)) {
      return NextResponse.next({ request: { headers } });
    }

    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 });
      }
      const dest = new URL('/login', req.url);
      if (raw) dest.searchParams.set('e', 'session');
      return NextResponse.redirect(dest);
    }

    return NextResponse.next({ request: { headers } });
  } catch (err) {
    console.error('[middleware]', err);
    if (pathname.startsWith('/api/')) {
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
