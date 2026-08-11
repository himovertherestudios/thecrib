-- 0011 fixed the RLS recursion, but the self-claim UPDATE still silently
-- matched zero rows for most comedians. Reason: Postgres requires a row to
-- be visible per a SELECT policy before UPDATE/DELETE can act on it at
-- all, in addition to satisfying the UPDATE policy's own USING clause.
-- comedian_profiles had no SELECT policy that made an *unclaimed* row
-- (user_id is null) visible to the person whose email it matches — only
-- comedian_profiles_select_own (requires user_id already = auth.uid(),
-- which isn't true yet) and comedian_profiles_select_show_org_admin
-- (only true for org admins). Everyone else's self-claim silently no-opped.
--
-- This is why it looked like it worked during testing: the test account
-- happened to also be an org admin of the show the test profile checked
-- into, so it had visibility for an unrelated reason and the claim
-- succeeded by coincidence.

create policy "comedian_profiles_select_unclaimed_self"
  on public.comedian_profiles for select
  using (
    user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
