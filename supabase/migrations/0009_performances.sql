-- performances: a specific appearance by a comedian on a show. Deliberately
-- separate from video_assets — a performance can end up with zero, one, or
-- many video assets (full multicam edit, private preview, several social
-- clips), so "one performance = one video file" must never be assumed.
create table public.performances (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows (id) on delete cascade,
  comedian_profile_id uuid not null references public.comedian_profiles (id) on delete cascade,
  check_in_id uuid references public.check_ins (id) on delete set null,
  scheduled_order integer,
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  set_length_seconds integer,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'recorded', 'processing', 'preview_ready', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index performances_show_id_idx on public.performances (show_id);
create index performances_comedian_profile_id_idx on public.performances (comedian_profile_id);

create trigger performances_set_updated_at
  before update on public.performances
  for each row
  execute function public.set_updated_at();

alter table public.performances enable row level security;

create policy "performances_select_own"
  on public.performances for select
  using (
    comedian_profile_id in (
      select id from public.comedian_profiles where user_id = auth.uid()
    )
  );

create policy "performances_select_show_org_admin"
  on public.performances for select
  using (public.is_show_org_admin(show_id));

create policy "performances_insert_show_org_admin"
  on public.performances for insert
  to authenticated
  with check (public.is_show_org_admin(show_id));

create policy "performances_update_show_org_admin"
  on public.performances for update
  using (public.is_show_org_admin(show_id))
  with check (public.is_show_org_admin(show_id));

create policy "performances_delete_show_org_admin"
  on public.performances for delete
  using (public.is_show_org_admin(show_id));
