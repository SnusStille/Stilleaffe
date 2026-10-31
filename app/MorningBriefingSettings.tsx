'use client';

import { useCallback, useEffect, useState } from 'react';
type DispatchLog = { id: number; kind: 'daily' | 'test'; report_date: string | null; recipients: string[]; status: string; attempts: number; resend_id?: string | null; error_message?: string | null; started_at: string; finished_at?: string | null };
type SettingsState = { oliver: string; affe: string; time: string; enabled: boolean };
type SetupState = { resendConfigured: boolean; cronConfigured: boolean; domainVerified: boolean; domainMessage: string; recipientsConfigured: boolean; testPassedForCurrentRecipients: boolean; ledgerReady: boolean; ledgerMessage: string | null };
const blank: SettingsState = { oliver: '', affe: '', time: '07:00', enabled: false };

export default function MorningBriefingSettings() {
  const [form, setForm] = useState<SettingsState>(blank);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/morning-briefing', { credentials: 'same-origin', cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Kunde inte läsa utskicksinställningar.');
      setForm(json.settings || blank);
      setSetup(json.setup || null);
      setLogs(Array.isArray(json.logs) ? json.logs : []);
    } catch (e: any) {
      setMessage({ text: e?.message || 'Kunde inte läsa utskicksinställningar.', ok: false });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function post(action: string, payload: Record<string, unknown> = {}) {
    setBusy(action); setMessage(null);
    try {
      const res = await fetch('/api/morning-briefing', {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Åtgärden misslyckades.');
      if (action === 'preview') {
        setPreview({ subject: json.subject, html: json.html });
        setMessage({ text: 'Förhandsvisningen använder dagens registrerade data.', ok: true });
      } else {
        setMessage({ text: json.disabledForRecipientChange ? 'Mottagarna ändrades. Utskicket pausades tills ett nytt test har lyckats.' : json.message || 'Sparat.', ok: true });
        if (action === 'save') setPreview(null);
        await refresh();
      }
    } catch (e: any) { setMessage({ text: e?.message || 'Åtgärden misslyckades.', ok: false }); }
    finally { setBusy(''); }
  }

  const readyToTest = !!setup?.resendConfigured && !!setup.domainVerified && !!setup.recipientsConfigured && !!setup.ledgerReady;
  const readyToEnable = readyToTest && !!setup?.cronConfigured && !!setup?.testPassedForCurrentRecipients;
  const statusClass = form.enabled && readyToEnable ? 'mail-enabled' : 'mail-disabled';
  const statusText = form.enabled && readyToEnable ? 'AKTIV' : form.enabled ? 'KONFIGURATIONSFEL' : 'AVSTÄNGD';

  return <section className="c morning-settings" aria-labelledby="morning-title">
    <header className="morning-settings-head">
      <div><div className="mission-eyebrow">AUTOMATION · EUROPE/STOCKHOLM</div><h3 id="morning-title">Morning Sales Briefing</h3><p>En personlig rapport från StilleAffe — schemalagd, server-side och loggad.</p></div>
      <span className={`morning-status ${statusClass}`}><i/>{loading ? 'KONTROLLERAR' : statusText}</span>
    </header>

    {setup?.ledgerMessage && <div className="morning-warning" role="status">{setup.ledgerMessage}</div>}
    {setup && <div className="morning-setup-checks" aria-label="Konfigurationsstatus">
      <span className={setup.resendConfigured ? 'done' : ''}>{setup.resendConfigured ? '✓' : '○'} Resend-nyckel</span>
      <span className={setup.cronConfigured ? 'done' : ''}>{setup.cronConfigured ? '✓' : '○'} Cron-hemlighet</span>
      <span className={setup.domainVerified ? 'done' : ''}>{setup.domainVerified ? '✓' : '○'} Sändardomän</span>
      <span className={setup.recipientsConfigured ? 'done' : ''}>{setup.recipientsConfigured ? '✓' : '○'} Två mottagare</span>
      <span className={setup.testPassedForCurrentRecipients ? 'done' : ''}>{setup.testPassedForCurrentRecipients ? '✓' : '○'} Godkänt test</span>
    </div>}
    {setup && <p className={'morning-domain-note'+(setup.domainVerified?' is-ok':'')}>{setup.domainMessage} Avsändare: <b>StilleAffe &lt;noreply@stilledev.se&gt;</b></p>}

    <form className="morning-settings-form" onSubmit={(e) => { e.preventDefault(); void post('save', form as any); }}>
      <label><span>Oliver · mottagare</span><input type="email" autoComplete="email" required placeholder="oliver@exempel.se" value={form.oliver} onChange={(e) => setForm((v) => ({ ...v, oliver: e.target.value }))}/></label>
      <label><span>Affe · mottagare</span><input type="email" autoComplete="email" required placeholder="affe@exempel.se" value={form.affe} onChange={(e) => setForm((v) => ({ ...v, affe: e.target.value }))}/></label>
      <label><span>Utskickstid · svensk tid</span><select value="07:00" disabled aria-label="Utskickstid låst till 07:00 Europe/Stockholm"><option value="07:00">07:00 · Europe/Stockholm</option></select></label>
      <button type="submit" className="b" disabled={!!busy || loading}>{busy === 'save' ? 'Sparar…' : 'Spara mottagare'}</button>
    </form>
    <p className="morning-hint">Vercel Hobby tillåter endast dagliga Cron-körningar. Fyra dagliga UTC-kontroller hanterar CET/CEST och säkra retries; rapporten skickas endast när klockan är 07:00 i Stockholm. En annan utskickstid kräver ändrad schemakonfiguration eller Pro-plan.</p>

    <div className="morning-actions">
      <button type="button" className="b pri" disabled={!!busy || !readyToTest} onClick={() => void post('test')}>{busy === 'test' ? 'Skickar test…' : 'Skicka test till båda'}</button>
      <button type="button" className="b" disabled={!!busy} onClick={() => void post('preview')}>{busy === 'preview' ? 'Bygger förhandsvisning…' : 'Förhandsgranska mejl'}</button>
      {form.enabled
        ? <button type="button" className="b danger" disabled={!!busy} onClick={() => void post('disable')}>Pausa dagliga mejl</button>
        : <button type="button" className="b morning-enable" disabled={!!busy || !readyToEnable} onClick={() => void post('enable')}>Aktivera dagligt utskick</button>}
    </div>
    {!readyToEnable && <p className="morning-hint">Aktivering låses upp först när Resend-domänen och CRON_SECRET är konfigurerade, båda adresserna är sparade och ett test till de aktuella mottagarna lyckas.</p>}
    {message && <div className={'morning-feedback '+(message.ok?'ok':'error')} role="status">{message.text}</div>}

    {preview && <div className="morning-preview"><div className="morning-preview-head"><span><b>Förhandsvisning</b><small>{preview.subject}</small></span><button type="button" className="b sm ghost" onClick={() => setPreview(null)}>Stäng</button></div><iframe title="Förhandsvisning av Morning Sales Briefing" sandbox="" srcDoc={preview.html}/></div>}

    <div className="morning-history-head"><div><div className="k">Utskickslogg</div><p className="s">Dagliga rapporter och testmejl · senaste 30</p></div><button type="button" className="b sm ghost" disabled={loading || !!busy} onClick={() => void refresh()}>Uppdatera</button></div>
    <div className="morning-log-list">{loading ? <p className="s">Laddar logg…</p> : logs.length ? logs.map((entry) => <article className="morning-log-row" key={entry.id}>
      <span className={'morning-log-status '+entry.status} aria-label={entry.status}>{entry.status === 'sent' ? '✓' : entry.status === 'failed' ? '!' : '…'}</span>
      <div><b>{entry.kind === 'test' ? 'Testutskick' : 'Morgonrapport'}{entry.report_date ? ` · ${entry.report_date}` : ''}</b><small>{(entry.recipients || []).join(' · ')}</small>{entry.error_message && <small className="morning-log-error">{entry.error_message}</small>}</div>
      <time dateTime={entry.started_at}>{new Date(entry.started_at).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' })}</time>
    </article>) : <p className="s">Inga utskick loggade ännu.</p>}</div>
    <p className="morning-security-note">Nycklar stannar server-side. Testmejl går endast till de två sparade mottagarna. Ändras en adress pausas utskicket tills ett nytt test har lyckats. Rapportdata hämtas från Supabase vid varje utskick.</p>
  </section>;
}
