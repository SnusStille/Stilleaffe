'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/app-provider';
import { Icon } from '@/components/icons';
import { Avatar, Badge, Card, Skeleton } from '@/components/ui';
import { initials } from '@/lib/calc';

type Health = {
  ok?: boolean;
  v?: string;
  db?: string;
  env?: Record<string, boolean | string>;
  tables?: Record<string, { status: string; detail?: string }>;
};

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export default function SettingsPage() {
  const { me, data, sound, haptics, setSound, setHaptics, motionMode, setMotionMode, reducedMotion, toast } = useApp();
  const [health, setHealth] = useState<Health | null>(null);
  const [ai, setAi] = useState<{ configured: boolean; source: string | null } | null>(null);
  const [users, setUsers] = useState<{ username: string; display_name: string; role: string; is_active?: boolean }[] | null>(null);
  const isManager = me.role === 'manager';

  useEffect(() => {
    fetch('/api/health', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false, db: 'FEL' }));
    fetch('/api/settings', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setAi(j.ai || null);
        if (Array.isArray(j.users)) setUsers(j.users);
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/login';
  }

  function testSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      o.start();
      o.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  const roleLabel = isManager ? 'Chef' : 'Säljare';
  const myGoals = data?.team.find((t) => t.username === me.username)?.goals;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>KONTO · PREFERENSER · SYSTEM</div>
          <h1 className="page-title">Inställningar</h1>
          <p className="page-sub">Ditt konto, hur Label Lab känns och hur systemet mår. Inga lösenord eller nycklar visas någonsin här.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div><div className="card-kicker">PROFIL</div><h3>Konto</h3></div>
              <Badge tone={isManager ? 'violet' : 'mint'}>{roleLabel}</Badge>
            </div>
            <div className="row" style={{ gap: 14, alignItems: 'center' }}>
              <Avatar name={me.display_name} role={me.role} size="lg" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 720, letterSpacing: '-0.02em' }}>{me.display_name}</div>
                <div className="card-note">@{me.username} · inloggad med säker session (HttpOnly, 12 h)</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={logout}><Icon name="logout" size={14} /> Logga ut</button>
            </div>
            <div className="metric-row" style={{ marginTop: 10 }}><span>Roll</span><b>{isManager ? 'Chef — ser hela teamet, skrivskyddad säljdata' : 'Säljare — egna registreringar och mål'}</b></div>
            <div className="metric-row"><span>Serverdatum</span><b>{data?.now ? new Date(data.now).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'medium', timeStyle: 'short' }) : '–'} · Europe/Stockholm</b></div>
            <div className="metric-row"><span>Lösenord</span><b>Hanteras i Vercel Secrets — kontakta administratören för byte</b></div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-kicker">UPPLEVELSE</div><h3>Preferenser</h3></div></div>
            <div className="setting-row">
              <div style={{ flex: 1 }}>
                <div className="s-title">Ljud</div>
                <div className="s-desc">Diskreta ljud vid sparad registrering och bemärkelser.</div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={testSound}>Testa</button>
              <Switch on={sound} onChange={setSound} label="Ljud" />
            </div>
            <div className="setting-row">
              <div style={{ flex: 1 }}>
                <div className="s-title">Haptik</div>
                <div className="s-desc">Vibration på mobil vid bekräftelse.</div>
              </div>
              <Switch on={haptics} onChange={setHaptics} label="Haptik" />
            </div>
            <div className="setting-row">
              <div style={{ flex: 1 }}>
                <div className="s-title">Rörelse</div>
                <div className="s-desc">3D-scener och animationer. Stängs av automatiskt när systemet begär reducerad rörelse{reducedMotion ? ' (aktivt just nu)' : ''}.</div>
              </div>
              <div className="segmented">
                <button className={motionMode === 'studio' ? 'on' : ''} onClick={() => setMotionMode('studio')}>Studio</button>
                <button className={motionMode === 'quiet' ? 'on' : ''} onClick={() => setMotionMode('quiet')}>Tyst</button>
              </div>
            </div>
            <div className="card-note" style={{ marginTop: 8 }}>Preferenser sparas lokalt i den här webbläsaren.</div>
          </div>

          <div className="card">
            <div className="card-head">
              <div><div className="card-kicker">MÅL</div><h3>{isManager ? 'Teamets mål' : 'Mina mål'}</h3></div>
              <Link href="/goals" className="btn btn-sm btn-ghost">{isManager ? 'Visa mål' : 'Ändra mål'}</Link>
            </div>
            {myGoals ? (
              <div className="grid g-3" style={{ gap: 8 }}>
                <div className="stat-tile"><span>Dag</span><b>{myGoals.daily_sales}</b><small>{myGoals.daily_tb.toLocaleString('sv-SE')} kr TB</small></div>
                <div className="stat-tile"><span>Vecka</span><b>{myGoals.weekly_sales}</b><small>{myGoals.weekly_tb.toLocaleString('sv-SE')} kr TB</small></div>
                <div className="stat-tile"><span>Månad</span><b>{myGoals.monthly_sales}</b><small>{myGoals.monthly_tb.toLocaleString('sv-SE')} kr TB</small></div>
              </div>
            ) : (
              <p className="card-note">{isManager ? 'Chefer har inga egna säljmål. Varje säljares mål visas under Team.' : 'Inga mål hittades för ditt konto.'}</p>
            )}
            {isManager && <div className="note" style={{ marginTop: 12 }}><Icon name="lock" size={15} /><span>Chefer kan inte ändra säljares mål eller registreringar — inte heller via AI.</span></div>}
          </div>

          {isManager && users && (
            <div className="card">
              <div className="card-head"><div><div className="card-kicker">KONTON</div><h3>Teamets konton</h3></div><Badge tone="violet">Chef</Badge></div>
              <div className="user-list">
                {users.map((u) => (
                  <div className="user-row" key={u.username}>
                    <Avatar name={u.display_name} role={u.role} size="sm" />
                    <div style={{ flex: 1 }}>
                      <div className="n">{u.display_name}</div>
                      <div className="u">@{u.username}</div>
                    </div>
                    <Badge tone={u.role === 'manager' ? 'violet' : 'mint'}>{u.role === 'manager' ? 'Chef' : 'Säljare'}</Badge>
                    {u.is_active === false && <Badge tone="red">Inaktiv</Badge>}
                  </div>
                ))}
              </div>
              <div className="card-note" style={{ marginTop: 10 }}>Konton och lösenord hanteras i Supabase (app_users) och Vercel Secrets — aldrig i klienten.</div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><div><div className="card-kicker">AI-COACH</div><h3>Anthropic</h3></div><Badge tone={ai?.configured ? 'green' : 'gold'}>{ai?.configured ? 'Aktiverad' : 'Ej konfigurerad'}</Badge></div>
            <div className="metric-row"><span>Modell</span><b>claude-sonnet-5-5</b></div>
            <div className="metric-row"><span>Nyckel</span><b>{ai?.source === 'env' ? 'Vercel Secrets (ANTHROPIC_API_KEY)' : ai?.source === 'db' ? 'Äldre nyckel i databasen — flytta till Vercel' : 'Saknas'}</b></div>
            <div className="metric-row"><span>Skydd</span><b>Endast förslag · aldrig automatiska ändringar</b></div>
            <Link href="/ai" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}><Icon name="sparkles" size={14} /> Öppna AI-coach</Link>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-kicker">PRODUKTFAKTA &amp; KÄLLOR</div><h3>ViPo Säkerhetstjänster</h3></div></div>
            <div className="fact-row">
              <span className="ic"><Icon name="shield" size={14} /></span>
              <div><b>Brandkollen</b> — Uppkopplad rök- och CO-varnare. SMS + samtal från ViPos larmcentral, eskalering till anhöriga enligt larmplan. Självtest varje timme. Mobilnät — ingen app eller WiFi krävs.<br /><span className="dim">Källa: vipo.se/brandkollen · Verifierad produktinformation</span></div>
            </div>
            <div className="fact-row">
              <span className="ic"><Icon name="user" size={14} /></span>
              <div><b>Konsumentkollen</b> — Personnummerbevakning, aviseringar, kreditinformation, spärrservice och bedrägeriassistans.<br /><span className="dim">Källa: vipo.se/konsumentkollen · Verifierad produktinformation</span></div>
            </div>
            <div className="fact-row">
              <span className="ic"><Icon name="wallet" size={14} /></span>
              <div><b>Kampanjpriser</b> — 129 / 189 / 219 / 249 / 289 kr per månad. 12 månaders bindningstid, 3 månaders uppsägningstid.<br /><span className="dim">Källa: vipo.se (2026-01-28) · Kampanjpris — kontrollera med ledning innan löfte</span></div>
            </div>
            <div className="fact-row">
              <span className="ic"><Icon name="building" size={14} /></span>
              <div><b>Label Lab</b> — Partner och återförsäljare till ViPo Säkerhetstjänster. Jämförelser mot UC, Mysafety m.fl. och löften om polis/myndighet eller garanterat skydd får aldrig framställas som fakta.<br /><span className="dim">Huvudavtal: vipo.se/wp-content/uploads/huvudavtal_brandkollen_20230601.pdf</span></div>
            </div>
            <div className="note" style={{ marginTop: 8 }}><Icon name="alert" size={15} /><span>Priser och erbjudanden redigeras i Spelguiden av chefer, med källa eller senast godkända datum. Obekräftade påståenden markeras <b>Kontrollera med ledning</b>.</span></div>
            <Link href="/guide" className="btn btn-sm btn-ghost" style={{ marginTop: 10 }}><Icon name="guide" size={14} /> Öppna Spelguide</Link>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-kicker">SYSTEM</div><h3>Status</h3></div><Badge tone={health?.ok ? 'green' : 'red'}>{health?.ok ? 'Drift' : 'Problem'}</Badge></div>
            {!health ? <Skeleton height={120} /> : (
              <>
                <div className="metric-row"><span>Version</span><b>{health.v || '–'}</b></div>
                <div className="metric-row"><span>Databas</span><b><span className={`status-dot ${health.db === 'ok' ? 'ok' : 'err'}`} />{health.db === 'ok' ? 'Ansluten' : health.db === 'FEL' ? 'Fel — kontrollera migrering och nycklar' : 'Saknas'}</b></div>
                <div className="metric-row"><span>Session</span><b><span className="status-dot ok" />Säker (HttpOnly · SameSite · 12 h)</b></div>
                {isManager && health.tables && (
                  <div style={{ marginTop: 10 }}>
                    <div className="card-kicker" style={{ marginBottom: 6 }}>MIGRERING · TABELLER</div>
                    {Object.entries(health.tables).map(([k, v]) => (
                      <div key={k} className="row-between" style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span>{k}</span>
                        <span className={`badge ${v.status === 'ok' ? 'green' : 'red'}`}>{v.status}</span>
                      </div>
                    ))}
                    {health.env && (
                      <>
                        <div className="card-kicker" style={{ margin: '12px 0 6px' }}>MILJÖVARIABLER</div>
                        {Object.entries(health.env).map(([k, v]) => (
                          <div key={k} className="row-between" style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span>{k}</span>
                            {typeof v === 'boolean' ? <span className={`badge ${v ? 'green' : 'gold'}`}>{v ? 'Satt' : 'Saknas'}</span> : <span className="dim">{v}</span>}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
                <div className="card-note" style={{ marginTop: 10 }}>Health-endpoint: <code>/api/health</code> · Detaljer visas bara för chefer.</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
