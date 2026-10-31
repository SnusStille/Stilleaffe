export type MobileNavRole = 'seller' | 'manager';

const PRIMARY_BY_ROLE: Record<MobileNavRole, string[]> = {
  seller: ['mission', 'register', 'review', 'overview'],
  manager: ['mission', 'overview', 'review', 'comments'],
};

export function splitMobileNavigation<T extends { id: string }>(tabs: T[], role: MobileNavRole): { primary: T[]; more: T[] } {
  const primaryIds = PRIMARY_BY_ROLE[role];
  const primary = primaryIds.map((id) => tabs.find((tab) => tab.id === id)).filter((tab): tab is T => Boolean(tab));
  const primarySet = new Set(primary.map((tab) => tab.id));
  const more = tabs.filter((tab) => !primarySet.has(tab.id));
  return { primary, more };
}
