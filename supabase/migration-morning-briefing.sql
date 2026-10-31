-- Morning Sales Briefing delivery ledger and atomic daily-send claim.
-- Run in Supabase SQL Editor. Safe to run more than once.
create table if not exists public.email_dispatch_logs (
  id bigint generated always as identity primary key,
  idempotency_key text not null unique,
  kind text not null check (kind in ('daily','test')),
  report_date date,
  recipients text[] not null default '{}',
  status text not null check (status in ('sending','sent','failed')),
  attempts integer not null default 1 check (attempts between 1 and 3),
  resend_id text,
  email_payload jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_dispatch_kind_date_check check (
    (kind = 'daily' and report_date is not null) or (kind = 'test' and report_date is null)
  )
);
alter table public.email_dispatch_logs add column if not exists email_payload jsonb;

alter table public.email_dispatch_logs enable row level security;
revoke all on public.email_dispatch_logs from public, anon, authenticated;
grant all privileges on public.email_dispatch_logs to service_role;
grant usage, select on sequence public.email_dispatch_logs_id_seq to service_role;
create index if not exists email_dispatch_created_idx on public.email_dispatch_logs(created_at desc);
create index if not exists email_dispatch_date_idx on public.email_dispatch_logs(report_date desc);

create or replace function public.claim_morning_briefing(p_report_date date, p_recipients text[])
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  claimed_id bigint;
  request_key text := 'daily:' || to_char(p_report_date, 'YYYY-MM-DD');
begin
  insert into public.email_dispatch_logs
    (idempotency_key, kind, report_date, recipients, status, attempts, started_at, finished_at, error_message)
  values
    (request_key, 'daily', p_report_date, coalesce(p_recipients, '{}'::text[]), 'sending', 1, now(), null, null)
  on conflict (idempotency_key) do update
    set recipients = excluded.recipients,
        status = 'sending',
        attempts = public.email_dispatch_logs.attempts + 1,
        started_at = now(),
        finished_at = null,
        error_message = null,
        resend_id = null
    where public.email_dispatch_logs.attempts < 3
      and (
        (public.email_dispatch_logs.status = 'failed' and public.email_dispatch_logs.started_at < now() - interval '10 minutes')
        or (public.email_dispatch_logs.status = 'sending' and public.email_dispatch_logs.started_at < now() - interval '20 minutes')
      )
  returning id into claimed_id;

  return claimed_id is not null;
end;
$$;

revoke all on function public.claim_morning_briefing(date, text[]) from public, anon, authenticated;
grant execute on function public.claim_morning_briefing(date, text[]) to service_role;
