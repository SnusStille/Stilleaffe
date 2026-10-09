-- Kör i Supabase → SQL Editor. Ingen Supabase Auth används; appen når databasen bara via servern (service role).
create table if not exists public.sales_entries (
  id bigint generated always as identity primary key,
  entry_date date not null unique,
  sales integer not null check (sales >= 0),
  tb_sek numeric(12,2) not null check (tb_sek >= 0),
  hours numeric(4,2) check (hours is null or (hours >= 0 and hours <= 24)),
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.goals (
  id integer primary key check (id = 1),
  daily_sales integer not null default 7,
  daily_tb numeric(12,2) not null default 3000,
  monthly_sales integer not null default 140,
  monthly_tb numeric(12,2) not null default 60000
);
insert into public.goals (id) values (1) on conflict do nothing;
create table if not exists public.app_settings (key text primary key, value text not null);
-- RLS på utan policies = anon/webbläsare kommer inte åt något. Bara service role (servern) gör det.
alter table public.sales_entries enable row level security;
alter table public.goals enable row level security;
alter table public.app_settings enable row level security;
revoke all on public.sales_entries, public.goals, public.app_settings from anon, authenticated;

-- Kommentarer mellan Stille (seller) och Affe (manager)
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  author text not null check (author in ('seller','manager')),
  entry_date date,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
