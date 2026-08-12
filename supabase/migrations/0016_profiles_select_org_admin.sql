-- profiles_select_own (0002) only lets someone see their own profile,
-- which means an org admin viewing their team roster (organization_members
-- joined with profiles) sees every teammate's name/email as null except
-- their own — the invite feature otherwise works, but the team page
-- silently shows "Unknown" for everyone but yourself. Mirrors the same
-- pattern already used for comedian_profiles_select_show_org_admin: an
-- admin can see the profile of anyone who shares an org they administer.
create policy "profiles_select_org_admin"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.organization_members member
      join public.organization_members admin_member
        on admin_member.organization_id = member.organization_id
      where member.user_id = profiles.id
        and admin_member.user_id = auth.uid()
        and admin_member.role = 'admin'
    )
  );
