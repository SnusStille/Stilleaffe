import { describe, expect, it } from 'vitest';
import { GUIDE_SECTIONS, SECTIONS_BY_ID, copyManuscript, copySection, searchSections, sectionsFor } from '@/lib/guide/content';
import { CATEGORY_LABEL, CATEGORY_ORDER, SERVICE_LABEL } from '@/lib/guide/types';
import { countByCategory, countByService, effectiveSections, filterSections } from '@/lib/guide';
import { GUIDE_SECTIONS as RAW } from '@/lib/guide/content';

describe('Spelguide content integrity', () => {
  it('has unique ids, valid categories/services/sources and non-empty bodies', () => {
    const ids = new Set<string>();
    for (const s of GUIDE_SECTIONS) {
      expect(ids.has(s.id), `duplicate id ${s.id}`).toBe(false);
      ids.add(s.id);
      expect(SERVICE_LABEL[s.service], s.id).toBeTruthy();
      expect(CATEGORY_LABEL[s.category], `${s.id} has invalid category ${s.category}`).toBeTruthy();
      expect(['official', 'internal', 'verify'], s.id).toContain(s.source);
      expect(s.body.trim().length, s.id).toBeGreaterThan(20);
    }
    expect(ids.size).toBe(GUIDE_SECTIONS.length);
  });

  it('covers both services with script, opening, needs, presentation, benefits, closing, objections, competition, looping and FAQ', () => {
    for (const service of ['brandkollen', 'konsumentkollen'] as const) {
      const cats = new Set(sectionsFor(service).map((s) => s.category));
      for (const required of ['manus', 'oppning', 'behov', 'presentation', 'fordelar', 'avslut', 'invandning', 'konkurrens', 'loop', 'faq']) {
        expect(cats.has(required as any), `${service} lacks ${required}`).toBe(true);
      }
      expect(sectionsFor(service).some((s) => s.category === 'invandning')).toBe(true);
    }
  });

  it('contains all 22 objections with clear headings (9 Brandkollen + 13 Konsumentkollen)', () => {
    const objections = GUIDE_SECTIONS.filter((s) => s.category === 'invandning');
    expect(objections).toHaveLength(22);
    expect(objections.filter((s) => s.service === 'brandkollen')).toHaveLength(9);
    expect(objections.filter((s) => s.service === 'konsumentkollen')).toHaveLength(13);
    for (const o of objections) expect(o.title).toMatch(/["“]/);
  });

  it('Konsumentkollen has its three main loops in the quick view', () => {
    const quick = GUIDE_SECTIONS.filter((s) => s.category === 'snabbvy');
    expect(quick.length).toBeGreaterThanOrEqual(1);
    const q = quick.find((s) => /tre huvudloopar/i.test(s.title))!;
    expect(q).toBeTruthy();
    expect(q.body + (q.bullets || []).join(' ')).toMatch(/1[\.\)]?/);
    expect(q.body + (q.bullets || []).join(' ')).toMatch(/2[\.\)]?/);
    expect(q.body + (q.bullets || []).join(' ')).toMatch(/3[\.\)]?/);
  });

  it('marks competitor and price claims as "Kontrollera med ledning" (verify)', () => {
    const competitors = GUIDE_SECTIONS.filter((s) => /UC|Mysafety|Verisure|Sector Alarm/i.test(s.title));
    expect(competitors.length).toBeGreaterThan(0);
    for (const c of competitors) expect(c.source, c.id).toBe('verify');
    const prices = GUIDE_SECTIONS.filter((s) => s.category === 'paket');
    for (const p of prices) expect(p.source, p.id).toBe('verify');
  });

  it('never presents police dispatch or guaranteed protection as fact', () => {
    // Every mention of "garanterar" must be a negation or an explicit "never claim" rule.
    const negation = /(inte|utan att|aldrig|Påstå)/i;
    for (const s of GUIDE_SECTIONS) {
      const lines = [s.title, s.summary, ...s.body.split('\n'), ...(s.bullets || [])].filter(Boolean) as string[];
      for (const line of lines) {
        if (/garanter/i.test(line)) expect(negation.test(line), `${s.id}: ${line}`).toBe(true);
        expect(/polisen (kommer|skickas|larmas)/i.test(line), `${s.id}: ${line}`).toBe(false);
      }
    }
  });

  it('search is case-insensitive and matches words across title, body and bullets', () => {
    expect(searchSections('invändning').length).toBeGreaterThan(0);
    expect(searchSections('SECTOR ALARM').some((s) => /sector alarm/i.test(s.title))).toBe(true);
    expect(searchSections('zzz-inget-träffar-det-här')).toHaveLength(0);
  });

  it('copy helpers produce readable plain text with headings', () => {
    const s = SECTIONS_BY_ID.get('bk-manus')!;
    const copied = copySection(s);
    expect(copied).toContain(s.title);
    expect(copied).toContain(s.body.slice(0, 40));
    const manuscript = copyManuscript('brandkollen');
    expect(manuscript).toContain('Brandkollen');
    expect(manuscript.length).toBeGreaterThan(s.body.length);
    expect(copyManuscript('konsumentkollen')).toContain('Konsumentkollen');
  });
});

describe('Spelguide overrides & filters', () => {
  it('effectiveSections applies manager overrides without mutating the original', () => {
    const before = RAW.find((s) => s.id === 'bk-oppning')!;
    const effective = effectiveSections({ 'bk-oppning': { body: { title: 'Ny rubrik' }, updated_by: 'affe', updated_at: 'now' } });
    const after = effective.find((s) => s.id === 'bk-oppning')!;
    expect(after.title).toBe('Ny rubrik');
    expect(after.body).toBe(before.body);
    expect(before.title).not.toBe('Ny rubrik');
  });

  it('filterSections combines service, category and multi-word query', () => {
    const f = filterSections(RAW, { service: 'konsumentkollen', category: 'invandning', query: 'tid' });
    expect(f.length).toBeGreaterThan(0);
    for (const s of f) {
      expect(s.service).toBe('konsumentkollen');
      expect(s.category).toBe('invandning');
    }
    expect(filterSections(RAW, { service: 'all', category: 'all', query: 'har inte tid' }).some((s) => /inte tid/i.test(s.title))).toBe(true);
    expect(filterSections(RAW, { service: 'brandkollen', category: 'all', query: '' }).every((s) => s.service === 'brandkollen')).toBe(true);
  });

  it('counts by category and service add up to the total', () => {
    const byCat = countByCategory(RAW);
    const bySvc = countByService(RAW);
    expect(Object.values(byCat).reduce((a, b) => a + (b || 0), 0)).toBe(RAW.length);
    expect(bySvc.brandkollen + bySvc.konsumentkollen + bySvc.gemensamt).toBe(RAW.length);
    for (const c of Object.keys(byCat)) expect(CATEGORY_ORDER).toContain(c);
  });
});
