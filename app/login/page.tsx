'use client';
import { useState } from 'react';
export default function Login() {
  const [role, setRole] = useState<'seller' | 'manager'>('seller'), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, password: pw }) });
    if (r.ok) window.location.href = '/'; else { setMsg((await r.json()).error || 'Något gick fel.'); setBusy(false); }
  }
  return <div className="center"><div className="lg">
    <div className="lgmark">S</div><h1>Säljdashboard</h1><p className="s">Privat uppföljning för Stille & Affe</p>
    <div className="seg">{(['seller', 'manager'] as const).map(r => <button key={r} type="button" className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r === 'seller' ? 'Stille' : 'Affe'}<small>{r === 'seller' ? 'Säljare' : 'Chef'}</small></button>)}</div>
    <form onSubmit={submit}><div className="pwrap"><input type={show ? 'text' : 'password'} autoFocus required placeholder="Lösenord" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" />
      <button type="button" className="eye" onClick={() => setShow(!show)} aria-label="Visa lösenord">{show ? '🙈' : '👁'}</button></div>
      <button className="b pri big" disabled={busy}>{busy ? 'Loggar in…' : 'Logga in →'}</button></form>
    {msg && <p className="s bad">{msg}</p>}
  </div></div>;
}
