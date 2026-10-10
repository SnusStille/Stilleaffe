import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { token, pwFor, invalidatePasswordCache, AUTH_COOKIE, AUTH_VERSION } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    invalidatePasswordCache();
    const role = req.headers.get('x-role');
    if (role !== 'seller' && role !== 'manager') {
      return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 });
    }
    let body: any = {};
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan' }, { status: 400 }); }
    const current = String(body.current || '');
    const next = String(body.next || '').trim();
    if (!current) return NextResponse.json({ error: 'Ange nuvarande lösenord.' }, { status: 400 });
    if (next.length < 4) return NextResponse.json({ error: 'Nytt lösenord måste vara minst 4 tecken.' }, { status: 400 });
    const pw = await pwFor(role);
    if (!pw) return NextResponse.json({ error: 'Servern saknar nuvarande lösenord.' }, { status: 500 });
    const want = await token(pw, role);
    const got = await token(current, role);
    if (want !== got) return NextResponse.json({ error: 'Fel nuvarande lösenord.' }, { status: 401 });
    const key = role === 'seller' ? 'seller_password' : 'manager_password';
    const { error } = await admin().from('app_settings').upsert({ key, value: next });
    if (error) return NextResponse.json({ error: 'Kunde inte spara: ' + error.message }, { status: 500 });
    // Sätt ny cookie med det nya lösenordet så användaren inte loggas ut
    const newHash = await token(next, role);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, `${AUTH_VERSION}.${role}.${newHash}`, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      path: '/', maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Serverfel' }, { status: 500 });
  }
}
