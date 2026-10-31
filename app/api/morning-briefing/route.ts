import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { admin } from '@/lib/secrets';
import { morningFallbackAnalysis, renderMorningEmail } from '@/lib/morning-report';
import {
  buildAndSendMorningEmail, checkResendDomain, loadMorningMetrics, normalizeEmail,
  readMorningSettings, recipientsFingerprint, validEmail, MORNING_SETTING_KEYS,
} from '@/lib/morning-email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const privateHeaders = { 'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate', Pragma: 'no-cache' };
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders });
const fail = (message: string, status = 400) => response({ error: message }, status);

function seller(req: Request) { return req.headers.get('x-role') === 'seller'; }
function recipients(oliver: string, affe: string) { return [...new Set([normalizeEmail(oliver), normalizeEmail(affe)])]; }

export async function GET(req: Request) {
  if (!seller(req)) return fail('Bara Stille kan ändra och granska e-postinställningar.', 403);
  try {
    const [settings, provider] = await Promise.all([readMorningSettings(), checkResendDomain()]);
    const sb = admin();
    const { data: logs, error } = await sb.from('email_dispatch_logs')
      .select('id,kind,report_date,recipients,status,attempts,resend_id,error_message,started_at,finished_at')
      .order('created_at', { ascending: false }).limit(30);
    const fingerprint = recipientsFingerprint(settings.oliver, settings.affe);
    return response({
      settings: { oliver: settings.oliver, affe: settings.affe, time: settings.time, enabled: settings.enabled },
      setup: {
        resendConfigured: provider.configured,
        cronConfigured: (process.env.CRON_SECRET || '').trim().length >= 32,
        domainVerified: provider.verified,
        domainMessage: provider.message,
        recipientsConfigured: validEmail(settings.oliver) && validEmail(settings.affe) && settings.oliver !== settings.affe,
        testPassedForCurrentRecipients: !!settings.testedRecipients && settings.testedRecipients === fingerprint,
        ledgerReady: !error,
        ledgerMessage: error ? 'Kör supabase/migration-morning-briefing.sql innan loggning eller schemaläggning kan användas.' : null,
      },
      logs: logs || [],
    });
  } catch (e: any) {
    const message = String(e?.message || 'Kunde inte läsa e-postinställningarna.');
    return fail(message.includes('email_dispatch_logs') ? 'Kör supabase/migration-morning-briefing.sql först.' : message, 503);
  }
}

