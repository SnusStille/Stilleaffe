export type GuideService = 'brandkollen' | 'konsumentkollen' | 'gemensamt';

export type GuideCategory =
  | 'manus'
  | 'oppning'
  | 'behov'
  | 'presentation'
  | 'fordelar'
  | 'paket'
  | 'avslut'
  | 'invandning'
  | 'konkurrens'
  | 'loop'
  | 'faq'
  | 'hemlarm'
  | 'id-kapning'
  | 'snabbvy';

export type GuideSource = 'official' | 'internal' | 'verify';

export type GuideSection = {
  id: string;
  service: GuideService;
  category: GuideCategory;
  title: string;
  summary?: string;
  body: string;
  bullets?: string[];
  source: GuideSource;
  sourceNote?: string;
  quick?: boolean;
  order: number;
};

export type GuideOverride = {
  body: Partial<Pick<GuideSection, 'title' | 'summary' | 'body' | 'bullets' | 'source' | 'sourceNote' | 'quick'>>;
  updated_by: string;
  updated_at: string;
};

export const SERVICE_LABEL: Record<GuideService, string> = {
  brandkollen: 'Brandkollen',
  konsumentkollen: 'Konsumentkollen',
  gemensamt: 'Gemensamt',
};

export const CATEGORY_LABEL: Record<GuideCategory, string> = {
  manus: 'Komplett manus',
  oppning: 'Öppning',
  behov: 'Behovsanalys',
  presentation: 'Tjänstepresentation',
  fordelar: 'Produktfördelar',
  paket: 'Paket och priser',
  avslut: 'Avslut',
  invandning: 'Invändningar',
  konkurrens: 'Konkurrenshantering',
  loop: 'Loop och avslut',
  faq: 'Vanliga frågor',
  hemlarm: 'Hemlarm',
  'id-kapning': 'ID-kapning',
  snabbvy: 'Snabbvy',
};

export const CATEGORY_ORDER: GuideCategory[] = [
  'snabbvy',
  'manus',
  'oppning',
  'behov',
  'id-kapning',
  'presentation',
  'fordelar',
  'paket',
  'avslut',
  'invandning',
  'konkurrens',
  'loop',
  'hemlarm',
  'faq',
];

export const SOURCE_LABEL: Record<GuideSource, string> = {
  official: 'Officiell produktinformation',
  internal: 'Internt säljargument',
  verify: 'Kontrollera med ledning',
};
