import { admin } from '@/lib/secrets';
import { getMorningMetrics, generateMorningAnalysis, renderMorningEmail, MORNING_FROM, type MorningMetrics } from '@/lib/morning-report';

export type MorningSettings = { oliver: string; affe: string; time: string; enabled: boolean; testedRecipients: string };
export const MORNING_SETTING_KEYS = {
  oliver: 'morning_oliver_email',
  affe: 'morning_affe_email',
  time: 'morning_report_time',
  enabled: 'morning_report_enabled',
  tested: 'morning_tested_recipients',
} as const;

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function recipientsFingerprint(oliver: string, affe: string) {
  return [normalizeEmail(oliver), normalizeEmail(affe)].sort().join('|');
}

export async function readMorningSettings(): Promise<MorningSettings> {
  const sb = admin();
  const { data, error } = await sb.from('app_settings').select('key,value')
    .in('key', Object.values(MORNING_SETTING_KEYS));
  if (error) throw new Error('Kunde inte läsa e-postinställningar.');
  const values: Record<string, string> = {};
  for (const row of data || []) values[row.key] = String(row.value || '');
  return {
    oliver: normalizeEmail(values[MORNING_SETTING_KEYS.oliver]),
    affe: normalizeEmail(values[MORNING_SETTING_KEYS.affe]),
    time: /^([01]\d|2[0-3]):00$/.test(values[MORNING_SETTING_KEYS.time] || '') ? values[MORNING_SETTING_KEYS.time] : '07:00',
    enabled: values[MORNING_SETTING_KEYS.enabled] === 'true',
    testedRecipients: values[MORNING_SETTING_KEYS.tested] || '',
  };
}
export async function writeMorningSetting(key: keyof typeof MORNING_SETTING_KEYS, value: string) {
  const sb = admin();
  const { error } = await sb.from('app_settings').upsert({ key: MORNING_SETTING_KEYS[key], value });
  if (error) throw new Error('Kunde inte spara e-postinställningen.');
}

export async function checkResendDomain() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return { configured: false, verified: false, message: 'RESEND_API_KEY saknas.' };
  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!response.ok) return { configured: true, verified: false, message: `Resend svarade ${response.status}; domänen kunde inte verifieras.` };
    const body: any = await response.json();
    const domain = (Array.isArray(body?.data) ? body.data : []).find((d: any) => String(d?.name || '').toLowerCase() === 'stilledev.se');
    if (domain?.status === 'verified') return { configured: true, verified: true, message: 'Domänen stilledev.se är verifierad hos Resend.' };
    return { configured: true, verified: false, message: domain ? `Resend-domänstatus: ${String(domain.status || 'okänd')}.` : 'stilledev.se hittades inte i det anslutna Resend-kontot.' };
  } catch {
    return { configured: true, verified: false, message: 'Kunde inte kontrollera Resend just nu.' };
  }
}

export async function loadMorningMetrics(reportDate?: string) {
  const sb = admin();
  const date = reportDate || new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const monthStart = date.slice(0, 7) + '-01';
  const from = new Date(`${monthStart}T12:00:00Z`);
  from.setUTCFullYear(from.getUTCFullYear() - 5);
  const since = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, '0')}-${String(from.getUTCDate()).padStart(2, '0')}`;
  const { data, error } = await sb.from('sales_entries')
    .select('id,entry_date,sales,tb_sek,hours,note,rating,mood,tags')
    .gte('entry_date', since).lte('entry_date', date).order('entry_date', { ascending: false }).limit(2000);
  if (error) throw new Error('Kunde inte läsa försäljningsdata från Supabase.');
  const rows = (data || []).map((r: any) => ({
    ...r, sales: Number(r.sales || 0), tb_sek: Number(r.tb_sek || 0),
    hours: r.hours == null ? null : Number(r.hours),
    rating: r.rating == null ? null : Number(r.rating),
    tags: Array.isArray(r.tags) ? r.tags : [],
  })).sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date));
  return { sb, metrics: getMorningMetrics(rows, date) };
}

export type PreparedMorningEmail = { subject: string; html: string; text: string; analysisSource: 'ai' | 'rules' };

export async function prepareMorningEmail(metrics: MorningMetrics): Promise<PreparedMorningEmail> {
  const analysis = await generateMorningAnalysis(metrics);
  const content = renderMorningEmail(metrics, analysis.text, analysis.source);
  return { ...content, analysisSource: analysis.source };
}

export async function sendMorningEmail(recipients: string[], content: PreparedMorningEmail, idempotencyKey: string) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) throw new Error('RESEND_API_KEY saknas.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: MORNING_FROM, to: recipients, subject: content.subject, html: content.html, text: content.text }),
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  let body: any = {};
  try { body = await response.json(); } catch {}
  if (!response.ok || !body?.id) {
    const detail = String(body?.message || body?.error?.message || '').slice(0, 260);
    throw new Error(`Resend kunde inte skicka rapporten (${response.status})${detail ? `: ${detail}` : '.'}`);
  }
  return { id: String(body.id), analysisSource: content.analysisSource };
}

export async function buildAndSendMorningEmail(recipients: string[], metrics: MorningMetrics, idempotencyKey: string) {
  const verification = await checkResendDomain();
  if (!verification.verified) throw new Error(verification.message);
  const content = await prepareMorningEmail(metrics);
  return sendMorningEmail(recipients, content, idempotencyKey);
}
