import { GUIDE_SECTIONS } from './content';
import type { GuideCategory, GuideOverride, GuideSection, GuideService } from './types';

export * from './types';
export * from './content';

export type OverrideMap = Record<string, GuideOverride>;

export function effectiveSections(overrides: OverrideMap = {}): GuideSection[] {
  return GUIDE_SECTIONS.map((s) => {
    const o = overrides[s.id]?.body;
    if (!o) return s;
    return {
      ...s,
      title: o.title ?? s.title,
      summary: o.summary ?? s.summary,
      body: o.body ?? s.body,
      bullets: o.bullets ?? s.bullets,
      source: o.source ?? s.source,
      sourceNote: o.sourceNote ?? s.sourceNote,
      quick: o.quick ?? s.quick,
    };
  });
}

export type GuideFilter = {
  service: GuideService | 'all';
  category: GuideCategory | 'all';
  query: string;
};

export function filterSections(sections: GuideSection[], filter: GuideFilter): GuideSection[] {
  const q = filter.query.trim().toLowerCase();
  return sections.filter((s) => {
    if (filter.service !== 'all' && s.service !== filter.service) return false;
    if (filter.category !== 'all' && s.category !== filter.category) return false;
    if (q) {
      const hay = [s.title, s.summary, s.body, ...(s.bullets || []), s.sourceNote].filter(Boolean).join(' ').toLowerCase();
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  });
}

export function countByCategory(sections: GuideSection[]): Partial<Record<GuideCategory, number>> {
  const out: Partial<Record<GuideCategory, number>> = {};
  for (const s of sections) out[s.category] = (out[s.category] || 0) + 1;
  return out;
}

export function countByService(sections: GuideSection[]): Record<GuideService, number> {
  return sections.reduce(
    (acc, s) => {
      acc[s.service] = (acc[s.service] || 0) + 1;
      return acc;
    },
    { brandkollen: 0, konsumentkollen: 0, gemensamt: 0 },
  );
}

export const FAVORITES_KEY = 'll_guide_favorites';
export const RECENT_KEY = 'll_guide_recent';

export function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function writeFavorites(ids: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {}
}

export function readRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function pushRecent(id: string): string[] {
  const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