export async function POST(req: Request) {
  if (!seller(req)) return fail('Bara Stille kan styra morgonutskick.', 403);
  let body: any;
  try { body = await req.json(); } catch { return fail('Ogiltig förfrågan.'); }
  try {
    if (body.action === 'save') {
      const oliver = normalizeEmail(body.oliver);
      const affe = normalizeEmail(body.affe);
      const time = String(body.time || '');
      if (!validEmail(oliver) || !validEmail(affe) || oliver === affe) return fail('Ange två olika, giltiga mottagaradresser.');
      if (!/^([01]\d|2[0-3]):00$/.test(time)) return fail('Välj en hel timme mellan 00:00 och 23:00.');
      const current = await readMorningSettings();
      const recipientChanged = recipientsFingerprint(oliver, affe) !== recipientsFingerprint(current.oliver, current.affe);
      const enabled = recipientChanged ? false : current.enabled;
      const { error } = await admin().from('app_settings').upsert([
        { key: MORNING_SETTING_KEYS.oliver, value: oliver },
        { key: MORNING_SETTING_KEYS.affe, value: affe },
        { key: MORNING_SETTING_KEYS.time, value: time },
        { key: MORNING_SETTING_KEYS.enabled, value: String(enabled) },
      ]);
      if (error) return fail('Kunde inte spara inställningarna.', 500);
      return response({ ok: true, disabledForRecipientChange: recipientChanged });
    }

    if (body.action === 'enable') {
      const settings = await readMorningSettings();
      const provider = await checkResendDomain();
      const fingerprint = recipientsFingerprint(settings.oliver, settings.affe);
      if ((process.env.CRON_SECRET || '').trim().length < 32) return fail('CRON_SECRET saknas eller är för kort. Daglig schemaläggning kan inte aktiveras.', 409);
      if (!validEmail(settings.oliver) || !validEmail(settings.affe) || settings.oliver === settings.affe) return fail('Spara två olika, giltiga mottagaradresser först.');
      if (!provider.configured || !provider.verified) return fail(provider.message, 409);
      if (settings.testedRecipients !== fingerprint) return fail('Skicka och godkänn först ett testmejl till båda aktuella mottagarna.', 409);
      const sb = admin();
      const { error: ledgerError } = await sb.from('email_dispatch_logs').select('id', { head: true }).limit(1);
      if (ledgerError) return fail('Kör supabase/migration-morning-briefing.sql innan aktivering.', 409);
      const { error } = await sb.from('app_settings').upsert({ key: MORNING_SETTING_KEYS.enabled, value: 'true' });
      return error ? fail('Kunde inte aktivera morgonrapporten.', 500) : response({ ok: true });
    }

    if (body.action === 'disable') {
      const { error } = await admin().from('app_settings').upsert({ key: MORNING_SETTING_KEYS.enabled, value: 'false' });
      return error ? fail('Kunde inte pausa morgonrapporten.', 500) : response({ ok: true });
    }

    if (body.action === 'preview') {
      const { metrics } = await loadMorningMetrics();
      const content = renderMorningEmail(metrics, morningFallbackAnalysis(metrics), 'preview');
      return response({ ok: true, subject: content.subject, html: content.html });
    }

    if (body.action === 'test') {
      const settings = await readMorningSettings();
      const to = recipients(settings.oliver, settings.affe);
      if (to.length < 2 || !validEmail(settings.oliver) || !validEmail(settings.affe)) return fail('Spara båda mottagaradresserna först.');
      const testKey = `test:${randomUUID()}`;
      const sb = admin();
      const { data: lastTest } = await sb.from('email_dispatch_logs').select('started_at').eq('kind', 'test').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (lastTest?.started_at && Date.now() - Date.parse(lastTest.started_at) < 60_000) return fail('Vänta en minut innan nästa testutskick.', 429);
      const { error: logError } = await sb.from('email_dispatch_logs').insert({
        idempotency_key: testKey, kind: 'test', report_date: null, recipients: to, status: 'sending', attempts: 1,
      });
      if (logError) return fail('Kör supabase/migration-morning-briefing.sql innan testutskick kan loggas.', 503);
      try {
        const { metrics } = await loadMorningMetrics();
        const sent = await buildAndSendMorningEmail(to, metrics, testKey);
        const { error: logUpdateError } = await sb.from('email_dispatch_logs').update({ status: 'sent', resend_id: sent.id, finished_at: new Date().toISOString(), error_message: null }).eq('idempotency_key', testKey);
        if (logUpdateError) throw new Error('Testmejlet skickades, men leveransloggen kunde inte uppdateras. Kontrollera Resend-historiken innan du testar igen.');
        const { error: approvalError } = await sb.from('app_settings').upsert({ key: MORNING_SETTING_KEYS.tested, value: recipientsFingerprint(settings.oliver, settings.affe) });
        if (approvalError) return fail('Testmejlet skickades till båda, men aktiveringsgodkännandet kunde inte sparas. Kontrollera databasen och kör om testet.', 503);
        return response({ ok: true, message: 'Testmejl skickat till båda mottagarna.', analysisSource: sent.analysisSource });
      } catch (e: any) {
        const message = String(e?.message || 'Testutskicket misslyckades.').slice(0, 350);
        await sb.from('email_dispatch_logs').update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() }).eq('idempotency_key', testKey);
        return fail(message, 502);
      }
    }
    return fail('Okänd åtgärd.');
  } catch (e: any) {
    const message = String(e?.message || 'Serverfel.');
    return fail(message.includes('email_dispatch_logs') ? 'Kör supabase/migration-morning-briefing.sql först.' : message, 503);
  }
}
