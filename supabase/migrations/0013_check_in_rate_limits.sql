-- Backs a per-IP rate limit on the public, unauthenticated check-in
-- server action (src/app/check-in/actions.ts) — that endpoint has no
-- session to scope RLS to, so nothing else in this schema protects it
-- from being spammed directly.
--
-- Locked down like check_ins/consent_records: RLS enabled, zero
-- policies. Only the service-role client (already what the check-in
-- action uses for everything else) can read or write this table.
create table public.check_in_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  created_at timestamptz not null default now()
);

create index check_in_rate_limits_ip_created_idx
  on public.check_in_rate_limits (ip_address, created_at);

alter table public.check_in_rate_limits enable row level security;

-- Rows older than a day are useless for rate limiting (the window
-- checked in application code is much shorter) and would otherwise
-- accumulate forever. A partial-ish cleanup: delete anything past a
-- day whenever a new attempt is recorded, so the table stays small
-- without needing a scheduled job.
create or replace function public.prune_old_check_in_rate_limits()
returns trigger
language plpgsql
as $$
begin
  delete from public.check_in_rate_limits
  where created_at < now() - interval '1 day';
  return new;
end;
$$;

create trigger check_in_rate_limits_prune
  after insert on public.check_in_rate_limits
  execute function public.prune_old_check_in_rate_limits();
