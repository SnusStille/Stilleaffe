import type { Entry, Goals } from './types';
import { f1, fmt, fmtMoney, personalRecord, weekToDate, weeklySeries, MonthStats, teamStats, type LeaderRow } from './calc';

export function sellerEvidence(stats: MonthStats, todayRow: Entry | undefined, goals: Goals) {
  const todayEvidence = todayRow
    ? `${todayRow.sales} av ${goals.daily_sales} sälj`
    : 'ingen registrering (behandla inte som noll)';
  const monthEvidence = stats.days
    ? `${stats.sales} registrerade sälj av ${goals.monthly_sales}; ${stats.registeredWorkdays} av ${stats.elapsedWorkdays} arbetsdagar registrerade`
    : 'inga registreringar hittills';
  const paceEvidence = !stats.paceReliable
    ? `kan inte bedömas säkert (${stats.registeredWorkdays}/${stats.elapsedWorkdays} registrerade vardagar)`
    : `${stats.aheadOfPlan == null ? 0 : stats.aheadOfPlan < 0 ? `${f1(Math.abs(stats.aheadOfPlan))} sälj efter` : `${f1(stats.aheadOfPlan)} sälj före`} planen`;
  return { todayEvidence, monthEvidence, paceEvidence };
}

export function sellerPlanPrompt(stats: MonthStats, todayRow: Entry | undefined, goals: Goals): string {
  const { todayEvidence, monthEvidence, paceEvidence } = sellerEvidence(stats, todayRow, goals);
  const required = stats.requiredPerRemaining != null ? `cirka ${f1(stats.requiredPerRemaining)} sälj per arbetsdag` : stats.goalGap ? `${fmt(stats.goalGap)} sälj kvar` : 'målet är nått';
  return `Gör en kort, konkret och respektfull plan för mig som säljare. Dagens registrering: ${todayEvidence}. Månaden: ${monthEvidence}. Månadstakt: ${paceEvidence}. Återstående arbetsdagar: ${stats.remainingWorkdays}. Nödvändig takt: ${required}. Om dagens data saknas eller registreringstäckningen är ofullständig ska du säga det tydligt; behandla inte frånvaro som noll och dra ingen säker slutsats om månadstakten. Ge tre korta steg, uppmärksamma också något jag gör bra, och hitta inte på fakta.`;
}

export function managerTeamPrompt(team: ReturnType<typeof teamStats>): string {
  const lines = team.rows.map(
    (r) =>
      `${r.display_name}: ${r.sales} sälj, ${fmtMoney(r.tb)} TB, ${r.registeredWorkdays}/${r.elapsedWorkdays} vardagar registrerade, mål ${r.goalPct}%, takt ${r.avgPerWorkday == null ? 'okänd' : f1(r.avgPerWorkday)} sälj/arbetsdag`,
  );
  return `Jag är chef. Utifrån teamets faktiska registreringar denna månad — ${lines.join('; ')} — identifiera vem som behöver stöd, hitta trender och föreslå konkreta, respektfulla uppföljningar. Om data saknas, säg det utan att behandla frånvaro som noll. Hitta inte på statistik och föreslå inga ändringar av säljsiffror eller mål.`;
}

export function coachHeadline(stats: MonthStats, todayRow: Entry | undefined, goals: Goals): { title: string; copy: string } {
  if (!stats.days) return { title: 'Börja med dagens första registrering', copy: 'När dagens siffror är registrerade kan coachen jämföra din takt med målet och ge konkreta råd.' };
  if (!todayRow) return { title: 'Dagens siffror saknas', copy: 'Dagens resultat är inte registrerat, så dagsmålet bedöms inte som noll. Lägg in dagens siffror för en rättvis dagsbild.' };
  if (!stats.paceReliable) return { title: 'Komplettera registreringarna', copy: `Månadstakten kan inte bedömas säkert än: ${stats.registeredWorkdays} av ${stats.elapsedWorkdays} arbetsdagar har en registrering.` };
  if (stats.aheadOfPlan != null && stats.aheadOfPlan < -Math.max(2, goals.monthly_sales * 0.04)) {
    return {
      title: 'Dags att steppa upp',
      copy:
        stats.remainingWorkdays > 0
          ? `Du ligger ${f1(Math.abs(stats.aheadOfPlan))} sälj efter månadstakten. Med ${stats.remainingWorkdays} arbetsdagar kvar behöver du cirka ${f1(stats.requiredPerRemaining || 0)} sälj per arbetsdag för att nå målet.`
          : `Du ligger ${f1(Math.abs(stats.aheadOfPlan))} sälj efter månadstakten. Månadens arbetsdagar är slut och ${fmt(stats.goalGap)} sälj saknas till målet.`,
    };
  }
  if (stats.aheadOfPlan != null && stats.aheadOfPlan > 2) return { title: 'Du ligger före planen', copy: `Du ligger ${f1(stats.aheadOfPlan)} sälj före månadstakten. Behåll rutinen — målet är ${fmt(goals.monthly_sales)} sälj den här månaden.` };
  return { title: 'Du är i fas — håll trycket', copy: `Tempot ligger nära planen. Dagens mål är ${goals.daily_sales} sälj; du har registrerat ${todayRow.sales} hittills.` };
}

