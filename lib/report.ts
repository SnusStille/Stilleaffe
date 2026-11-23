import { buildLeaderboard, fmt, fmtMoney, monthLabel, parseISO, teamStats, todayISO, weekMonday, weekdayShort, workdaysBetween, addDays, isWorkday, type AuthUser, type Entry, type Goals } from './calc';
import { weekDuel, weekRangeLabel } from './analysis';

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

const WEEK_RULE = '━━━━━━━━━━━━━━━━━━━━';

/**
 * Plain-text weekly digest for managers: who leads the week, who has gaps in
 * their registrations, how the week compares with the same days last week and
 * one rule-based focus for next week. Pastes cleanly into WhatsApp/Slack.
 */
export function buildWeeklyDigest(members: Member[], me: AuthUser, today = todayISO()): string {
  const sellers = members.filter((m) => m.role === 'seller');
  const monday = weekMonday(today);
  const lines: string[] = [`📬 LABEL LAB — veckobrev ${isoWeek(today)} (${weekRangeLabel(monday)})`, WEEK_RULE];
  if (!sellers.length) {
    lines.push('Inga säljare hittills.');
    lines.push(WEEK_RULE, `Skickad av ${me.display_name} · Label Lab`);
    return lines.join('\n');
  }

  const elapsed = workdaysBetween(monday, today);
  const inWeek = (m: Member, from: string) => m.entries.filter((e) => e.entry_date >= from && e.entry_date < addDays(from, 7) && workdaysBetween(from, e.entry_date) <= elapsed);
  const rows = sellers.map((m) => {
    const es = inWeek(m, monday);
    const sales = es.reduce((s, e) => s + Number(e.sales || 0), 0);
    const tb = es.reduce((s, e) => s + Number(e.tb_sek || 0), 0);
    const registered = new Set(es.filter((e) => isWorkday(e.entry_date)).map((e) => e.entry_date));
    const missing: string[] = [];
    for (let d = monday; d <= today; d = addDays(d, 1)) if (isWorkday(d) && !registered.has(d)) missing.push(weekdayShort(d).replace('.', ''));
    const prev = inWeek(m, addDays(monday, -7)).reduce((s, e) => s + Number(e.sales || 0), 0);
    return { m, sales, tb, registered: registered.size, missing, prev };
  });
  rows.sort((a, b) => b.sales - a.sales || b.tb - a.tb);
  const duel = weekDuel(members, today);
  const total = rows.reduce((s, r) => s + r.sales, 0);
  const totalTb = rows.reduce((s, r) => s + r.tb, 0);
  const prevTotal = rows.reduce((s, r) => s + r.prev, 0);

  const top = rows[0];
  const tied = rows.filter((r) => r.sales === top.sales && top.sales > 0);
  if (!top.sales) {
    lines.push('Inga registreringar denna vecka ännu.');
  } else if (tied.length > 1) {
    lines.push(`🤝 Oavgjort i toppen: ${tied.map((r) => r.m.display_name).join(' & ')} — ${fmt(top.sales)} sälj`);
  } else {
    lines.push(`🏆 Veckans ledare: ${top.m.display_name} — ${fmt(top.sales)} sälj · ${fmtMoney(top.tb)} TB`);
  }
  rows.slice(top.sales && tied.length <= 1 ? 1 : 0).forEach((r, i) => {
    if (!top.sales) return;
    const mark = i === 0 && tied.length <= 1 ? '🥈' : '•';
    lines.push(`${mark} ${r.m.display_name} — ${fmt(r.sales)} sälj · ${fmtMoney(r.tb)} TB · ${r.registered}/${elapsed} dagar`);
  });

  lines.push(WEEK_RULE);
  lines.push(`Teamet: ${fmt(total)} sälj · ${fmtMoney(totalTb)} TB`);
  const weekGoal = sellers.reduce((s, m) => s + Number(m.goals.weekly_sales || 0), 0);
  lines.push(weekGoal > 0 ? `Veckomål: ${fmt(weekGoal)} sälj → ${Math.min(999, Math.round((total / weekGoal) * 100))} % uppfyllt` : 'Veckomål: inte satt');
  if (duel && duel.sellers.length >= 2 && total > 0) lines.push(`Dagar vunna: ${duel.sellers.map((s, i) => `${s.display_name} ${duel.daysWon[i]}`).join(' · ')}`);
  lines.push(`Registrering: ${rows.map((r) => `${r.m.display_name} ${r.registered}/${elapsed}${r.missing.length ? ` (${r.missing.join(', ')} saknas)` : ''}`).join(' · ')}`);
  if (prevTotal > 0 && total > 0) {
    const d = Math.round(((total - prevTotal) / prevTotal) * 100);
    lines.push(`Samma dagar förra veckan: ${fmt(prevTotal)} sälj (${d >= 0 ? '+' : '−'}${Math.abs(d)} %)`);
  }

  // One focus, chosen by the most actionable rule first.
  const gaps = rows.filter((r) => r.missing.length > 0);
  const split = sellers.reduce((acc, m) => {
    for (const e of inWeek(m, monday)) {
      acc.b += Number(e.brandkollen_sales || 0);
      acc.k += Number(e.konsumentkollen_sales || 0);
    }
    return acc;
  }, { b: 0, k: 0 });
  const avgDay = elapsed > 0 && rows.length ? total / (elapsed * rows.length) : 0;
  const dailyGoal = sellers.reduce((s, m) => s + Number(m.goals.daily_sales || 0), 0) / sellers.length;
  let focus: string;
  if (gaps.length) focus = `Få in alla registreringar – ${gaps.map((r) => r.m.display_name).join(' och ')} saknar ${gaps.reduce((s, r) => s + r.missing.length, 0)} dag${gaps.reduce((s, r) => s + r.missing.length, 0) === 1 ? '' : 'ar'} denna vecka.`;
  else if (dailyGoal > 0 && avgDay > 0 && avgDay < dailyGoal * 0.9) focus = `Dagsmålet är ${fmt(dailyGoal)} sälj – teamets snitt ligger på ${avgDay.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} per arbetsdag.`;
  else if (split.b + split.k > 0 && split.k / (split.b + split.k) < 0.3) focus = `Lägg Konsumentkollen på fler kunder – andelen av de uppdelade säljen är ${Math.round((split.k / (split.b + split.k)) * 100)} %.`;
  else focus = 'Håll takten – veckomålet är inom räckhåll.';

  lines.push(`💡 Fokus nästa vecka: ${focus}`);
  lines.push(WEEK_RULE);
  lines.push(`Skickad av ${me.display_name} · Label Lab`);
  return lines.join('\n');
}

function isoWeek(iso: string): string {
  const d = parseISO(iso);
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `v.${week}`;
}
