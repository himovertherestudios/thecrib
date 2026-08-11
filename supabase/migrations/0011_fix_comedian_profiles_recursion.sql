-- Fixes "infinite recursion detected in policy for relation
-- comedian_profiles" (Postgres 42P17), hit whenever a comedian's own
-- session tries to read or update comedian_profiles.
--
-- Root cause: comedian_profiles_select_show_org_admin (0007) queries
-- check_ins, and check_ins_select_own (0007) queries back into
-- comedian_profiles — a two-table RLS cycle. Postgres evaluates a table's
-- SELECT policies even during an UPDATE (to determine row visibility),
-- so this recursion also blocked the comedian self-claim UPDATE, not just
-- reads.
--
-- Fix: give every "does this row belong to the current comedian" check a
-- SECURITY DEFINER helper, the same pattern already used for
-- is_org_member/is_org_admin/is_show_org_admin. A security-definer
-- function's internal query bypasses RLS on the table it reads, so it
-- can't re-trigger the calling table's policies.

create or replace function public.is_own_comedian_profile(p_comedian_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from comedian_profiles cp
    where cp.id = p_comedian_profile_id
      and cp.user_id = auth.uid()
  );
$$;

create or replace function public.is_own_performance(p_performance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from performances p
    where p.id = p_performance_id
      and public.is_own_comedian_profile(p.comedian_profile_id)
  );
$$;

drop policy if exists "check_ins_select_own" on public.check_ins;
create policy "check_ins_select_own"
  on public.check_ins for select
  using (public.is_own_comedian_profile(comedian_profile_id));

drop policy if exists "consent_records_select_own" on public.consent_records;
create policy "consent_records_select_own"
  on public.consent_records for select
  using (public.is_own_comedian_profile(comedian_profile_id));

drop policy if exists "performances_select_own" on public.performances;
create policy "performances_select_own"
  on public.performances for select
  using (public.is_own_comedian_profile(comedian_profile_id));

drop policy if exists "video_assets_select_own" on public.video_assets;
create policy "video_assets_select_own"
  on public.video_assets for select
  using (public.is_own_performance(performance_id));
