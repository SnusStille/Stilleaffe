-- =====================================================================
-- LABEL LAB · Multi-user migration (repeatable)
-- ---------------------------------------------------------------------
-- Kör hela filen i Supabase Dashboard → SQL Editor. Den är idempotent:
-- den kan köras flera gånger utan att ändra befintliga registreringar,
-- mål eller konton som redan finns. Ta en backup (Dashboard → Database
-- → Backups) innan första körningen.
--
-- VIKTIGT · Kör migreringen och driftsätt den nya koden direkt efteråt.
-- Den gamla appen sparar med upsert på entry_date ensam och på
-- achievements.key ensam; de två unika nycklarna byts ut här, så gamla
-- appen kan läsa men inte spara från migrationen tills nya koden är live
-- (normalt 1–2 minuters byggtid). Gör det vid en lugn tidpunkt.
--
-- Vad den gör
--  1. app_users           – fyra konton: stille, affe, fredland, kvist
--  2. user_goals          – mål per säljare (Stilles nuvarande mål kopieras
--                           till Stille och används som Kvists startvärden)
--  3. sales_entries       – seller_username (all historik → stille), unikt
--                           per (seller_username, entry_date) i stället för
--                           globalt unikt datum, produktuppdelning BK/KK
--  4. comments, activity_log, sales_audit, achievements – användarattribut
--  5. guide_overrides     – chefsredigerade Spelguide-avsnitt
--  6. RLS på, anon/authenticated utan rättigheter, service_role beviljad
--  7. Gamla lösenordsrader i app_settings tas bort (lösenord hör till
--                           Vercel Secrets, aldrig databasen)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Grundtabeller som saknas på äldre installationer
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.sales_entries (
  id bigint generated always as identity primary key,
  entry_date date not null,
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
alter table public.sales_entries add column if not exists hours numeric(4,2);
alter table public.sales_entries add column if not exists note text;
alter table public.sales_entries add column if not exists rating integer;
alter table public.sales_entries add column if not exists mood text;
alter table public.sales_entries add column if not exists tags text[] default '{}';
alter table public.sales_entries add column if not exists updated_at timestamptz not null default now();
update public.sales_entries set tags = '{}' where tags is null;
alter table public.sales_entries alter column tags set default '{}';
alter table public.sales_entries alter column tags set not null;

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
insert into public.goals (id, daily_sales, daily_tb, weekly_sales, weekly_tb, monthly_sales, monthly_tb)
values (1, 7, 3000, 35, 15000, 140, 60000) on conflict (id) do nothing;

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  author text not null default 'seller' check (author in ('seller','manager')),
  entry_date date,
  body text not null,
  reaction text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.comments add column if not exists entry_date date;
alter table public.comments add column if not exists reaction text;
alter table public.comments add column if not exists pinned boolean not null default false;
-- Samma begränsning som i supabase/schema.sql (1–2000 tecken); ersätter ev. äldre check.
alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments drop constraint if exists comments_body_length_check;
alter table public.comments add constraint comments_body_length_check check (char_length(body) between 1 and 2000);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  author text not null default 'system' check (author in ('seller','manager','system')),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_audit (
  id bigint generated always as identity primary key,
  entry_date date not null,
  action text not null check (action in ('create','update','delete')),
  author text not null default 'seller',
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  key text primary key,
  unlocked_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1. Konton (lösenord finns ENDAST i Vercel Secrets – aldrig här)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 2. Mål per säljare
-- ---------------------------------------------------------------------
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
-- Kopiera nuvarande gemensamma mål (goals.id = 1) till Stille och Kvist,
-- endast om de inte redan har egna rader. Fredland/Affe är chefer och får inga.
insert into public.user_goals (username, daily_sales, daily_tb, weekly_sales, weekly_tb, monthly_sales, monthly_tb)
select 'stille', g.daily_sales, g.daily_tb, g.weekly_sales, g.weekly_tb, g.monthly_sales, g.monthly_tb
from public.goals g where g.id = 1
on conflict (username) do nothing;
insert into public.user_goals (username, daily_sales, daily_tb, weekly_sales, weekly_tb, monthly_sales, monthly_tb)
select 'kvist', coalesce(g.daily_sales, 7), coalesce(g.daily_tb, 3000), coalesce(g.weekly_sales, 35), coalesce(g.weekly_tb, 15000), coalesce(g.monthly_sales, 140), coalesce(g.monthly_tb, 60000)
from public.goals g where g.id = 1
on conflict (username) do nothing;
-- Om goals-tabellen är tom: säkerställ ändå att båda säljarna har startvärden.
insert into public.user_goals (username) values ('stille') on conflict (username) do nothing;
insert into public.user_goals (username) values ('kvist') on conflict (username) do nothing;

-- ---------------------------------------------------------------------
-- 3. sales_entries: identitet per rad + produktuppdelning
-- ---------------------------------------------------------------------
alter table public.sales_entries add column if not exists seller_username text;
-- All befintlig historik tillhör Stille (appen hade ett konto).
update public.sales_entries set seller_username = 'stille' where seller_username is null;
alter table public.sales_entries alter column seller_username set default 'stille';
alter table public.sales_entries alter column seller_username set not null;

alter table public.sales_entries add column if not exists brandkollen_sales integer check (brandkollen_sales is null or brandkollen_sales >= 0);
alter table public.sales_entries add column if not exists konsumentkollen_sales integer check (konsumentkollen_sales is null or konsumentkollen_sales >= 0);
alter table public.sales_entries add column if not exists brandkollen_tb numeric(12,2) check (brandkollen_tb is null or brandkollen_tb >= 0);
alter table public.sales_entries add column if not exists konsumentkollen_tb numeric(12,2) check (konsumentkollen_tb is null or konsumentkollen_tb >= 0);
-- Befintliga rader lämnas NULL = "Ej uppdelat". De kategoriseras aldrig automatiskt.

-- Produktuppdelningen får aldrig överstiga totalsiffrorna.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.sales_entries'::regclass and conname = 'sales_entries_split_sales_check') then
    alter table public.sales_entries add constraint sales_entries_split_sales_check
      check (coalesce(brandkollen_sales, 0) + coalesce(konsumentkollen_sales, 0) <= sales);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.sales_entries'::regclass and conname = 'sales_entries_split_tb_check') then
    alter table public.sales_entries add constraint sales_entries_split_tb_check
      check (coalesce(brandkollen_tb, 0) + coalesce(konsumentkollen_tb, 0) <= tb_sek + 0.01);
  end if;
end $$;

-- Datum ska vara unikt per säljare, inte globalt: två säljare kan registrera samma dag.
alter table public.sales_entries drop constraint if exists sales_entries_entry_date_key;
drop index if exists public.sales_entries_entry_date_key;
create unique index if not exists sales_entries_seller_date_uidx on public.sales_entries (seller_username, entry_date);
create index if not exists sales_entries_date_idx on public.sales_entries (entry_date desc);
create index if not exists sales_entries_seller_idx on public.sales_entries (seller_username, entry_date desc);

-- ---------------------------------------------------------------------
-- 4. Kommentarer – vem skrev
-- ---------------------------------------------------------------------
alter table public.comments add column if not exists author_username text;
update public.comments set author_username = case when author = 'manager' then 'affe' else 'stille' end
where author_username is null;
alter table public.comments alter column author_username set default 'stille';
alter table public.comments alter column author_username set not null;
create index if not exists comments_author_idx on public.comments (author_username);

-- ---------------------------------------------------------------------
-- 5. Aktivitetsflöde – vem gjorde det
-- ---------------------------------------------------------------------
alter table public.activity_log add column if not exists actor_username text;
update public.activity_log set actor_username = case when author = 'manager' then 'affe' when author = 'seller' then 'stille' else null end
where actor_username is null;
alter table public.activity_log alter column author set default 'system';
create index if not exists activity_actor_idx on public.activity_log (actor_username);

-- ---------------------------------------------------------------------
-- 6. Ändringshistorik – vem och vems registrering
-- ---------------------------------------------------------------------
alter table public.sales_audit add column if not exists actor_username text;
alter table public.sales_audit add column if not exists seller_username text;
update public.sales_audit set
  actor_username = coalesce(actor_username, case when author = 'manager' then 'affe' else 'stille' end),
  seller_username = coalesce(seller_username, 'stille')
where actor_username is null or seller_username is null;
create index if not exists sales_audit_seller_idx on public.sales_audit (seller_username);

-- ---------------------------------------------------------------------
-- 7. Märken per användare (tidigare globalt per nyckel)
-- ---------------------------------------------------------------------
alter table public.achievements add column if not exists username text;
update public.achievements set username = 'stille' where username is null;
alter table public.achievements alter column username set default 'stille';
alter table public.achievements alter column username set not null;
do $$
declare pk text;
begin
  select conname into pk from pg_constraint
  where conrelid = 'public.achievements'::regclass and contype = 'p' limit 1;
  if pk is not null and not exists (
    select 1 from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conname = pk and a.attname = 'username'
  ) then
    execute format('alter table public.achievements drop constraint %I', pk);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.achievements'::regclass and contype = 'p') then
    alter table public.achievements add primary key (username, key);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. Spelguide-överskrivningar (chefer)
-- ---------------------------------------------------------------------
create table if not exists public.guide_overrides (
  id text primary key,
  body jsonb not null,
  updated_by text references public.app_users(username) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. Inga lösenord i databasen
-- ---------------------------------------------------------------------
delete from public.app_settings where key in ('seller_password', 'manager_password');

-- ---------------------------------------------------------------------
-- 10. RLS och privilegier
-- ---------------------------------------------------------------------
alter table public.app_users        enable row level security;
alter table public.user_goals       enable row level security;
alter table public.sales_entries    enable row level security;
alter table public.goals            enable row level security;
alter table public.app_settings     enable row level security;
alter table public.comments         enable row level security;
alter table public.activity_log     enable row level security;
alter table public.sales_audit      enable row level security;
alter table public.achievements     enable row level security;
alter table public.guide_overrides enable row level security;

-- Ta bort ev. äldre policies som låter anon/authenticated läsa eller skriva.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('app_users','user_goals','sales_entries','goals','app_settings','comments','activity_log','sales_audit','achievements','guide_overrides')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

revoke all on public.app_users, public.user_goals, public.sales_entries, public.goals, public.app_settings,
              public.comments, public.activity_log, public.sales_audit, public.achievements, public.guide_overrides
from anon, authenticated;

grant usage on schema public to service_role;
grant all privileges on table public.app_users, public.user_goals, public.sales_entries, public.goals, public.app_settings,
                              public.comments, public.activity_log, public.sales_audit, public.achievements, public.guide_overrides
to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- ---------------------------------------------------------------------
-- 11. updated_at-trigger
-- ---------------------------------------------------------------------
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

commit;

-- ---------------------------------------------------------------------
-- Verifiering (kör efteråt i SQL Editor, valfritt)
-- ---------------------------------------------------------------------
-- select username, display_name, role from public.app_users order by username;           -- 4 rader
-- select * from public.user_goals order by username;                                      -- stille + kvist
-- select seller_username, count(*) from public.sales_entries group by 1;                  -- all historik = stille
-- select indexname from pg_indexes where tablename = 'sales_entries';                     -- unik (seller_username, entry_date)
-- select count(*) from public.sales_entries where brandkollen_sales is not null;          -- 0 innan nya registreringar
