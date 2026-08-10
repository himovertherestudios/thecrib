-- clubs: belong to an organization.
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  address text,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create trigger clubs_set_updated_at
  before update on public.clubs
  for each row
  execute function public.set_updated_at();

alter table public.clubs enable row level security;

create policy "clubs_select_org_member"
  on public.clubs for select
  using (public.is_org_member(organization_id));

create policy "clubs_insert_org_admin"
  on public.clubs for insert
  to authenticated
  with check (public.is_org_admin(organization_id));

create policy "clubs_update_org_admin"
  on public.clubs for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "clubs_delete_org_admin"
  on public.clubs for delete
  using (public.is_org_admin(organization_id));
