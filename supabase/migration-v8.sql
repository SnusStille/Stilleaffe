-- Stilleaffe v8: ändringshistorik (säkert att köra flera gånger)
create table if not exists public.sales_audit (
  id bigint generated always as identity primary key,
  entry_date date not null,
  action text not null check (action in ('create','update','delete')),
  author text not null default 'seller',
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
alter table public.sales_audit enable row level security;
revoke all on public.sales_audit from anon, authenticated;
grant all privileges on table public.sales_audit to service_role;
grant usage, select on all sequences in schema public to service_role;
create index if not exists sales_audit_created_idx on public.sales_audit(created_at desc);