export function paceText(stats: MonthStats): string {
  if (!stats.paceReliable) return `Underlag ${stats.registeredWorkdays}/${stats.elapsedWorkdays} vardagar`;
  if (stats.remainingWorkdays <= 0) return stats.goalGap ? `${fmt(stats.goalGap)} sälj kvar` : 'Månadsmålet nått';
  return `${f1(stats.requiredPerRemaining || 0)} sälj/arbetsdag behövs`;
}

export function rankOf(rows: LeaderRow[], username: string) {
  return rows.find((r) => r.username === username)?.rank ?? null;
}

/** Short, evidence-bound prompts behind the quick-action chips in the coach panel. */
export function motivatePrompt(stats: MonthStats, todayRow: Entry | undefined, goals: Goals): string {
  const { todayEvidence, monthEvidence, paceEvidence } = sellerEvidence(stats, todayRow, goals);
  return `Ge mig en kort, ärlig pep-talk (max 6 meningar) utifrån mina faktiska siffror — idag: ${todayEvidence}; månaden: ${monthEvidence}; takt: ${paceEvidence}. Nämn något konkret jag gjort bra, en sak att fokusera på resten av dagen och avsluta med en tydlig nästa åtgärd. Inga påhittade siffror, ingen faktion.`;
}

export function weekReviewPrompt(entries: Entry[], goals: Goals): string {
  const weeks = weeklySeries(entries, 4).map((w) => `${w.label}: ${w.sales} sälj på ${w.days} registrerade dagar`);
  const wow = weekToDate(entries);
  const best = personalRecord(entries);
  const wowText = wow.pct == null ? 'vecka mot vecka kan inte jämföras säkert (för få registrerade dagar)' : `${wow.pct >= 0 ? '+' : ''}${wow.pct}% mot samma veckodag förra veckan`;
  return `Analysera mina senaste fyra veckor: ${weeks.join('; ')}. Vecka mot vecka: ${wowText}. Personligt rekord: ${best ? `${best.sales} sälj (${best.entry_date})` : 'inget ännu'}. Dagsmål: ${goals.daily_sales}. Identifiera mönster (vilka veckodagar/dagar som är starka eller svaga), säg vad jag ska fortsätta med och ge tre konkreta förbättringar för nästa vecka. Behandla saknade registreringar som saknade, inte som noll, och hitta inte på fakta.`;
}

export function supportPrompt(team: ReturnType<typeof teamStats>): string {
  const lines = team.rows.map(
    (r) => `${r.display_name}: ${r.sales} sälj, mål ${r.goalPct}%, ${r.registeredWorkdays}/${r.elapsedWorkdays} vardagar registrerade${r.avgPerWorkday == null ? '' : `, ${f1(r.avgPerWorkday)} sälj/arbetsdag`}`,
  );
  return `Jag är chef. Utifrån teamets registreringar denna månad — ${lines.join('; ')} — säg kort och konkret: (1) vem behöver mest stöd just nu och varför, (2) vem förtjänar en beröm, (3) en respektfull fråga jag kan ställa i nästa uppföljningssamtal till varje säljare. Om underlaget är tunt, säg det istället för att gissa. Föreslå inga ändringar av säljsiffror eller mål.`;
}
