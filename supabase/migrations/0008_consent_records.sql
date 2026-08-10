-- consent_records: recording consent, private-content access, and
-- promotional permission are three independent decisions, never merged
-- into a single field. "ask_first" is a request to be contacted — not
-- permission to publish — and application code must never treat it as
-- equivalent to "approved".
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null unique references public.check_ins (id) on delete cascade,
  comedian_profile_id uuid not null references public.comedian_profiles (id) on delete cascade,
  show_id uuid not null references public.shows (id) on delete cascade,
  recording_consent text not null check (recording_consent in ('allowed', 'denied')),
  private_content_access text not null check (private_content_access in ('requested', 'declined')),
  promotional_permission text not null
    check (promotional_permission in ('approved', 'ask_first', 'denied')),
  consent_version text not null,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index consent_records_show_id_idx on public.consent_records (show_id);
create index consent_records_comedian_profile_id_idx on public.consent_records (comedian_profile_id);

alter table public.consent_records enable row level security;

-- No insert policy: written only by the check-in server action via the
-- service-role client, in the same request that creates the check_in row.
create policy "consent_records_select_own"
  on public.consent_records for select
  using (
    comedian_profile_id in (
      select id from public.comedian_profiles where user_id = auth.uid()
    )
  );

create policy "consent_records_select_show_org_admin"
  on public.consent_records for select
  using (public.is_show_org_admin(show_id));
