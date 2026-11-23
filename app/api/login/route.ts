import { NextResponse } from 'next/server';
import {
  createSessionValue,
  loginBlocked,
  recordLoginFailure,
  clearLoginFailures,
  clientIp,
  passwordFor,
  verifyPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth';
import { getUser } from '@/lib/users';

export const runtime = 'nodejs';

const MSG = {
  bad: 'Ogiltig förfrågan. Ladda om sidan och försök igen.',
  missing: 'Användarnamn och lösenord krävs.',
  pw: 'Fel användarnamn eller lösenord.',
  blocked: 'För många försök. Vänta en stund innan du försöker igen.',
  server: 'Serverfel – försök igen om en stund.',
  notfound: 'Fel användarnamn eller lösenord.',
};

export async function POST(req: Request) {
  try {
    let username = '';
    let password = '';
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const body = await req.json();
      username = String(body?.username || '');
      password = String(body?.password || '');
    } else {
      const form = await req.formData();
      username = String(form.get('username') || '');
      password = String(form.get('password') || '');
    }

    username = username.trim().toLowerCase();
    password = password.trim();
    if (!username || !password) {
      return NextResponse.json({ error: MSG.missing }, { status: 400 });
    }
    if (username.length > 64 || password.length > 512) {
      return NextResponse.json({ error: MSG.pw }, { status: 401 });
    }

    const ip = clientIp(req);
    const gate = loginBlocked(ip, username);
    if (gate.blocked) {
      return NextResponse.json(
        { error: MSG.blocked, retryAfter: gate.retryAfter },
        { status: 429, headers: { 'Retry-After': String(gate.retryAfter || 600) } },
      );
    }

    const user = await getUser(username);
    const stored = passwordFor(username);
    // Run the hash comparison even for unknown users to keep timing uniform.
    const ok = verifyPassword(password, stored) && !!user;
    if (!ok) {
      recordLoginFailure(ip, username);
      return NextResponse.json({ error: MSG.pw }, { status: 401 });
    }

    clearLoginFailures(ip, username);
    const value = await createSessionValue(user.username, user.role);
    const res = NextResponse.json({
      ok: true,
      user: { username: user.username, display_name: user.display_name, role: user.role },
    });
    res.cookies.set(SESSION_COOKIE, value, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: MSG.server }, { status: 500 });
  }
}
