-- ======================================================
-- Säljdashboard v7 — fullständigt, uppgraderingsbart schema
-- Kör i Supabase Dashboard → SQL Editor.
-- Stödjer både tom databas och uppgradering från v5/v6.
-- Säkert att köra om: upprepade körningar ändrar inte befintliga mål.
-- ======================================================

-- Säljregistreringar
create table if not exists public.sales_entries (
  id bigint generated always as identity primary key,
  entry_date date not null unique,
  sales integer not null check (sales >= 0),
  tb_sek numeric(12,2) not null check (tb_sek >= 0),
  hours numeric(4,2) check (hours is null or (hours >= 0 and hours <= 24)),
  note text,
  rating integer check (rating is null or (rating between 1 and 5)),
  mood text check (mood is null or mood in ('fire','ok','bad','great','tired')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Backfill schema columns that CREATE TABLE IF NOT EXISTS does not add to v5 tables.
alter table public.sales_entries add column if not exists hours numeric(4,2);
alter table public.sales_entries add column if not exists note text;
alter table public.sales_entries add column if not exists rating integer;
alter table public.sales_entries add column if not exists mood text;
alter table public.sales_entries add column if not exists tags text[] default '{}';
alter table public.sales_entries add column if not exists updated_at timestamptz not null default now();
update public.sales_entries set tags = '{}' where tags is null;
alter table public.sales_entries alter column tags set default '{}';
alter table public.sales_entries alter column tags set not null;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.sales_entries'::regclass AND conname = 'sales_entries_rating_check') THEN
    ALTER TABLE public.sales_entries ADD CONSTRAINT sales_entries_rating_check CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.sales_entries'::regclass AND conname = 'sales_entries_mood_check') THEN
    ALTER TABLE public.sales_entries ADD CONSTRAINT sales_entries_mood_check CHECK (mood IS NULL OR mood IN ('fire','ok','bad','great','tired'));
  END IF;
END $$;

-- Mål — skapa v7-kolumner FÖRE seed-raden (v5-tabeller saknar veckomål).
create table if not exists public.goals (
  id integer primary key check (id = 1),
  daily_sales integer not null default 7,
  daily_tb numeric(12,2) not null default 3000,
  monthly_sales integer not null default 140,
  monthly_tb numeric(12,2) not null default 60000,
  weekly_sales integer default 35,
  weekly_tb numeric(12,2) default 15000
);
alter table public.goals add column if not exists weekly_sales integer default 35;
alter table public.goals add column if not exists weekly_tb numeric(12,2) default 15000;
-- Seed only when missing; preserve the user's chosen goals on reruns.
insert into public.goals (id) values (1) on conflict (id) do nothing;
update public.goals set weekly_sales = 35 where weekly_sales is null;
update public.goals set weekly_tb = 15000 where weekly_tb is null;

-- Inställningar och lösenordsbyten
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings add column if not exists updated_at timestamptz not null default now();

-- Kommentarer
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  author text not null check (author in ('seller','manager')),
  entry_date date,
  body text not null,
  reaction text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.comments add column if not exists reaction text;
alter table public.comments add column if not exists pinned boolean not null default false;
-- v5 limited comments to 1,000 chars. v7 allows up to 2,000; replace the old check safely.
alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments drop constraint if exists comments_body_length_check;
alter table public.comments add constraint comments_body_length_check check (char_length(body) between 1 and 2000);

-- Aktivitetsflöde
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  author text not null check (author in ('seller','manager','system')),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Upplåsta märken, så firanden inte upprepas efter varje sidladdning
create table if not exists public.achievements (
  key text primary key,
  unlocked_at timestamptz not null default now()
);

-- RLS: inga publika policies; endast serverns service_role används.
alter table public.sales_entries enable row level security;
alter table public.goals enable row level security;
alter table public.app_settings enable row level security;
alter table public.comments enable row level security;
alter table public.activity_log enable row level security;
alter table public.achievements enable row level security;
revoke all on public.sales_entries, public.goals, public.app_settings, public.comments, public.activity_log, public.achievements from anon, authenticated;

-- Index
create index if not exists sales_entry_date_idx on public.sales_entries(entry_date desc);
create index if not exists comments_created_idx on public.comments(created_at desc);
create index if not exists activity_created_idx on public.activity_log(created_at desc);
create index if not exists achievements_key_idx on public.achievements(key);

-- updated_at triggers
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
drop trigger if exists trg_sales_set_updated on public.sales_entries;
create trigger trg_sales_set_updated before update on public.sales_entries for each row execute function public.set_updated_at();
drop trigger if exists trg_settings_set_updated on public.app_settings;
create trigger trg_settings_set_updated before update on public.app_settings for each row execute function public.set_updated_at();
