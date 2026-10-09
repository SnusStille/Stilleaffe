'use client';
import { useEffect, useState } from 'react';
const MSG: Record<string, string> = {
  pw: 'Fel lösenord.',
  rate: 'För många försök – vänta 10 minuter.',
  missing: 'Servern saknar lösenordet (SELLER_PASSWORD / MANAGER_PASSWORD). Öppna /api/health för att se vad som saknas.',
  bad: 'Ogiltig förfrågan.',
  server: 'Serverfel – försök igen.',
  session: 'Inloggningen gick igenom men sessionen kunde inte verifieras – servern saknar troligen SELLER_PASSWORD / MANAGER_PASSWORD. Öppna /api/health.',
};

// Två strategier:
// 1) Vanilla HTML-form (method=post, action=/api/login) → fungerar även utan JS,
//    eller om nätverksanropet misslyckas.
// 2) JS-förstärkning: förbättrar UX (visa "loggar in…" och inline-fel) men faller
//    alltid tillbaka på native-submit om något kastar.
export default function Login() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const e = new URLSearchParams(location.search).get('e');
    if (e) setMsg(MSG[e] || 'Något gick fel.');
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const role = String(fd.get('role') || 'seller');
    const password = String(fd.get('password') || '');
    if (!password) { setMsg(MSG.pw); return; }
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, password }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { data = {}; }
      if (res.ok) { window.location.href = '/'; return; }
      setMsg(MSG[data.error] || data.error || 'Något gick fel.');
    } catch {
      // Fallback: native formulärsubmit med vanlig POST (samma som om JS var avstängt).
      form.submit();
      return;
    } finally {
      setBusy(false);
    }
  }

  return <div className="center"><div className="lg">
    <div className="lgmark">S</div><h1>Säljdashboard</h1><p className="s">Privat uppföljning för Stille &amp; Affe</p>
    <form method="post" action="/api/login" onSubmit={onSubmit}>
      <div className="seg2">{[['seller', 'Stille', 'Säljare'], ['manager', 'Affe', 'Chef']].map(([v, n, t], i) => <label key={v}><input type="radio" name="role" value={v} defaultChecked={i === 0} /><span>{n}<small>{t}</small></span></label>)}</div>
      <div className="pwrap"><input name="password" type={show ? 'text' : 'password'} autoFocus required placeholder="Lösenord" autoComplete="current-password" />
        <button type="button" className="eye" onClick={() => setShow(!show)} aria-label="Visa lösenord">{show ? '🙈' : '👁'}</button></div>
      <button type="submit" className="b pri big" disabled={busy}>{busy ? 'Loggar in…' : 'Logga in →'}</button>
    </form>
    {msg && <p className="s bad" style={{ marginTop: 14 }}>{msg}</p>}
  </div></div>;
}
