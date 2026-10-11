'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import FloorBg from '../FloorBg';

const MSG: Record<string, { text: string; kind?: 'warn' | 'ok' }> = {
  pw: { text: 'Fel lösenord. Kontrollera uppgifterna och försök igen.' },
  rate: { text: 'För många försök – vänta 10 minuter innan du försöker igen.' },
  missing: { text: 'Servern saknar ett inloggningslösenord. Kontakta Stille eller Affe.' },
  bad: { text: 'Ogiltig förfrågan. Ladda om sidan och försök igen.' },
  server: { text: 'Serverfel – försök igen om en stund.' },
  session: { text: 'Sessionen är gammal eller ogiltig – logga in på nytt.' },
  logged_out: { text: 'Du är utloggad.', kind: 'ok' },
};

const FOCUS_LINES = [
  { text: 'Stora dagar börjar med ett bra nästa samtal.', by: 'DAGENS FOKUS' },
  { text: 'Tydlighet i processen. Lugn i samtalet.', by: 'DAGENS FOKUS' },
  { text: 'Bygg rytmen — resultatet följer arbetet.', by: 'DAGENS FOKUS' },
  { text: 'Ambition blir starkare när den får en plan.', by: 'DAGENS FOKUS' },
  { text: 'Var nyfiken först. Var övertygande sen.', by: 'DAGENS FOKUS' },
];

type Role = 'seller' | 'manager';

