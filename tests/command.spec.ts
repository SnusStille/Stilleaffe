import { describe, expect, it } from 'vitest';
import { buildCommands, commandsFor, fold, scoreCommand, searchCommands, type Command } from '@/lib/command';
import { ACHIEVEMENTS } from '@/lib/calc';

const c = (id: string, label: string, keywords = ''): Command => ({ id, label, keywords, group: 'Navigera', icon: 'overview', action: { type: 'navigate', href: '/' } });

describe('command palette search', () => {
  it('fold strips diacritics and punctuation', () => {
    expect(fold('Månadsresultat')).toBe('manadsresultat');
    expect(fold('  Åtgärder / Inställningar! ')).toBe('atgarder installningar');
    expect(fold('AI-coach')).toBe('ai coach');
  });

  it('ranks prefix matches above substring and fuzzy matches', () => {
    const m = c('m', 'Månadsresultat');
    const k = c('k', 'Kommentarer', 'månad');
    const f = c('f', 'Inställningar', 'm n a d');
    expect(scoreCommand('månad', m)).toBeGreaterThan(scoreCommand('månad', k));
    expect(scoreCommand('månad', k)).toBeGreaterThan(0);
    expect(scoreCommand('månad', f)).toBe(0);
    expect(scoreCommand('mnad', m)).toBeGreaterThan(0); // subsequence / fuzzy
  });

  it('returns nothing for unrelated queries and keeps order for empty query', () => {
    const list = [c('a', 'Översikt'), c('b', 'Team'), c('c', 'Spelguide')];
    expect(searchCommands('zzzz', list)).toEqual([]);
    expect(searchCommands('', list).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('every token must match', () => {
    const list = [c('a', 'Kopiera månadsrapport', 'dela whatsapp'), c('b', 'Månadsresultat')];
    expect(searchCommands('kopiera månad', list).map((x) => x.id)).toEqual(['a']);
  });

  it('built-in commands cover every page and respect roles', () => {
    const all = buildCommands();
    const hrefs = all.filter((x) => x.action.type === 'navigate').map((x) => (x.action as { href: string }).href);
    expect(hrefs.sort()).toEqual(['/', '/ai', '/comments', '/goals', '/guide', '/history', '/month', '/settings', '/stats', '/team']);
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    const seller = commandsFor(all, 'seller');
    const manager = commandsFor(all, 'manager');
    expect(seller.some((x) => x.action.type === 'register')).toBe(true);
    expect(manager.some((x) => x.action.type === 'register')).toBe(false);
    expect(manager.some((x) => x.action.type === 'quick-plus')).toBe(false);
  });

  it('search finds register, guide sections and settings by synonym', () => {
    const all = commandsFor(buildCommands(), 'seller');
    expect(searchCommands('spara', all).some((x) => x.action.type === 'register')).toBe(true);
    expect(searchCommands('invändning', all).some((x) => x.action.type === 'guide-search')).toBe(true);
    expect(searchCommands('ljud', all).some((x) => x.action.type === 'toggle-sound')).toBe(true);
    expect(searchCommands('mål', all).some((x) => x.id === 'nav:/goals')).toBe(true);
  });

  it('does not confuse achievement keys with command ids', () => {
    // Guards against accidental cross-imports: achievements are never commands.
    const ids = new Set(buildCommands().map((x) => x.id));
    for (const a of ACHIEVEMENTS) expect(ids.has(a.key)).toBe(false);
  });
});
