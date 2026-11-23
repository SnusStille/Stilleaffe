'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BrandLockup } from '@/components/brand';
import { Icon } from '@/components/icons';
import { SceneBoundary, webglAvailable } from '@/components/three/scene-boundary';

const LoginScene = dynamic(() => import('@/components/three/login-scene'), {
  ssr: false,
  loading: () => null,
});

const MSG: Record<string, { text: string; kind?: 'warn' | 'ok' }> = {
  session: { text: 'Sessionen har gått ut. Logga in igen.' },
  logged_out: { text: 'Du är nu utloggad.', kind: 'ok' },
  server: { text: 'Serverfel – försök igen om en stund.' },
};

function Orb() {
  return (
    <div className="orb-fallback" aria-hidden="true">
      <div className="orb">
        <span className="ll">LL</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; kind?: 'warn' | 'ok' } | null>(null);
  const [shake, setShake] = useState(false);
  const [scene, setScene] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const e = new URLSearchParams(location.search).get('e');
    if (e && MSG[e]) setError(MSG[e]);
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReduced(!!mq?.matches);
    const desktop = window.matchMedia?.('(min-width: 900px)').matches;
    if (desktop && !mq?.matches && webglAvailable()) {
      const start = () => setScene(true);
      const id = window.setTimeout(start, 500);
      return () => window.clearTimeout(id);
    }
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!username.trim() || !password) {
      setError({ text: 'Ange användarnamn och lösenord.' });
      bad();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ text: json?.error || 'Fel användarnamn eller lösenord.' });
        bad();
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError({ text: 'Kunde inte nå servern. Kontrollera anslutningen.' });
      bad();
    } finally {
      setBusy(false);
    }
  }

  function bad() {
    setShake(true);
    window.setTimeout(() => setShake(false), 480);
  }

  return (
    <div className="auth">
      <section className="auth-visual" aria-hidden="true">
        {scene ? (
          <SceneBoundary fallback={<Orb />}>
            <LoginScene />
          </SceneBoundary>
        ) : (
          <Orb />
        )}
        <div className="auth-overlay">
          <BrandLockup markSize={54} />
          <div className="auth-tagline">
            <div className="eyebrow mint" style={{ marginBottom: 10 }}>LABEL LAB · SALES PERFORMANCE</div>
            <h1>
              Prestanda,<br />
              i siffror du<br />
              kan <em>lita på.</em>
            </h1>
            <p>
              Månadsresultat, takt, prognoser och teamjämförelse — samlade i en dashboard byggd för
              säljledning och säljare.
            </p>
          </div>
          <div className="auth-meta">
            <div><span>Team</span><b>4 konton</b></div>
            <div><span>Tidszon</span><b>Europe/Stockholm</b></div>
            <div><span>Partner</span><b>ViPo Säkerhetstjänster</b></div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className={`auth-card ${shake ? 'shake' : ''}`}>
          <div className="eyebrow">SÄKER INLOGGNING</div>
          <h2>Välkommen tillbaka</h2>
          <p className="sub">Logga in med dina personliga uppgifter. Rollen styrs automatiskt av servern.</p>

          {error && (
            <div className={`auth-alert ${error.kind === 'ok' ? 'ok' : ''}`} role="alert">
              <Icon name={error.kind === 'ok' ? 'check-circle' : 'alert-circle'} size={15} />
              <span>{error.text}</span>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <div className="auth-field">
              <label className="label" htmlFor="username">Användarnamn</label>
              <input
                id="username"
                name="username"
                className="input"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="t.ex. stille"
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label className="label" htmlFor="password">Lösenord</label>
              <div className="input-group">
                <input
                  id="password"
                  name="password"
                  className="input"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ditt lösenord"
                  disabled={busy}
                  aria-invalid={!!error}
                />
                <button type="button" className="toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Dölj lösenord' : 'Visa lösenord'} tabIndex={0}>
                  <Icon name={show ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
            </div>
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy} style={{ marginTop: 6 }}>
              {busy ? (
                <>
                  <span className="spin" aria-hidden="true" style={{ width: 14, height: 14, border: '2px solid rgba(3,35,29,.3)', borderTopColor: '#03231d', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Loggar in…
                </>
              ) : (
                <>
                  Logga in <Icon name="arrow-right" size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-note">
            <b>Så fungerar det:</b> du loggar in med ditt eget användarnamn och lösenord. Servern hämtar din
            roll från den autentiserade identiteten — den kan inte ändras från webbläsaren. Sessionen är
            HttpOnly, Secure och tidsbegränsad.
          </div>

          <div className="auth-foot">
            Label Lab · partner till ViPo Säkerhetstjänster · {new Date().getFullYear()}
          </div>
        </div>
      </section>
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
