import type { IconName } from '@/components/icons';
import type { Role } from './types';

export type CommandAction =
  | { type: 'navigate'; href: string }
  | { type: 'register'; date?: string }
  | { type: 'quick-plus' }
  | { type: 'refresh' }
  | { type: 'copy-report' }
  | { type: 'toggle-sound' }
  | { type: 'toggle-motion' }
  | { type: 'shortcuts' }
  | { type: 'guide-search'; query: string }
  | { type: 'logout' };

export type CommandGroup = 'Navigera' | 'Åtgärder' | 'Inställningar' | 'Spelguide';

export type Command = {
  id: string;
  label: string;
  group: CommandGroup;
  icon: IconName;
  action: CommandAction;
  /** Extra words that should find this command but are not in the label. */
  keywords?: string;
  /** Role restriction — undefined means everyone. */
  role?: Role;
  /** Shown on the right side of the row (e.g. the page path or a shortcut). */
  hint?: string;
};

export const NAV_ITEMS: { href: string; label: string; icon: IconName; keywords: string }[] = [
  { href: '/', label: 'Översikt', icon: 'overview', keywords: 'hem dashboard start idag' },
  { href: '/month', label: 'Månadsresultat', icon: 'month', keywords: 'månad leaderboard ranking vinnare resultat' },
  { href: '/team', label: 'Team', icon: 'team', keywords: 'teamet säljare kollegor chef' },
  { href: '/guide', label: 'Spelguide', icon: 'guide', keywords: 'manus argumentation invändningar faq produkt fakta' },
  { href: '/settings', label: 'Inställningar', icon: 'settings', keywords: 'konto preferenser ljud haptik mål' },
  { href: '/history', label: 'Historik', icon: 'history', keywords: 'registreringar dagar tidigare' },
  { href: '/stats', label: 'Statistik', icon: 'stats', keywords: 'grafer trender produkter brandkollen konsumentkollen' },
  { href: '/goals', label: 'Mål', icon: 'goals', keywords: 'dagsmål veckomål månadsmål tb' },
  { href: '/comments', label: 'Kommentarer', icon: 'comments', keywords: 'chatt meddelanden uppföljning olästa' },
  { href: '/ai', label: 'AI-coach', icon: 'ai', keywords: 'coach chatt analys plan hjälp' },
];

export function buildCommands(): Command[] {
  const nav: Command[] = NAV_ITEMS.map((n) => ({
    id: `nav:${n.href}`,
    label: n.label,
    group: 'Navigera',
    icon: n.icon,
    action: { type: 'navigate', href: n.href },
    keywords: n.keywords,
  }));
  const actions: Command[] = [
    { id: 'act:register', label: 'Registrera dagens siffror', group: 'Åtgärder', icon: 'plus', action: { type: 'register' }, keywords: 'ny registrering lägg in spara dag', role: 'seller', hint: 'N' },
    { id: 'act:quick-plus', label: '+1 sälj idag', group: 'Åtgärder', icon: 'zap', action: { type: 'quick-plus' }, keywords: 'snabb plus lägg till en snabbt', role: 'seller' },
    { id: 'act:refresh', label: 'Uppdatera siffrorna', group: 'Åtgärder', icon: 'refresh', action: { type: 'refresh' }, keywords: 'ladda om refresh hämta', hint: 'R' },
    { id: 'act:copy-report', label: 'Kopiera månadsrapport', group: 'Åtgärder', icon: 'copy', action: { type: 'copy-report' }, keywords: 'dela whatsapp sammanfattning text rapport' },
    { id: 'act:shortcuts', label: 'Visa kortkommandon', group: 'Åtgärder', icon: 'keyboard', action: { type: 'shortcuts' }, keywords: 'hjälp tangentbord shortcuts', hint: '?' },
    { id: 'act:guide-bk', label: 'Sök Spelguide: Brandkollen', group: 'Spelguide', icon: 'guide', action: { type: 'guide-search', query: 'brandkollen' }, keywords: 'rök larm detektor' },
    { id: 'act:guide-kk', label: 'Sök Spelguide: Konsumentkollen', group: 'Spelguide', icon: 'guide', action: { type: 'guide-search', query: 'konsumentkollen' }, keywords: 'personnummer bevakning identitet' },
    { id: 'act:guide-inv', label: 'Sök Spelguide: Invändningar', group: 'Spelguide', icon: 'guide', action: { type: 'guide-search', query: 'invändning' }, keywords: 'motargument tvekan pris' },
    { id: 'set:sound', label: 'Slå av/på ljud', group: 'Inställningar', icon: 'volume', action: { type: 'toggle-sound' }, keywords: 'ljud effekt ping notis tyst' },
    { id: 'set:motion', label: 'Växla rörelse (Studio/Tyst)', group: 'Inställningar', icon: 'sparkles', action: { type: 'toggle-motion' }, keywords: 'animation 3d webgl effekt tyst' },
    { id: 'act:logout', label: 'Logga ut', group: 'Inställningar', icon: 'logout', action: { type: 'logout' }, keywords: 'logga ut session stäng' },
  ];
  return [...actions.slice(0, 2), ...nav, ...actions.slice(2)];
}

/** Lowercase + strip diacritics so "asjon" / "vasion" style typos still match å/ä/ö words. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}%+]+/gu, ' ')
    .trim();
}

/**
 * Ranking ladder (higher = better):
 *  120 exact label · 100 label prefix · 90 label word prefix · 65 label substring
 *  70 keyword word prefix · 40 keyword substring · 20 fuzzy subsequence (only for ≥4 chars, so short
 *  tokens like "m" never match everything).
 */
function tokenScore(token: string, haystack: string, label: string): number {
  if (!token) return 0;
  if (label === token) return 120;
  if (label.startsWith(token)) return 100;
  const labelWords = label.split(' ');
  if (labelWords.some((w) => w.startsWith(token))) return 90;
  const idx = label.indexOf(token);
  if (idx >= 0) return 65 - Math.min(idx, 15);
  if (haystack.split(' ').some((w) => w.startsWith(token))) return 70;
  if (haystack.includes(token)) return 40;
  if (token.length < 4) return 0;
  // Fuzzy subsequence: characters in order, not necessarily adjacent, within a bounded window.
  let li = 0;
  let span = 0;
  for (const ch of token) {
    const at = haystack.indexOf(ch, li);
    if (at < 0) return 0;
    span += at - li + 1;
    li = at + 1;
  }
  return span <= token.length * 2.5 ? 20 : 0;
}

/** 0 = no match. Higher is better. Every whitespace-separated token must match. */
export function scoreCommand(query: string, c: Command): number {
  const q = fold(query);
  if (!q) return 1;
  const label = fold(c.label);
  const haystack = fold(`${c.label} ${c.keywords || ''} ${c.group}`);
  const tokens = q.split(' ').filter(Boolean);
  let total = 0;
  for (const t of tokens) {
    const s = tokenScore(t, haystack, label);
    if (!s) return 0;
    total += s;
  }
  return total;
}

export function searchCommands(query: string, commands: Command[], limit = 9): Command[] {
  const q = fold(query);
  if (!q) {
    // Default order: actions first, then navigation, then the rest — but keep each group coherent.
    return commands.slice(0, limit);
  }
  return commands
    .map((c, i) => ({ c, s: scoreCommand(q, c), i }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.c);
}

export function commandsFor(commands: Command[], role: Role): Command[] {
  return commands.filter((c) => !c.role || c.role === role);
}
