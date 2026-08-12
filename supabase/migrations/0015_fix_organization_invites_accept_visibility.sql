-- Mirrors the lesson from 0012 (comedian_profiles self-claim), but for
-- the row AFTER a change rather than before it. Postgres requires an
-- UPDATE's resulting row to remain visible under a SELECT policy for the
-- update to succeed at all, in addition to satisfying the UPDATE
-- policy's own USING/WITH CHECK clauses.
--
-- organization_invites_select_own_pending only covered accepted_at is
-- null, so the instant claimPendingOrgInvites (src/lib/auth.ts) set
-- accepted_at, the invitee lost visibility into their own
-- now-accepted invite under every policy (they aren't an org admin
-- yet within that same request) — and the UPDATE itself failed with a
-- bare "new row violates row-level security policy" error, verified
-- live via direct PostgREST calls with a real invitee access token.
--
-- Letting someone see their own invites regardless of accepted_at is
-- harmless (still scoped to their own verified email), so this widens
-- the policy rather than adding a second narrow one.
drop policy "organization_invites_select_own_pending" on public.organization_invites;

create policy "organization_invites_select_own"
  on public.organization_invites for select
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
