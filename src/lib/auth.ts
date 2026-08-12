import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/lib/database.types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** Redirects to /login if there is no authenticated user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export interface OrgMembership {
  organization_id: string;
  organization_name: string;
  role: OrgRole;
}

interface OrgMemberRow {
  organization_id: string;
  role: OrgRole;
  organizations: { name: string } | null;
}

/** Organizations the current user administers (role = 'admin'). */
export async function getAdminOrgMemberships(): Promise<OrgMembership[]> {
  const memberships = await getOrgMemberships();
  return memberships.filter((m) => m.role === "admin");
}

/**
 * Organizations the current user belongs to, admin or staff. Dashboard
 * navigation (which orgs to show, whether to show the "create an
 * organization" empty state) uses this — actual admin-only mutations
 * (inviting teammates, creating shows, etc.) stay gated by RLS's
 * is_org_admin checks regardless of what this returns.
 */
export async function getOrgMemberships(): Promise<OrgMembership[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("organization_members")
    .select<"organization_id, role, organizations ( name )", OrgMemberRow>(
      "organization_id, role, organizations ( name )",
    )
    .eq("user_id", userData.user.id);

  if (error || !data) return [];

  return data.map((row) => ({
    organization_id: row.organization_id,
    organization_name: row.organizations?.name ?? "Untitled organization",
    role: row.role,
  }));
}

/**
 * Redirects to /login if unauthenticated. Returns an empty admin org list
 * (rather than redirecting) when the user has no admin memberships, so the
 * page can render an "no organizations yet / create one" state instead of
 * a dead end.
 */
export async function requireUserWithAdminOrgs() {
  const user = await requireUser();
  const orgs = await getAdminOrgMemberships();
  return { user, orgs };
}

/**
 * If the signed-in user's email matches a comedian_profiles row that was
 * created during check-in (before they had an account), link that row to
 * their auth user. Safe to call on every dashboard load — it's a no-op
 * once claimed. Relies on the "comedians can self-claim" RLS policy on
 * comedian_profiles, so this uses the RLS-respecting server client, not
 * the service-role client.
 */
export async function claimComedianProfileIfNeeded(userId: string, email: string) {
  const supabase = await createClient();
  await supabase
    .from("comedian_profiles")
    .update({ user_id: userId })
    .is("user_id", null)
    .eq("email", email.toLowerCase());
}

/**
 * If the signed-in user's email matches a pending organization_invites
 * row, accepts it: inserts their organization_members row (allowed by the
 * "organization_members_insert_via_invite" RLS policy, which checks for
 * exactly this — a pending invite matching the caller's own verified
 * email) and marks the invite accepted. Safe to call on every /admin
 * load — a user with no pending invites is a no-op, and an already-
 * accepted invite no longer matches the "accepted_at is null" policy, so
 * this can't double-insert on repeat calls.
 */
export async function claimPendingOrgInvites(userId: string, email: string) {
  const supabase = await createClient();

  const { data: invites } = await supabase
    .from("organization_invites")
    .select("id, organization_id, role")
    .is("accepted_at", null)
    .eq("email", email.toLowerCase());

  if (!invites || invites.length === 0) return;

  for (const invite of invites) {
    const { error: insertError } = await supabase.from("organization_members").insert({
      organization_id: invite.organization_id,
      user_id: userId,
      role: invite.role,
    });

    // 23505 = unique_violation: already a member of this org (e.g. a
    // stale invite left over after joining some other way). Still worth
    // marking accepted so it stops showing as pending; any other insert
    // error leaves the invite untouched to retry on the next load.
    if (insertError && insertError.code !== "23505") continue;

    await supabase
      .from("organization_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
  }
}

export async function getComedianProfileForUser(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comedian_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
