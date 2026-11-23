import { buildLeaderboard, fmt, fmtMoney, monthLabel, parseISO, teamStats, todayISO, type AuthUser, type Entry, type Goals } from './calc';

type Member = { username: string; display_name: string; role: string; goals: Goals; entries: Entry[] };

const MEDALS = ['🥇', '🥈', '🥉'];
const RULE = '━━━━━━━━━━━━━━━━━━━━';

/**
 * Plain-text month summary that pastes cleanly into WhatsApp/SMS/Slack.
 * No markdown, no numbers a reader can misinterpret: a missing day is never a zero.
 */
export function buildShareText(monthKey: string, members: Member[], me: AuthUser, today = todayISO()): string {
  const sellers = members.filter((m) => m.role === 'seller');
  const board = buildLeaderboard(members, monthKey, today);
  const team = teamStats(members, monthKey, today);
  const isCurrent = monthKey === today.slice(0, 7);

  const lines: string[] = [`📊 LABEL LAB — ${monthLabel(monthKey)}`, RULE];

  if (!board.length) {
    lines.push('Inga säljare hittills.');
  } else if (!board.some((r) => r.sales > 0)) {
    lines.push('Inga registreringar denna månad ännu.');
  } else {
    lines.push('Säljranking (bara säljare):');
    board.forEach((r, i) => {
      const mark = MEDALS[i] || `${i + 1}.`;
      const pace = r.avgPerWorkday == null ? '' : ` · ${r.avgPerWorkday.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} sälj/arbetsdag`;
      lines.push(`${mark} ${r.display_name} — ${fmt(r.sales)} sälj · ${fmtMoney(r.tb)} TB · ${r.goalPct} % av mål${pace}`);
    });
  }

  lines.push(RULE);
  lines.push(`Teamet: ${fmt(team.sales)} sälj · ${fmtMoney(team.tb)} TB`);
  lines.push(`Mål: ${fmt(team.goal)} sälj → ${team.goalPct} % uppfyllt`);
  const projection = team.projection == null ? 'Kan inte beräknas säkert ännu' : `${fmt(team.projection)} sälj${team.projectionReliable ? '' : ' (osäkert underlag)'}`;
  lines.push(`Prognos: ${projection}`);
  lines.push(isCurrent ? `Arbetsdagar kvar: ${team.remainingWorkdays}` : 'Månaden är slutförd');

  lines.push(RULE);
  const stamp = parseISO(today).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  lines.push(`Genererad ${stamp} av ${me.display_name} · Label Lab`);
  return lines.join('\n');
}
