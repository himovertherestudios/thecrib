-- comedian_profiles: a comedian may check in via QR before ever creating
-- an account, so user_id starts out null and is populated later — either
-- by claiming a matching row on first login, or immediately if the
-- comedian was already signed in at check-in time.
create table public.comedian_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  stage_name text not null,
  legal_name text,
  email text not null,
  phone text,
  instagram text,
  tiktok text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comedian_profiles_email_idx on public.comedian_profiles (lower(email));

create trigger comedian_profiles_set_updated_at
  before update on public.comedian_profiles
  for each row
  execute function public.set_updated_at();

alter table public.comedian_profiles enable row level security;

create policy "comedian_profiles_select_own"
  on public.comedian_profiles for select
  using (user_id = auth.uid());

-- A signed-in comedian can link an unclaimed profile (created at check-in,
-- before they had an account) to themselves, as long as the email matches
-- their verified Supabase Auth email. They cannot reassign an already
-- claimed profile, and cannot claim a profile under someone else's email.
create policy "comedian_profiles_self_claim"
  on public.comedian_profiles for update
  using (
    user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    user_id = auth.uid()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- No general insert/delete policy: rows are created by the check-in
-- server action via the service-role client, which bypasses RLS after
-- performing its own validation.