export default function Login() {
  const [msg, setMsg] = useState<{ text: string; kind?: 'warn' | 'ok' } | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<Role>('seller');
  const [shake, setShake] = useState(false);
  const [ok, setOk] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const pwRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover)').matches) return;
    const el = document.querySelector('.auth-shell') as HTMLElement | null;
    if (!el) return;
    let raf = 0;
    const mv = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--tx', (e.clientX / window.innerWidth - 0.5).toFixed(3));
        el.style.setProperty('--ty', (e.clientY / window.innerHeight - 0.5).toFixed(3));
      });
    };
    window.addEventListener('pointermove', mv, { passive: true });
    return () => { window.removeEventListener('pointermove', mv); cancelAnimationFrame(raf); };
  }, []);
  const activeFocus = FOCUS_LINES[focusIndex];

  const bad = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 520);
  };

  useEffect(() => {
    document.documentElement.dataset.role = role;
  }, [role]);

  useEffect(() => {
    const e = new URLSearchParams(location.search).get('e');
    if (e) setMsg(MSG[e] || { text: 'Något gick fel.' });
    const day = Number(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', day: 'numeric' }).format(new Date()));
    setFocusIndex(Number.isFinite(day) ? day % FOCUS_LINES.length : 0);
    if (window.matchMedia?.('(pointer: fine)').matches) requestAnimationFrame(() => pwRef.current?.focus({ preventScroll: true }));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || ok) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get('password') || '').trim();
    if (!password) {
      setMsg(MSG.pw);
      bad();
      pwRef.current?.focus();
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, password }),
        credentials: 'same-origin',
      });
      let data: any = {};
      try { data = await res.json(); } catch { data = {}; }
      if (res.ok) {
        setOk(true);
        window.setTimeout(() => window.location.replace('/'), 650);
        return;
      }
      setMsg(MSG[data.error] || { text: data.error || 'Något gick fel.' });
      bad();
    } catch {
      // Fallback to the existing native POST if fetch is unavailable.
      form.submit();
      return;
    } finally {
      setBusy(false);
      window.setTimeout(() => pwRef.current?.focus(), 30);
    }
  }

  const selectRole = (nextRole: Role) => {
    setRole(nextRole);
    setMsg(null);
  };

  return (
    <div className="auth-shell" data-role={role}>
      <div className="auth-grain" aria-hidden="true" />
      <section className="auth-story" aria-label="StilleAffe — fokus och ambition">
        <Image
          className="auth-art"
          src="/wallstreet-floor-original.jpg"
          alt="Ett livligt, anonymt handelsgolv med Manhattan genom stora fönster."
          fill
          priority
          sizes="(max-width: 860px) 100vw, 58vw"
        />
        <div className="auth-art-shade" aria-hidden="true" />
        <div className="auth-art-grid" aria-hidden="true" />
        <FloorBg variant="login" />

        <header className="auth-brand">
          <div className="auth-mark" role="img" aria-label="Stille och Affe">
            <span>S</span><span>A</span>
          </div>
          <div className="auth-brand-copy">
            <strong>STILLEAFFE</strong>
            <span>PRIVATE SALES STUDIO</span>
          </div>
          <div className="auth-private"><i aria-hidden="true" /> PRIVAT ARBETSUTRYMME</div>
        </header>

        <div className="auth-story-copy">
          <div className="auth-eyebrow"><span>01</span><i aria-hidden="true" /> WALL STREET-ENERGI · EGEN DISCIPLIN</div>
          <div className="auth-bell"><i aria-hidden="true" />MARKET OPEN · RING THE BELL</div>
          <h2>Gör jobbet.<br /><em>Äg resultatet.</em></h2>
          <p className="auth-story-lead">En tydlig blick på dagens resultat, nästa steg och vanorna som bygger något större.</p>

          <div className="auth-focus" aria-live="polite">
            <div className="auth-focus-symbol" aria-hidden="true">“</div>
            <div className="auth-focus-copy" key={focusIndex}>
              <p>{activeFocus.text}</p>
              <span>{activeFocus.by}</span>
            </div>
            <button
              type="button"
              className="auth-focus-next"
              aria-label="Visa nästa fokus"
              title="Visa nästa fokus"
              onClick={() => setFocusIndex((i) => (i + 1) % FOCUS_LINES.length)}
            >↗</button>
          </div>
        </div>

        <footer className="auth-story-footer">
          <div className="auth-pair"><span>STILLE <small>SÄLJARE</small></span><b>×</b><span>AFFE <small>CHEF</small></span></div>
          <div className="auth-story-ticker" aria-hidden="true">
            <div className="auth-story-ticker-track">
              <div className="auth-story-ticker-group"><span>RING THE BELL</span><i>▲</i><span>CLOSE THE DEAL</span><i>▲</i><span>NEXT CALL</span><i>▲</i><span>BEAT YESTERDAY</span><i>▲</i><span>STAY HUNGRY</span><i>▲</i><span>OWN THE DAY</span><i>▲</i></div>
              <div className="auth-story-ticker-group"><span>RING THE BELL</span><i>▲</i><span>CLOSE THE DEAL</span><i>▲</i><span>NEXT CALL</span><i>▲</i><span>BEAT YESTERDAY</span><i>▲</i><span>STAY HUNGRY</span><i>▲</i><span>OWN THE DAY</span><i>▲</i></div>
            </div>
          </div>
        </footer>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel-top"><span>INLOGGNING</span><span>STILLEAFFE <i>／</i> SE</span></div>

        <div className={'auth-card' + (shake ? ' is-shaking' : '') + (ok ? ' is-success' : '')}>
          <div className="auth-card-mark" aria-hidden="true"><span>SA</span><i>✦</i></div>
          <div className="auth-kicker">DIN PRIVATA SÄLJVY</div>
          <h1 id="auth-title">Välkommen{role === 'seller' ? ', Stille.' : ', Affe.'}</h1>
          <p className="auth-intro">Välj din roll och logga in för att fortsätta.</p>

          <form className="auth-form" method="post" action="/api/login" onSubmit={onSubmit} noValidate>
            <input type="hidden" name="role" value={role} />

            <fieldset className="auth-roles" aria-label="Välj roll för inloggning" disabled={busy || ok}>
              <legend className="auth-sr">Välj roll</legend>
              <button
                type="button"
                className={'auth-role' + (role === 'seller' ? ' is-active' : '')}
                onClick={() => selectRole('seller')}
                aria-pressed={role === 'seller'}
              >
                <span className="auth-role-avatar seller-avatar">S</span>
                <span className="auth-role-text"><strong>Stille</strong><small>Säljare · mål &amp; coachning</small></span>
                <span className="auth-role-check" aria-hidden="true">✓</span>
              </button>
              <button
                type="button"
                className={'auth-role' + (role === 'manager' ? ' is-active' : '')}
                onClick={() => selectRole('manager')}
                aria-pressed={role === 'manager'}
              >
                <span className="auth-role-avatar manager-avatar">A</span>
                <span className="auth-role-text"><strong>Affe</strong><small>Chef · överblick &amp; stöd</small></span>
                <span className="auth-role-check" aria-hidden="true">✓</span>
              </button>
            </fieldset>

            <label className="auth-label" htmlFor="auth-password">LÖSENORD</label>
            <div className="auth-password-wrap">
              <span className="auth-lock" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2"/></svg>
              </span>
              <input
                ref={pwRef}
                id="auth-password"
                name="password"
                type={show ? 'text' : 'password'}
                required
                placeholder="Ange ditt lösenord"
                aria-label="Lösenord"
                aria-invalid={msg?.kind !== 'ok' && !!msg}
                aria-describedby={msg ? 'auth-feedback' : 'auth-password-hint'}
                autoComplete="current-password"
                onChange={() => msg && setMsg(null)}
              />
              <span id="auth-password-hint" className="auth-sr">Lösenordet skickas via den skyddade inloggningsvägen.</span>
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Dölj lösenord' : 'Visa lösenord'}
                aria-pressed={show}
              >
                {show ? (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.8 4.5 9.7 6-.4.7-1.4 2.1-3.1 3.4M6.2 6.3C4.4 7.4 3.1 9.2 2.3 11c.9 1.5 4.5 6 9.7 6 1 0 1.9-.2 2.8-.5"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.3 12S5.9 6 12 6s9.7 6 9.7 6-3.6 6-9.7 6-9.7-6-9.7-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                )}
              </button>
            </div>

            <button type="submit" className="auth-submit" disabled={busy || ok} aria-busy={busy || ok}>
              <span className="auth-submit-label">
                {busy && <i className="auth-spinner" aria-hidden="true" />}
                {ok ? `Välkommen, ${role === 'seller' ? 'Stille' : 'Affe'}` : busy ? 'Kontrollerar inloggning…' : `Logga in som ${role === 'seller' ? 'Stille' : 'Affe'}`}
              </span>
              <span className="auth-submit-arrow" aria-hidden="true">{ok ? '✓' : '↗'}</span>
            </button>

            {msg && (
              <div id="auth-feedback" className={'auth-feedback' + (msg.kind === 'ok' ? ' is-ok' : '')} role={msg.kind === 'ok' ? 'status' : 'alert'}>
                <span className="auth-feedback-icon" aria-hidden="true">{msg.kind === 'ok' ? '✓' : '!'}</span>
                <span>{msg.text}</span>
              </div>
            )}
          </form>

          <div className="auth-divider"><span>BEHÖRIG ÅTKOMST</span></div>
          <div className="auth-security">
            <span className="auth-security-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 3 19 6v5c0 4.3-2.8 7.8-7 10-4.2-2.2-7-5.7-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>
            </span>
            <span><strong>Din arbetsyta förblir privat.</strong><small>Inloggningen kontrolleras på servern.</small></span>
          </div>
        </div>

        <footer className="auth-panel-footer"><span>STILLEAFFE</span><span>SECURE WORKSPACE</span><span>SWEDEN · SE</span></footer>
      </section>
    </div>
  );
}
