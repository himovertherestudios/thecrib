-- shows: belong to a club.
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  title text not null,
  show_date date not null,
  start_time timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shows_club_id_idx on public.shows (club_id);
create index shows_show_date_idx on public.shows (show_date);

create trigger shows_set_updated_at
  before update on public.shows
  for each row
  execute function public.set_updated_at();

-- Whether the current user administers the organization that owns the
-- club a show belongs to. Used here and by later tables (performances,
-- video_assets) that only carry a show_id.
create or replace function public.is_show_org_admin(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from shows s
    join clubs c on c.id = s.club_id
    where s.id = p_show_id
      and public.is_org_admin(c.organization_id)
  );
$$;

create or replace function public.is_show_org_member(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from shows s
    join clubs c on c.id = s.club_id
    where s.id = p_show_id
      and public.is_org_member(c.organization_id)
  );
$$;

alter table public.shows enable row level security;

-- No public/anon select policy: the public check-in page reads show
-- display info (title, date, club name) via the service-role client in a
-- server component, not via a client-side RLS-governed query. This keeps
-- show data restricted to org members at the database layer.
create policy "shows_select_org_member"
  on public.shows for select
  using (public.is_org_member((select organization_id from public.clubs where id = club_id)));

create policy "shows_insert_org_admin"
  on public.shows for insert
  to authenticated
  with check (public.is_org_admin((select organization_id from public.clubs where id = club_id)));

create policy "shows_update_org_admin"
  on public.shows for update
  using (public.is_org_admin((select organization_id from public.clubs where id = club_id)))
  with check (public.is_org_admin((select organization_id from public.clubs where id = club_id)));

create policy "shows_delete_org_admin"
  on public.shows for delete
  using (public.is_org_admin((select organization_id from public.clubs where id = club_id)));
