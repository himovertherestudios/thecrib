-- organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row
  execute function public.set_updated_at();

-- organization_members: org-scoped roles, rather than a global admin flag
-- on profiles. A user can belong to more than one organization.
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Membership helpers used throughout RLS policies on this and later
-- tables. SECURITY DEFINER + a pinned search_path lets them read
-- organization_members without RLS-recursing on that same table, and
-- prevents search_path hijacking.

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- organizations: members can read their orgs. Any authenticated user can
-- create an organization (they must then also insert themselves as its
-- first admin member — see organization_members policy below — to be
-- able to read it again afterward). Only an existing admin can update it.
create policy "organizations_select_member"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "organizations_insert_authenticated"
  on public.organizations for insert
  to authenticated
  with check (true);

create policy "organizations_update_admin"
  on public.organizations for update
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- organization_members: members can see their org's roster. A user may
-- add themselves as the *first* (founding) admin of an organization that
-- has no members yet; after that, only an existing admin can add members.
create policy "organization_members_select_member"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "organization_members_insert_founding_admin"
  on public.organization_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and not exists (
      select 1 from public.organization_members existing
      where existing.organization_id = organization_members.organization_id
    )
  );

create policy "organization_members_insert_by_admin"
  on public.organization_members for insert
  to authenticated
  with check (public.is_org_admin(organization_id));

create policy "organization_members_update_admin"
  on public.organization_members for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "organization_members_delete_admin"
  on public.organization_members for delete
  using (public.is_org_admin(organization_id));
