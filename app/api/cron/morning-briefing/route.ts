import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { admin } from '@/lib/secrets';
import { currentStockholmParts, checkResendDomain, loadMorningMetrics, prepareMorningEmail, readMorningSettings, recipientsFingerprint, sendMorningEmail, validEmail, type PreparedMorningEmail } from '@/lib/morning-email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
const privateHeaders = { 'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate', Pragma: 'no-cache' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders });
const previousDate = (date: string) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
};

function authorized(req: Request) {
  const secret = (process.env.CRON_SECRET || '').trim();
  const supplied = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (secret.length < 32 || supplied.length !== secret.length) return false;
  try { return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied)); } catch { return false; }
}

export async function GET(req: Request) {
  if ((process.env.CRON_SECRET || '').trim().length < 32) return reply({ error: 'Cron authentication is not configured.' }, 503);
  if (!authorized(req)) return reply({ error: 'Unauthorized' }, 401);
  try {
    const settings = await readMorningSettings();
    if (!settings.enabled) return reply({ ok: true, skipped: 'disabled' });
    const recipients = [...new Set([settings.oliver, settings.affe])];
    const fingerprint = recipientsFingerprint(settings.oliver, settings.affe);
    const parts = currentStockholmParts();
    const scheduledHour = Number(settings.time.slice(0, 2));
    const rolloverRetryEnd = scheduledHour + 2 - 24;
    const retryingAfterMidnight = scheduledHour >= 22 && parts.hour <= rolloverRetryEnd;
    const reportDate = retryingAfterMidnight ? previousDate(parts.date) : parts.date;
    const retryHoursElapsed = retryingAfterMidnight ? 24 - scheduledHour + parts.hour : parts.hour - scheduledHour;
    const withinRetryWindow = retryHoursElapsed >= 0 && retryHoursElapsed <= 2;
    const key = `daily:${reportDate}`;
    const sb = admin();
    const { data: prior, error: readError } = await sb.from('email_dispatch_logs')
      .select('status,attempts,started_at,email_payload').eq('idempotency_key', key).maybeSingle();
    if (readError) return reply({ error: 'Kör supabase/migration-morning-briefing.sql innan cron körs.' }, 503);
    if (prior?.status === 'sent') return reply({ ok: true, skipped: 'already-sent', date: reportDate });
    const scheduledNow = !retryingAfterMidnight && parts.hour === scheduledHour;
    const retrying = !!prior && prior.status !== 'sent' && withinRetryWindow && Number(prior.attempts) < 3;
    if (!scheduledNow && !retrying) return reply({ ok: true, skipped: 'outside-send-window', localTime: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}` });
    if (prior?.status === 'sending' && Date.now() - Date.parse(prior.started_at) < 20 * 60_000) {
      return reply({ ok: true, skipped: 'send-in-progress', date: reportDate });
    }
    if (prior?.status === 'failed' && Number(prior.attempts) >= 3) return reply({ ok: true, skipped: 'retry-limit-reached', date: reportDate });
    const { data: claim, error: claimError } = await sb.rpc('claim_morning_briefing', { p_report_date: reportDate, p_recipients: recipients });
    if (claimError) return reply({ error: 'Kör supabase/migration-morning-briefing.sql och kontrollera RPC-rättigheterna.' }, 503);
    if (claim !== true) return reply({ ok: true, skipped: 'already-claimed', date: reportDate });

    try {
      if (!validEmail(settings.oliver) || !validEmail(settings.affe) || recipients.length !== 2) throw new Error('Två olika, giltiga mottagare måste konfigureras.');
      if (settings.testedRecipients !== fingerprint) throw new Error('Mottagarna har inte godkänts i ett lyckat testutskick. Rapporten skickades inte.');
      if (!(process.env.RESEND_API_KEY || '').trim()) throw new Error('RESEND_API_KEY saknas; rapporten skickades inte.');
      const provider = await checkResendDomain();
      if (!provider.verified) throw new Error(provider.message);
      let email = prior?.email_payload as PreparedMorningEmail | null;
      if (!email || typeof email.html !== 'string' || typeof email.text !== 'string' || typeof email.subject !== 'string') {
        const { metrics } = await loadMorningMetrics(reportDate);
        email = await prepareMorningEmail(metrics);
        const { error: payloadError } = await sb.from('email_dispatch_logs').update({ email_payload: email }).eq('idempotency_key', key);
        if (payloadError) throw new Error('Kunde inte spara rapportutkastet säkert; inget mejl skickades.');
      }
      const sent = await sendMorningEmail(recipients, email, key);
      const { error } = await sb.from('email_dispatch_logs').update({
        status: 'sent', resend_id: sent.id, error_message: null, finished_at: new Date().toISOString(),
      }).eq('idempotency_key', key);
      if (error) throw new Error('Rapporten skickades, men leveransloggen kunde inte uppdateras. Kontrollera Resend-historiken innan manuell retry.');
      return reply({ ok: true, date: reportDate, analysisSource: sent.analysisSource });
    } catch (e: any) {
      const message = String(e?.message || 'Morgonrapporten misslyckades.').slice(0, 350);
      await sb.from('email_dispatch_logs').update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() }).eq('idempotency_key', key);
      return reply({ error: message, date: reportDate }, 502);
    }
  } catch (e: any) {
    console.error('[morning-cron]', String(e?.message || 'Serverfel'));
    return reply({ error: 'Morgonrapportens cron-körning misslyckades.' }, 503);
  }
}
