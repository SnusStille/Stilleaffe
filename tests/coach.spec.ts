import { afterEach, describe, expect, it, vi } from 'vitest';
import { motivatePrompt, sellerPlanPrompt, supportPrompt, weekReviewPrompt } from '@/lib/coach';
import { buildMonthStats, teamStats, type Entry, type Goals } from '@/lib/calc';

const GOALS: Goals = { daily_sales: 7, daily_tb: 3000, weekly_sales: 35, weekly_tb: 15000, monthly_sales: 140, monthly_tb: 60000 };
const e = (d: string, s: number, u = 'stille'): Entry => ({ id: 1, seller_username: u, entry_date: d, sales: s, tb_sek: s * 400, hours: null, note: null, rating: null, mood: null, tags: [], brandkollen_sales: null, konsumentkollen_sales: null, brandkollen_tb: null, konsumentkollen_tb: null });

describe('coach prompts carry evidence, never invent numbers', () => {
  it('seller prompts state missing data explicitly', () => {
    const stats = buildMonthStats('stille', 'Stille', [], GOALS, '2026-11', '2026-11-23');
    const plan = sellerPlanPrompt(stats, undefined, GOALS);
    expect(plan).toContain('ingen registrering');
    expect(plan).toContain('behandla inte som noll');
    expect(motivatePrompt(stats, undefined, GOALS)).toContain('idag: ingen registrering');
  });
  afterEach(() => vi.useRealTimers());

  it('week review lists weeks and week-over-week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z')); // Friday
    const rows = [e('2026-11-16', 9), e('2026-11-17', 7), e('2026-11-09', 4), e('2026-11-10', 3)];
    const p = weekReviewPrompt(rows, GOALS);
    expect(p).toContain('W47');
    expect(p).toContain('+129% mot samma veckodag förra veckan');
    expect(p).toContain('Personligt rekord: 9 sälj');
  });
  it('manager support prompt names every seller and forbids goal changes', () => {
    const members = [
      { username: 'stille', display_name: 'Stille', role: 'seller', goals: GOALS, entries: [e('2026-11-17', 7)] },
      { username: 'kvist', display_name: 'Kvist', role: 'seller', goals: GOALS, entries: [] as Entry[] },
    ];
    const p = supportPrompt(teamStats(members, '2026-11', '2026-11-23'));
    expect(p).toContain('Stille:');
    expect(p).toContain('Kvist:');
    expect(p).toContain('Föreslå inga ändringar av säljsiffror eller mål');
  });
});
