import { Row, fmt, fmtMoney, f1, today as stockholmToday } from '@/lib/calc';

export const MORNING_FROM = 'StilleAffe <noreply@stilledev.se>';
export const MORNING_TIERS = [
  { label: 'MINIMUM', value: 60_000, color: '#8b9aa5' },
  { label: 'TARGET', value: 80_000, color: '#58d4ab' },
  { label: 'BEAST MODE', value: 100_000, color: '#e3c279' },
] as const;

export type MorningMetrics = {
  date: string;
  monthLabel: string;
  rows: Row[];
  monthSales: number;
  monthTb: number;
  registeredDays: number;
  elapsedWorkdays: number;
  remainingWorkdays: number;
  planWorkdaysRemaining: number;
  totalWorkdays: number;
  completeness: number;
  avgTbPerSale: number | null;
  avgTbPerSaleBasis: 'period' | 'history' | 'none';
  dailyTbNeed: number;
  dailySalesNeed: number | null;
  planTbToDate: number;
  paceGap: number;
  pressure: 'ON TRACK' | 'CATCH UP' | 'HIGH PRESSURE' | 'TARGET HIT' | 'MONTH CLOSED';
  projection: number | null;
  todayRow: Row | null;
  bestDay: Row | null;
  bestTbDay: Row | null;
  nextTier: { label: string; value: number } | null;
};

