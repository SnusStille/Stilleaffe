-- =====================================================================
-- LABEL LAB · Sales Performance – komplett schema (målversion)
-- ---------------------------------------------------------------------
-- För NYA Supabase-projekt: kör hela filen i SQL Editor.
-- För BEFINTLIGA projekt (Stilleaffe v7/v8): kör
--   supabase/migrations/20261123000000_label_lab_multi_user.sql
-- i stället – den bevarar all historik och är upprepningsbar.
--
-- Lösenord och API-nycklar finns ALDRIG här – endast i Vercel Secrets.
-- =====================================================================

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_users (
  username text primary key check (username ~ '^[a-z0-9_-]{2,32}$'),
  display_name text not null,
  role text not null check (role in ('seller','manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.app_users (username, display_name, role) values
  ('stille',   'Stille',   'seller'),
  ('affe',     'Affe',     'manager'),
  ('fredland', 'Fredland', 'manager'),
  ('kvist',    'Kvist',    'seller')
on conflict (username) do nothing;

create table if not exists public.goals (
  id integer primary key check (id = 1),
  daily_sales integer not null default 7,
  daily_tb numeric(12,2) not null default 3000,
  monthly_sales integer not null default 140,
  monthly_tb numeric(12,2) not null default 60000,
  weekly_sales integer default 35,
  weekly_tb numeric(12,2) default 15000
);
insert into public.goals (id, daily_sales, daily_tb, weekly_sales, weekly_tb, monthly_sales, monthly_tb)
values (1, 7, 3000, 35, 15000, 140, 60000) on conflict (id) do nothing;

create table if not exists public.user_goals (
  username text primary key references public.app_users(username) on delete cascade,
  daily_sales integer not null default 7 check (daily_sales >= 0),
  daily_tb numeric(12,2) not null default 3000 check (daily_tb >= 0),
  weekly_sales integer not null default 35 check (weekly_sales >= 0),
  weekly_tb numeric(12,2) not null default 15000 check (weekly_tb >= 0),
  monthly_sales integer not null default 140 check (monthly_sales >= 0),
  monthly_tb numeric(12,2) not null default 60000 check (monthly_tb >= 0),
  updated_at timestamptz not null default now()
);
insert into public.user_goals (username) values ('stille') on conflict (username) do nothing;
insert into public.user_goals (username) values ('kvist') on conflict (username) do nothing;

create table if not exists public.sales_entries (
  id bigint generated always as identity primary key,
  seller_username text not null default 'stille' references public.app_users(username),
  entry_date date not null,
  sales integer not null check (sales >= 0),
  tb_sek numeric(12,2) not null check (tb_sek >= 0),
  hours numeric(4,2) check (hours is null or (hours >= 0 and hours <= 24)),
  note text,
  rating integer check (rating is null or (rating between 1 and 5)),
  mood text check (mood is null or mood in ('fire','ok','bad','great','tired')),
  tags text[] not null default '{}',
  brandkollen_sales integer check (brandkollen_sales is null or brandkollen_sales >= 0),
  konsumentkollen_sales integer check (konsumentkollen_sales is null or konsumentkollen_sales >= 0),
  brandkollen_tb numeric(12,2) check (brandkollen_tb is null or brandkollen_tb >= 0),
  konsumentkollen_tb numeric(12,2) check (konsumentkollen_tb is null or konsumentkollen_tb >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_entries_split_sales_check check (coalesce(brandkollen_sales, 0) + coalesce(konsumentkollen_sales, 0) <= sales),
  constraint sales_entries_split_tb_check check (coalesce(brandkollen_tb, 0) + coalesce(konsumentkollen_tb, 0) <= tb_sek + 0.01),
  unique (seller_username, entry_date)
);
create index if not exists sales_entries_date_idx on public.sales_entries (entry_date desc);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  author text not null default 'seller' check (author in ('seller','manager')),
  author_username text not null default 'stille' references public.app_users(username),
  entry_date date,
  body text not null check (char_length(body) between 1 and 2000),
  reaction text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_created_idx on public.comments (created_at desc);
create index if not exists comments_author_idx on public.comments (author_username);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  author text not null default 'system' check (author in ('seller','manager','system')),
  actor_username text references public.app_users(username),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_created_idx on public.activity_log (created_at desc);

create table if not exists public.sales_audit (
  id bigint generated always as identity primary key,
  entry_date date not null,
  action text not null check (action in ('create','update','delete')),
  author text not null default 'seller',
  actor_username text references public.app_users(username),
  seller_username text references public.app_users(username),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sales_audit_created_idx on public.sales_audit (created_at desc);
create index if not exists sales_audit_seller_idx on public.sales_audit (seller_username);

create table if not exists public.achievements (
  username text not null references public.app_users(username) on delete cascade,
  key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (username, key)
);

create table if not exists public.guide_overrides (
  id text primary key,
  body jsonb not null,
  updated_by text references public.app_users(username) on delete set null,
  updated_at timestamptz not null default now()
);

-- RLS: inga policies för anon/authenticated – servern använder service_role
-- och gör sin egen behörighetskontroll per förfrågan.
alter table public.app_settings     enable row level security;
alter table public.app_users        enable row level security;
alter table public.goals            enable row level security;
alter table public.user_goals       enable row level security;
alter table public.sales_entries    enable row level security;
alter table public.comments         enable row level security;
alter table public.activity_log     enable row level security;
alter table public.sales_audit      enable row level security;
alter table public.achievements     enable row level security;
alter table public.guide_overrides  enable row level security;

revoke all on public.app_settings, public.app_users, public.goals, public.user_goals, public.sales_entries,
              public.comments, public.activity_log, public.sales_audit, public.achievements, public.guide_overrides
from anon, authenticated;

grant usage on schema public to service_role;
grant all privileges on table public.app_settings, public.app_users, public.goals, public.user_goals, public.sales_entries,
                              public.comments, public.activity_log, public.sales_audit, public.achievements, public.guide_overrides
to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

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
drop trigger if exists trg_goals_set_updated on public.user_goals;
create trigger trg_goals_set_updated before update on public.user_goals for each row execute function public.set_updated_at();
drop trigger if exists trg_guide_set_updated on public.guide_overrides;
create trigger trg_guide_set_updated before update on public.guide_overrides for each row execute function public.set_updated_at();
