import { NextResponse, type NextRequest } from 'next/server';
import { token, pwFor } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  try {
    const p = req.nextUrl.pathname;
    const open = p.startsWith('/login') || p === '/api/login' || p === '/api/health';
    // Tillåt statiska resurser (Next hanterar dem via matcher nedan men gör ett explicit skydd här).
    const cookieVal = req.cookies.get('sd_auth')?.value || '';
    const dot = cookieVal.indexOf('.');
    const role = dot > 0 ? cookieVal.slice(0, dot) : '';
    const hash = dot > 0 ? cookieVal.slice(dot + 1) : '';
    const pw = pwFor(role);
    let ok = false;
    try {
      // Vik token(..) i en egen try/catch så att ett kastat fel här inte tar hela mittendelen.
      ok = !!pw && !!hash && hash === (await token(pw, role));
    } catch { ok = false; }
    if (!ok && !open) {
      return p.startsWith('/api')
        ? NextResponse.json({ error: 'Inte inloggad' }, { status: 401 })
        : NextResponse.redirect(new URL(cookieVal ? '/login?e=session' : '/login', req.url));
    }
    if (ok && p.startsWith('/login')) return NextResponse.redirect(new URL('/', req.url));
    const h = new Headers(req.headers);
    h.delete('x-role');
    if (ok) h.set('x-role', role); // alltid överskriven av servern
    return NextResponse.next({ request: { headers: h } });
  } catch (err: any) {
    console.error('[middleware]', err);
    // Vid totalt fel: skicka vidare som ogiltig session istället för krasch-loop.
    if (req.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Serverfel' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/login?e=server', req.url));
  }
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)'] };