function stockholmMonthDay(date: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function isWeekday(key: string) {
  const n = new Date(`${key}T12:00:00Z`).getUTCDay();
  return n >= 1 && n <= 5;
}
function monthDates(month: string) {
  const [y, m] = month.split('-').map(Number);
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}
function labelMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function getMorningMetrics(allRows: Row[], reportDate = stockholmToday()): MorningMetrics {
  const month = reportDate.slice(0, 7);
  const keys = monthDates(month);
  const first = keys[0];
  const last = keys[keys.length - 1];
  const monthRows = allRows.filter((r) => r.entry_date >= first && r.entry_date <= reportDate);
  const workdays = keys.filter(isWeekday);
  const elapsedWorkdays = workdays.filter((d) => d <= reportDate).length;
  const remainingWorkdays = workdays.filter((d) => d >= reportDate).length;
  const todayRow = allRows.find((r) => r.entry_date === reportDate) || null;
  const planWorkdaysRemaining = Math.max(0, remainingWorkdays - (todayRow && isWeekday(reportDate) ? 1 : 0));
  const monthSales = monthRows.reduce((n, r) => n + Number(r.sales || 0), 0);
  const monthTb = monthRows.reduce((n, r) => n + Number(r.tb_sek || 0), 0);
  const registeredDays = new Set(monthRows.filter((r) => isWeekday(r.entry_date)).map((r) => r.entry_date)).size;
  const completeness = elapsedWorkdays ? registeredDays / elapsedWorkdays : 0;
  const previousRows = allRows.filter((r) => r.entry_date < first && r.sales > 0);
  const previousSales = previousRows.reduce((n, r) => n + Number(r.sales), 0);
  const avgTbPerSale = monthSales > 0
    ? monthTb / monthSales
    : previousSales > 0 ? previousRows.reduce((n, r) => n + Number(r.tb_sek), 0) / previousSales : null;
  const avgTbPerSaleBasis = monthSales > 0 ? 'period' : previousSales > 0 ? 'history' : 'none';
  const target = MORNING_TIERS[1].value;
  const gap = Math.max(0, target - monthTb);
  const dailyTbNeed = planWorkdaysRemaining > 0 ? gap / planWorkdaysRemaining : 0;
  const dailySalesNeed = avgTbPerSale && avgTbPerSale > 0 ? Math.ceil(dailyTbNeed / avgTbPerSale) : null;
  const planTbToDate = workdays.length ? target * elapsedWorkdays / workdays.length : 0;
  const paceGap = monthTb - planTbToDate;
  const ratio = planWorkdaysRemaining > 0 && gap > 0 ? (gap / planWorkdaysRemaining) / (target / Math.max(workdays.length, 1)) : 0;
  const pressure = monthTb >= target ? 'TARGET HIT'
    : planWorkdaysRemaining === 0 ? 'MONTH CLOSED'
      : ratio <= 1.08 ? 'ON TRACK'
        : ratio <= 1.5 ? 'CATCH UP' : 'HIGH PRESSURE';
  const projection = elapsedWorkdays > 0 && registeredDays >= Math.min(3, elapsedWorkdays) && completeness >= 0.7
    ? registeredDays > 0 ? monthTb / registeredDays * workdays.length : null
    : null;
  const prior = allRows.filter((r) => r.entry_date < reportDate);
  const bestDay = prior.reduce<Row | null>((best, row) => !best || row.sales > best.sales ? row : best, null);
  const bestTbDay = prior.reduce<Row | null>((best, row) => !best || row.tb_sek > best.tb_sek ? row : best, null);
  const nextTier = MORNING_TIERS.find((t) => t.value > monthTb) || null;
  const [year, monthNum] = reportDate.slice(0, 7).split('-').map(Number);
  return {
    date: reportDate,
    monthLabel: labelMonth(`${year}-${String(monthNum).padStart(2, '0')}`),
    rows: monthRows,
    monthSales,
    monthTb,
    registeredDays,
    elapsedWorkdays,
    remainingWorkdays,
    planWorkdaysRemaining,
    totalWorkdays: workdays.length,
    completeness,
    avgTbPerSale,
    avgTbPerSaleBasis,
    dailyTbNeed,
    dailySalesNeed,
    planTbToDate,
    paceGap,
    pressure,
    projection,
    todayRow,
    bestDay,
    bestTbDay,
    nextTier,
  };
}

export function morningFallbackAnalysis(m: MorningMetrics) {
  const goalGap = Math.max(0, 80_000 - m.monthTb);
  const progress = Math.round(m.monthTb / 80_000 * 100);
  const state = m.monthTb >= 80_000
    ? `TARGET är uppnått med ${fmtMoney(m.monthTb - 80_000)} över.`
    : `${fmtMoney(goalGap)} återstår till TARGET (${progress}% registrerat).`;
  const daily = m.planWorkdaysRemaining > 0
    ? `Nödvändig takt: ${fmtMoney(m.dailyTbNeed)} per återstående produktionsdag${m.dailySalesNeed == null ? '' : `, cirka ${m.dailySalesNeed} avslut per dag vid ${m.avgTbPerSaleBasis === 'history' ? 'historiskt' : 'periodens'} TB-snitt`}.`
    : 'Inga produktionsdagar återstår i månaden.';
  const coverage = `Underlag: ${m.registeredDays}/${m.elapsedWorkdays} passerade vardagar registrerade.`;
  return `${state} ${daily} ${coverage} Dagens registrering: ${m.todayRow ? `${m.todayRow.sales} avslut och ${fmtMoney(m.todayRow.tb_sek)} TB.` : 'saknas; den behandlas inte som noll.'}`;
}

export async function generateMorningAnalysis(m: MorningMetrics) {
  const fallback = morningFallbackAnalysis(m);
  try {
    const { getKeys } = await import('@/lib/secrets');
    const keys = await getKeys();
    if (!keys.length) return { text: fallback, source: 'rules' as const };
    const context = {
      report_date: m.date,
      month: m.monthLabel,
      target_levels: MORNING_TIERS.map(({ label, value }) => ({ label, value, remaining: Math.max(0, value - m.monthTb), progress_pct: Math.round(m.monthTb / value * 100) })),
      actual: { sales: m.monthSales, tb: m.monthTb, registered_days: m.registeredDays, elapsed_workdays: m.elapsedWorkdays, remaining_workdays: m.remainingWorkdays, plan_workdays_remaining: m.planWorkdaysRemaining, completeness_pct: Math.round(m.completeness * 100) },
      avg_tb_per_sale_basis: m.avgTbPerSaleBasis,
      daily_required_tb_per_plan_workday: Math.round(m.dailyTbNeed), daily_required_sales_estimate: m.dailySalesNeed,
      even_pace_variance_tb: Math.round(m.paceGap), pressure: m.pressure,
      projection_tb: m.projection == null ? null : Math.round(m.projection),
      today: m.todayRow ? { registered: true, sales: m.todayRow.sales, tb: m.todayRow.tb_sek } : { registered: false },
      recent_days: m.rows.slice(-7).map((r) => ({ date: r.entry_date, sales: r.sales, tb: r.tb_sek })),
    };
    const payload = JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: 240,
      system: 'Skriv en kort, rak morgonanalys på svenska, högst 75 ord. Använd bara de angivna siffrorna. Hitta inte på resultat eller orsaker. Saknad registrering betyder okänd, inte noll. Skilj faktiska resultat från prognos och nämn datatäckning om den är under 70%. Avsluta med en konkret sak att fokusera på idag. Ingen tom pepp.',
      messages: [{ role: 'user', content: `Analysera följande rapportunderlag:\n${JSON.stringify(context)}` }],
    });
    let response: Response | null = null;
    for (const key of keys) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: payload, signal: AbortSignal.timeout(12_000),
      });
      if (response.status !== 401) break;
    }
    if (!response?.ok) return { text: fallback, source: 'rules' as const };
    const body: any = await response.json();
    const text = Array.isArray(body?.content) ? body.content.filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n').trim() : '';
    return text ? { text: text.slice(0, 1000), source: 'ai' as const } : { text: fallback, source: 'rules' as const };
  } catch {
    return { text: fallback, source: 'rules' as const };
  }
}

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
function progressBar(value: number, target: number, color: string) {
  const pct = Math.max(0, Math.min(100, Math.round(value / target * 100)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr><td style="height:7px;border-radius:8px;background:#252c33"><div style="width:${pct}%;height:7px;border-radius:8px;background:${color}"></div></td></tr></table>`;
}

export function renderMorningEmail(m: MorningMetrics, analysis: string, analysisSource: 'ai' | 'rules' | 'preview') {
  const target = 80_000;
  const targetGap = Math.max(0, target - m.monthTb);
  const todayTask = targetGap === 0
    ? 'TARGET är uppnått'
    : m.planWorkdaysRemaining === 0
      ? `${fmtMoney(targetGap)} återstår, men inga produktionsdagar finns kvar`
      : m.todayRow
        ? `Dagens rad är registrerad · ${fmtMoney(m.dailyTbNeed)} TB per kommande produktionsdag`
        : m.dailySalesNeed == null
          ? `${fmtMoney(m.dailyTbNeed)} TB i dagens plan`
          : `${m.dailySalesNeed} försäljningar och cirka ${fmtMoney(m.dailyTbNeed)} TB`;
  const projectionText = m.projection == null
    ? `Inte tillgänglig · ${m.registeredDays}/${m.elapsedWorkdays} passerade vardagar registrerade`
    : `${fmtMoney(m.projection)} · baserad på ${m.registeredDays} registrerade dagar`;
  const dateLabel = new Date(`${m.date}T12:00:00Z`).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Stockholm' });
  const targetCards = MORNING_TIERS.map((t) => `<tr><td style="padding:9px 0 2px;color:${t.color};font-size:11px;font-weight:800;letter-spacing:1px">${t.label}</td><td align="right" style="padding:9px 0 2px;color:#eef2f4;font-size:13px;font-weight:700">${fmtMoney(t.value)}</td></tr><tr><td colspan="2">${progressBar(m.monthTb, t.value, t.color)}</td></tr><tr><td style="padding:0;color:#9ba7b0;font-size:11px">${Math.round(m.monthTb / t.value * 100)}% uppnått</td><td align="right" style="padding:0;color:#c9d0d5;font-size:11px">${m.monthTb >= t.value ? 'UPPNÅTT' : `${fmtMoney(t.value - m.monthTb)} kvar`}</td></tr>`).join('');
  const analysisLabel = analysisSource === 'ai' ? 'AI MORNING ANALYSIS'
    : analysisSource === 'preview' ? 'FÖRHANDSVISNING · DATAGRUNDAD ANALYS'
      : 'DATAGRUNDAD ANALYS · AI EJ TILLGÄNGLIG';
  const safeAnalysis = esc(analysis).replace(/\n/g, '<br>');
  const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>StilleAffe Morning Briefing</title></head><body style="margin:0;background:#080b0e;color:#edf1f4;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080b0e;padding:26px 10px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border:1px solid #283039;border-radius:16px;background:#101419;overflow:hidden"><tr><td style="padding:24px 22px 17px;border-bottom:1px solid #283039"><div style="color:#58d4ab;font-size:10px;font-weight:800;letter-spacing:2px">STILLEAFFE <span style="color:#68747f">/ STILLEDEV</span></div><div style="margin-top:13px;color:#f3f5f6;font-size:23px;font-weight:800;letter-spacing:-.5px">Morning Sales Briefing</div><div style="margin-top:5px;color:#97a2ab;font-size:12px;text-transform:capitalize">${esc(dateLabel)} · ${esc(m.monthLabel)}</div></td></tr><tr><td style="padding:19px 22px 15px"><div style="color:#91a0aa;font-size:9px;font-weight:800;letter-spacing:1.5px">MORNING OVERVIEW</div><div style="margin-top:8px;color:#f1f4f5;font-size:31px;font-weight:800;letter-spacing:-1px">${fmtMoney(m.monthTb)}</div><div style="margin-top:4px;color:#a6b0b8;font-size:12px">${fmt(m.monthSales)} försäljningar · ${m.registeredDays} registrerade vardagar</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:15px"><tr><td width="50%" style="padding:10px 8px 10px 0;border-top:1px solid #283039"><div style="color:#84919b;font-size:9px;letter-spacing:1px">TARGET-FRAMSTEG</div><b style="display:block;margin-top:4px;color:#edf1f4;font-size:16px">${Math.round(m.monthTb / target * 100)}%</b></td><td width="50%" style="padding:10px 0 10px 10px;border-top:1px solid #283039"><div style="color:#84919b;font-size:9px;letter-spacing:1px">PRODUKTIONSDAGAR KVAR</div><b style="display:block;margin-top:4px;color:#edf1f4;font-size:16px">${m.planWorkdaysRemaining}</b></td></tr></table></td></tr><tr><td style="padding:0 22px 18px"><div style="padding:15px;border:1px solid #29323a;border-radius:11px;background:#0b0f12"><div style="color:#91a0aa;font-size:9px;font-weight:800;letter-spacing:1.5px">${esc(m.monthLabel).toUpperCase()} TARGETS · TB</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${targetCards}</table></div></td></tr><tr><td style="padding:0 22px 18px"><div style="color:#91a0aa;font-size:9px;font-weight:800;letter-spacing:1.5px">DAILY PERFORMANCE</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:7px"><tr><td style="padding:7px 0;color:#9ba7b0;font-size:11px">Tempo till TARGET</td><td align="right" style="padding:7px 0;color:#edf1f4;font-size:12px;font-weight:700">${fmtMoney(m.dailyTbNeed)}/produktionsdag</td></tr><tr><td style="padding:7px 0;color:#9ba7b0;font-size:11px">Dagens registrering</td><td align="right" style="padding:7px 0;color:#edf1f4;font-size:12px;font-weight:700">${m.todayRow ? `${m.todayRow.sales} avslut · ${fmtMoney(m.todayRow.tb_sek)}` : 'Ej registrerad · inte räknad som noll'}</td></tr><tr><td style="padding:7px 0;color:#9ba7b0;font-size:11px">Planavvikelse TB</td><td align="right" style="padding:7px 0;color:${m.paceGap >= 0 ? '#58d4ab' : '#efac8d'};font-size:12px;font-weight:700">${m.paceGap >= 0 ? '+' : '−'}${fmtMoney(Math.abs(m.paceGap))}</td></tr><tr><td style="padding:7px 0;color:#9ba7b0;font-size:11px">Prognos månadsslut</td><td align="right" style="padding:7px 0;color:#edf1f4;font-size:12px;font-weight:700">${esc(projectionText)}</td></tr><tr><td style="padding:7px 0;color:#9ba7b0;font-size:11px">Status</td><td align="right" style="padding:7px 0;color:#e4c87e;font-size:11px;font-weight:800;letter-spacing:.6px">${esc(m.pressure)}</td></tr></table></td></tr><tr><td style="padding:0 22px 18px"><div style="padding:15px;border-left:2px solid #58d4ab;border-radius:0 10px 10px 0;background:#0b1111"><div style="color:#58d4ab;font-size:9px;font-weight:800;letter-spacing:1.3px">${analysisLabel}</div><div style="margin-top:8px;color:#d9e0e3;font-size:12px;line-height:1.65">${safeAnalysis}</div></div></td></tr><tr><td style="padding:0 22px 21px"><div style="padding:16px;border:1px solid #3a473f;border-radius:12px;background:linear-gradient(135deg,#132019,#101419)"><div style="color:#9ca9a2;font-size:9px;font-weight:800;letter-spacing:1.4px">TODAY'S MISSION</div><div style="margin-top:7px;color:#f1f4f3;font-size:17px;font-weight:800">${esc(todayTask)}</div><div style="margin-top:6px;color:#b3bfba;font-size:11px;line-height:1.5">${m.todayRow ? `Dagens registrerade bidrag är ${fmtMoney(m.todayRow.tb_sek)}. Kvar till TARGET: ${fmtMoney(Math.max(0, target - m.monthTb))}; riktmärke för kommande produktionsdag: ${fmtMoney(m.dailyTbNeed)}.` : m.planWorkdaysRemaining > 0 ? `Dagens utfall saknas i databasen. Registrera det när dagens siffror finns; saknad data räknas inte som noll.` : 'Inga produktionsdagar återstår i månaden.'} ${m.nextTier ? `Nästa nivå: ${m.nextTier.label}, ${fmtMoney(Math.max(0, m.nextTier.value - m.monthTb))} kvar.` : 'Alla tre målnivåer är uppnådda.'}</div></div></td></tr><tr><td style="padding:13px 22px;border-top:1px solid #283039;color:#65717b;font-size:9px;line-height:1.5">Automatiserad rapport från StilleAffe · Europe/Stockholm<br>Endast registrerad Supabase-data. ${m.elapsedWorkdays > m.registeredDays ? `Datatäckning: ${m.registeredDays}/${m.elapsedWorkdays} passerade vardagar.` : 'Alla passerade vardagar hittills har en registrering.'}</td></tr></table></td></tr></table></body></html>`;
  const text = [
    `STILLEAFFE · MORNING SALES BRIEFING · ${dateLabel}`,
    `${m.monthLabel}: ${fmtMoney(m.monthTb)} TB · ${m.monthSales} försäljningar · ${m.registeredDays}/${m.elapsedWorkdays} passerade vardagar registrerade.`,
    `Mål: ${MORNING_TIERS.map((t) => `${t.label} ${fmtMoney(t.value)} (${Math.round(m.monthTb / t.value * 100)}%)`).join(' · ')}`,
    `Planriktmärke mot TARGET: ${todayTask}. ${m.todayRow ? `Registrerat idag: ${m.todayRow.sales} avslut, ${fmtMoney(m.todayRow.tb_sek)}.` : 'Dagens registrering saknas; ej räknad som noll.'}`,
    `Nödvändigt TB-tempo: ${fmtMoney(m.dailyTbNeed)}/produktionsdag. Prognos: ${m.projection == null ? 'ej tillgänglig, otillräckligt underlag' : fmtMoney(m.projection)}. Status: ${m.pressure}.`,
    `${analysisLabel}: ${analysis}`,
  ].join('\n\n');
  return { subject: `StilleAffe · ${m.monthLabel} · ${fmtMoney(m.monthTb)} TB`, html, text };
}
