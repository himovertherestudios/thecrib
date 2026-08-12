-- Lets an existing org admin invite someone by email to become an admin
-- or staff member, including people who have never signed in before
-- (organization_members.user_id is a hard FK to profiles.id, so there's
-- no way to add them there until they have an account).
--
-- Acceptance mirrors the comedian_profiles self-claim pattern (see 0011
-- and 0012): RLS lets the invitee — matched by their verified auth email,
-- not app code — insert their own organization_members row and mark
-- their own invite accepted. No service-role client involved.
create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'staff')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- Only one open invite per org+email at a time. Partial index (rather
-- than a plain unique constraint) so a past accepted invite doesn't
-- block re-inviting someone later.
create unique index organization_invites_pending_unique
  on public.organization_invites (organization_id, lower(email))
  where accepted_at is null;

alter table public.organization_invites enable row level security;

create policy "organization_invites_select_admin"
  on public.organization_invites for select
  using (public.is_org_admin(organization_id));

-- Mirrors comedian_profiles_select_unclaimed_self: without this, the
-- invitee can't see their own pending invite at all, and the later
-- accept UPDATE would silently match zero rows even with a correct
-- USING clause — Postgres requires SELECT visibility first.
create policy "organization_invites_select_own_pending"
  on public.organization_invites for select
  using (
    accepted_at is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "organization_invites_insert_admin"
  on public.organization_invites for insert
  to authenticated
  with check (public.is_org_admin(organization_id));

create policy "organization_invites_delete_admin"
  on public.organization_invites for delete
  using (public.is_org_admin(organization_id));

create policy "organization_invites_accept_own"
  on public.organization_invites for update
  using (
    accepted_at is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- The existing organization_members_insert_by_admin policy already lets
-- an admin insert a membership row for someone else's user_id — this
-- adds the other path: the invitee inserting their own row once a
-- matching pending invite exists.
create policy "organization_members_insert_via_invite"
  on public.organization_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_invites inv
      where inv.organization_id = organization_members.organization_id
        and inv.role = organization_members.role
        and inv.accepted_at is null
        and lower(inv.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
