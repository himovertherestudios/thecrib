-- check_ins: connects a comedian to a specific show. Contact fields are
-- snapshotted at check-in time (rather than always joining out to
-- comedian_profiles), since a comedian's profile info may change later
-- and production staff need to see what was true at check-in time.
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows (id) on delete cascade,
  comedian_profile_id uuid not null references public.comedian_profiles (id) on delete cascade,
  stage_name text not null,
  legal_name text,
  email text not null,
  phone text,
  instagram text,
  tiktok text,
  expected_set_length_seconds integer,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index check_ins_show_id_idx on public.check_ins (show_id);
create index check_ins_comedian_profile_id_idx on public.check_ins (comedian_profile_id);

alter table public.check_ins enable row level security;

-- No insert policy for anon/authenticated: the public /check-in flow is
-- unauthenticated by design, so it cannot be gated by a user-scoped RLS
-- policy anyway. Submissions go through a server action that validates
-- input and writes via the service-role client, which bypasses RLS.
create policy "check_ins_select_own"
  on public.check_ins for select
  using (
    comedian_profile_id in (
      select id from public.comedian_profiles where user_id = auth.uid()
    )
  );

create policy "check_ins_select_show_org_admin"
  on public.check_ins for select
  using (public.is_show_org_admin(show_id));

-- Now that check_ins exists, admins of the organization a comedian
-- checked in with can also look up that comedian's profile — e.g. to show
-- contact info on the show detail page. Defined here (rather than in
-- 0006_comedian_profiles.sql) because it depends on this table.
create policy "comedian_profiles_select_show_org_admin"
  on public.comedian_profiles for select
  using (
    exists (
      select 1
      from public.check_ins ci
      where ci.comedian_profile_id = comedian_profiles.id
        and public.is_show_org_admin(ci.show_id)
    )
  );
