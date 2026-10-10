'use client';
import { useEffect, useRef, useState } from 'react';
const MSG: Record<string, { text: string; kind?: 'warn' | 'ok' }> = {
  pw: { text: 'Fel lösenord. Försök igen.' },
  rate: { text: 'För många försök – vänta 10 minuter.' },
  missing: { text: 'Servern saknar lösenordet (SELLER_PASSWORD / MANAGER_PASSWORD). Kontakta Affe/Stille eller öppna /api/health.' },
  bad: { text: 'Ogiltig förfrågan. Ladda om sidan och försök igen.' },
  server: { text: 'Serverfel – försök igen om en stund.' },
  session: { text: 'Sessionen är gammal eller ogiltig – logga in på nytt.' },
  logged_out: { text: 'Du är utloggad.', kind: 'ok' },
};
export default function Login() {
  const [msg, setMsg] = useState<{ text: string; kind?: 'warn' | 'ok' } | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<'seller' | 'manager'>('seller');
  const pwRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const e = new URLSearchParams(location.search).get('e');
    if (e) setMsg(MSG[e] || { text: 'Något gick fel.' });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get('password') || '').trim();
    if (!password) { setMsg(MSG.pw); pwRef.current?.focus(); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, password }),
        credentials: 'same-origin',
      });
      let data: any = {};
      try { data = await res.json(); } catch { data = {}; }
      if (res.ok) { window.location.replace('/'); return; }
      setMsg(MSG[data.error] || { text: data.error || 'Något gick fel.' });
    } catch {
      // fallback: native formulärpost
      form.submit();
      return;
    } finally {
      setBusy(false);
      setTimeout(() => pwRef.current?.focus(), 30);
    }
  }

  return (
    <div className="center">
      <div className="lgorbs" aria-hidden><i /><i /><i /></div>
      <div className="lggrid" aria-hidden />
      <div className="lg">
        <div className="cubewrap" aria-hidden><div className="cube"><b>S</b><b>S</b><b>S</b><b>S</b><b /><b /></div></div>
        <h1>Stilleaffe</h1>
        <p className="s">Säljuppföljning för Stille &amp; Affe</p>
        <form method="post" action="/api/login" onSubmit={onSubmit} noValidate>
          <input type="hidden" name="role" value={role} />
          <div className="seg" role="tablist" aria-label="Välj roll">
            {[['seller', 'Stille', 'Säljare'], ['manager', 'Affe', 'Chef']].map(([v, n, t]) => (
              <button key={v} type="button" className={role === v ? 'on' : ''} onClick={() => setRole(v as any)} aria-pressed={role === v}>
                {n}<small>{t}</small>
              </button>
            ))}
          </div>
          <div className="pwrap">
            <input ref={pwRef} name="password" type={show ? 'text' : 'password'} autoFocus required placeholder="Lösenord" autoComplete="current-password" />
            <button type="button" className="eye" onClick={() => setShow(v => !v)} aria-label={show ? 'Dölj lösenord' : 'Visa lösenord'} tabIndex={-1}>
              {show ? '🙈' : '👁'}
            </button>
          </div>
          <button type="submit" className="b pri big" disabled={busy} aria-busy={busy}>
            {busy ? 'Loggar in…' : 'Logga in →'}
          </button>
        </form>
        {msg && (
          <p className={'s ' + (msg.kind === 'ok' ? 'ok' : 'bad')} style={{ marginTop: 14 }} role="alert">{msg.text}</p>
        )}
      </div>
    </div>
  );
}
