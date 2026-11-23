import { describe, expect, it } from 'vitest';
import { buildShareText, buildWeeklyDigest } from '@/lib/report';
import { fmtMoney } from '@/lib/calc';
import type { AuthUser, Entry, Goals, TeamMember } from '@/lib/types';

const GOALS: Goals = { daily_sales: 7, daily_tb: 3000, weekly_sales: 35, weekly_tb: 15000, monthly_sales: 140, monthly_tb: 60000 };
const ME: AuthUser = { username: 'affe', display_name: 'Affe', role: 'manager' };

function member(username: string, role: 'seller' | 'manager', rows: [string, number, number][], split?: [number, number]): { username: string; display_name: string; role: string; goals: Goals; entries: Entry[] } {
  return {
    username,
    display_name: username[0].toUpperCase() + username.slice(1),
    role,
    goals: GOALS,
    entries: rows.map(([d, sales, tb], i) => ({
      id: i + 1, seller_username: username, entry_date: d, sales, tb_sek: tb, hours: null, note: null, rating: null, mood: null, tags: [],
      brandkollen_sales: split ? split[0] : null, konsumentkollen_sales: split ? split[1] : null, brandkollen_tb: null, konsumentkollen_tb: null,
    })),
  };
}

describe('buildShareText — paste-ready month report', () => {
  it('ranks sellers only, includes team totals, goal, projection and the sender', () => {
    const members = [
      member('stille', 'seller', [['2026-11-02', 10, 4000], ['2026-11-03', 8, 3200]]),
      member('kvist', 'seller', [['2026-11-02', 5, 2000]]),
      member('affe', 'manager', [['2026-11-02', 99, 99000]]), // managers never rank
    ];
    const text = buildShareText('2026-11', members, ME, '2026-11-23');
    expect(text).toContain('📊 LABEL LAB — november 2026');
    expect(text).toContain(`🥇 Stille — 18 sälj · ${fmtMoney(7200)} TB`);
    expect(text).toContain('🥈 Kvist — 5 sälj');
    expect(text).not.toContain('99 sälj'); // the manager's own row never appears
    expect(text).toContain('Teamet: 23 sälj'); // managers' rows are excluded from the sales team
    expect(text).toContain('Mål: 280 sälj');
    expect(text).toContain('Prognos:');
    expect(text).toContain('Arbetsdagar kvar:');
    expect(text).toContain('Genererad 23 november 2026 av Affe · Label Lab');
    expect(text).not.toMatch(/[*_#]/); // no markdown — pastes cleanly into WhatsApp
  });

  it('says so when nothing is registered instead of printing zeros', () => {
    const text = buildShareText('2026-11', [member('stille', 'seller', [])], ME, '2026-11-23');
    expect(text).toContain('Inga registreringar denna månad ännu.');
  });

  it('accepts the public team shape the client has (no notes/mood)', () => {
    const team: TeamMember[] = [
      { username: 'stille', display_name: 'Stille', role: 'seller', goals: GOALS, entries: [{ id: 1, seller_username: 'stille', entry_date: '2026-11-02', sales: 3, tb_sek: 900, hours: null, brandkollen_sales: null, konsumentkollen_sales: null, brandkollen_tb: null, konsumentkollen_tb: null }] },
    ];
    const text = buildShareText('2026-11', team as any, ME, '2026-11-23');
    expect(text).toContain('Stille — 3 sälj');
  });
});

describe('buildWeeklyDigest — week letter for managers', () => {
  const WED = '2026-11-25';
  const twoSellers = () => [
    member('stille', 'seller', [['2026-11-23', 5, 2000], ['2026-11-24', 7, 2800], ['2026-11-25', 3, 1200]]),
    member('kvist', 'seller', [['2026-11-23', 5, 2000], ['2026-11-24', 4, 1600]]),
  ];

  it('names the leader, days won, registration gaps and exactly one focus', () => {
    const text = buildWeeklyDigest(twoSellers(), ME, WED);
    expect(text).toContain('📬 LABEL LAB — veckobrev v.48 (23–29 nov)');
    expect(text).toContain(`🏆 Veckans ledare: Stille — 15 sälj · ${fmtMoney(6000)} TB`);
    expect(text).toContain(`🥈 Kvist — 9 sälj · ${fmtMoney(3600)} TB · 2/3 dagar`);
    expect(text).toContain(`Teamet: 24 sälj · ${fmtMoney(9600)} TB`);
    expect(text).toContain('Veckomål: 70 sälj → 34 % uppfyllt');
    expect(text).toContain('Dagar vunna: Stille 1 · Kvist 0');
    expect(text).toContain('Registrering: Stille 3/3 · Kvist 2/3 (ons saknas)');
    expect(text).toContain('💡 Fokus nästa vecka: Få in alla registreringar – Kvist saknar 1 dag denna vecka.');
    expect(text).toContain('Skickad av Affe · Label Lab');
    expect(text).not.toMatch(/[*_#]/);
  });

  it('calls a tie a tie and compares with the same days last week', () => {
    const members = [
      member('stille', 'seller', [['2026-11-23', 5, 2000], ['2026-11-16', 2, 800]]),
      member('kvist', 'seller', [['2026-11-23', 5, 2000], ['2026-11-16', 2, 800]]),
    ];
    const text = buildWeeklyDigest(members, ME, '2026-11-24');
    expect(text).toContain('🤝 Oavgjort i toppen: Stille & Kvist — 5 sälj');
    expect(text).toContain('Samma dagar förra veckan: 4 sälj (+150 %)');
    expect(text).toContain('Fokus nästa vecka: Få in alla registreringar'); // Tue 24 is not registered by either seller
  });

  it('focus moves on to pace, product mix and finally "håll takten"', () => {
    const slow = [
      member('stille', 'seller', [['2026-11-23', 3, 1200], ['2026-11-24', 3, 1200]]),
      member('kvist', 'seller', [['2026-11-23', 3, 1200], ['2026-11-24', 3, 1200]]),
    ];
    expect(buildWeeklyDigest(slow, ME, '2026-11-24')).toContain('Fokus nästa vecka: Dagsmålet är 7 sälj – teamets snitt ligger på 3 per arbetsdag.');

    const onlyBk = [
      member('stille', 'seller', [['2026-11-23', 7, 2800], ['2026-11-24', 7, 2800]], [7, 0]),
      member('kvist', 'seller', [['2026-11-23', 7, 2800], ['2026-11-24', 7, 2800]], [7, 0]),
    ];
    expect(buildWeeklyDigest(onlyBk, ME, '2026-11-24')).toContain('Fokus nästa vecka: Lägg Konsumentkollen på fler kunder – andelen av de uppdelade säljen är 0 %.');

    const mixed = [
      member('stille', 'seller', [['2026-11-23', 7, 2800], ['2026-11-24', 7, 2800]], [4, 3]),
      member('kvist', 'seller', [['2026-11-23', 7, 2800], ['2026-11-24', 7, 2800]], [4, 3]),
    ];
    expect(buildWeeklyDigest(mixed, ME, '2026-11-24')).toContain('Fokus nästa vecka: Håll takten – veckomålet är inom räckhåll.');
    expect(buildWeeklyDigest([member('stille', 'seller', [])], ME, '2026-11-24')).toContain('Inga registreringar denna vecka ännu.');
  });
});
