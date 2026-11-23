export type Role = 'seller' | 'manager';

export type AuthUser = {
  username: string;
  display_name: string;
  role: Role;
};

export type Mood = 'fire' | 'great' | 'ok' | 'tired' | 'bad' | null;

export type Goals = {
  daily_sales: number;
  daily_tb: number;
  weekly_sales: number;
  weekly_tb: number;
  monthly_sales: number;
  monthly_tb: number;
};

export type Entry = {
  id: number;
  seller_username: string;
  entry_date: string;
  sales: number;
  tb_sek: number;
  hours: number | null;
  note: string | null;
  rating: number | null;
  mood: Mood;
  tags: string[];
  brandkollen_sales: number | null;
  konsumentkollen_sales: number | null;
  brandkollen_tb: number | null;
  konsumentkollen_tb: number | null;
  created_at?: string;
  updated_at?: string;
};

/** What another team member may see: no notes, mood, rating or tags. */
export type PublicEntry = Pick<
  Entry,
  | 'id'
  | 'seller_username'
  | 'entry_date'
  | 'sales'
  | 'tb_sek'
  | 'hours'
  | 'brandkollen_sales'
  | 'konsumentkollen_sales'
  | 'brandkollen_tb'
  | 'konsumentkollen_tb'
>;

export type TeamMember = {
  username: string;
  display_name: string;
  role: Role;
  goals: Goals;
  entries: PublicEntry[];
};

export type Activity = {
  id: number;
  actor_username: string | null;
  actor_name: string;
  event: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type CommentItem = {
  id: number;
  author_username: string;
  author_name: string;
  author_role: Role;
  body: string;
  entry_date: string | null;
  reaction: string | null;
  pinned: boolean;
  created_at: string;
};

export type DataPayload = {
  me: AuthUser;
  team: TeamMember[];
  myEntries: Entry[];
  activity: Activity[];
  now: string;
};
