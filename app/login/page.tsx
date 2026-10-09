'use client';
import { useEffect, useState } from 'react';
const MSG: Record<string, string> = {
  pw: 'Fel lösenord.',
  rate: 'För många försök – vänta 10 minuter.',
  missing: 'Servern saknar lösenordet (SELLER_PASSWORD / MANAGER_PASSWORD). Öppna /api/health för att se vad som saknas.',
  session: 'Inloggningen gick igenom men sessionen kunde inte verifieras – servern saknar troligen SELLER_PASSWORD / MANAGER_PASSWORD. Öppna /api/health.',
};
export default function Login() {
  const [msg, setMsg] = useState(''), [show, setShow] = useState(false);
  useEffect(() => { const e = new URLSearchParams(location.search).get('e'); if (e) setMsg(MSG[e] || 'Något gick fel.'); }, []);
  // Vanlig formulärpost: fungerar även om JavaScript i webbläsaren inte hinner/kan köras.
  return <div className="center"><div className="lg">
    <div className="lgmark">S</div><h1>Säljdashboard</h1><p className="s">Privat uppföljning för Stille & Affe</p>
    <form method="post" action="/api/login">
      <div className="seg2">{[['seller', 'Stille', 'Säljare'], ['manager', 'Affe', 'Chef']].map(([v, n, t], i) => <label key={v}><input type="radio" name="role" value={v} defaultChecked={i === 0} /><span>{n}<small>{t}</small></span></label>)}</div>
      <div className="pwrap"><input name="password" type={show ? 'text' : 'password'} autoFocus required placeholder="Lösenord" autoComplete="current-password" />
        <button type="button" className="eye" onClick={() => setShow(!show)} aria-label="Visa lösenord">{show ? '🙈' : '👁'}</button></div>
      <button type="submit" className="b pri big">Logga in →</button>
    </form>
    {msg && <p className="s bad" style={{ marginTop: 14 }}>{msg}</p>}
  </div></div>;
}
