import { afterAll, describe, expect, it } from "vitest";
import { serviceClient, signInAsTestUser, testEmail, deleteTestUser } from "../helpers/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Regression test for migration 0015. Marking an invite accepted used
 * to make it invisible to the person accepting it under every SELECT
 * policy (organization_invites_select_own_pending only matched
 * accepted_at is null, and the invitee isn't an org admin), which made
 * the accepting UPDATE itself fail — Postgres requires a row to stay
 * visible under a SELECT policy after an update, not just satisfy the
 * update policy's own USING/WITH CHECK clauses. This test performs the
 * exact sequence claimPendingOrgInvites (src/lib/auth.ts) does, against
 * real RLS, so a regression here fails loudly instead of silently.
 */
describe("organization invite accept flow", () => {
  const adminEmail = testEmail("org-invite-admin");
  const inviteeEmail = testEmail("org-invite-invitee");
  const strangerEmail = testEmail("org-invite-stranger");
  let organizationId: string;
  let adminUserId: string;
  let inviteeUserId: string;
  let strangerUserId: string;
  let inviteId: string;
  let adminClient: SupabaseClient<Database>;
  let inviteeClient: SupabaseClient<Database>;

  afterAll(async () => {
    const admin = serviceClient();
    await admin.from("organization_invites").delete().eq("organization_id", organizationId);
    await admin.from("organization_members").delete().eq("organization_id", organizationId);
    await admin.from("organizations").delete().eq("id", organizationId);
    if (adminUserId) await deleteTestUser(admin, adminUserId);
    if (inviteeUserId) await deleteTestUser(admin, inviteeUserId);
    if (strangerUserId) await deleteTestUser(admin, strangerUserId);
  });

  it("sets up an organization with a founding admin", async () => {
    adminClient = await signInAsTestUser(adminEmail);
    const { data: userData } = await adminClient.auth.getUser();
    adminUserId = userData.user!.id;

    organizationId = crypto.randomUUID();
    const { error: orgError } = await adminClient
      .from("organizations")
      .insert({ id: organizationId, name: "Test Org", slug: `test-org-${organizationId}` });
    expect(orgError).toBeNull();

    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: adminUserId, role: "admin" });
    expect(memberError).toBeNull();
  });

  it("lets the admin invite someone by email", async () => {
    const { data, error } = await adminClient
      .from("organization_invites")
      .insert({ organization_id: organizationId, email: inviteeEmail, role: "staff" })
      .select("id")
      .single();
    expect(error).toBeNull();
    inviteId = data!.id;
  });

  it("lets the invitee see their own pending invite", async () => {
    inviteeClient = await signInAsTestUser(inviteeEmail);
    const { data: userData } = await inviteeClient.auth.getUser();
    inviteeUserId = userData.user!.id;

    const { data, error } = await inviteeClient
      .from("organization_invites")
      .select("id, accepted_at")
      .eq("id", inviteId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(inviteId);
    expect(data?.accepted_at).toBeNull();
  });

  it("lets the invitee insert their own membership row", async () => {
    const { error } = await inviteeClient
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: inviteeUserId, role: "staff" });
    expect(error).toBeNull();
  });

  it("lets the invitee mark their own invite accepted — the exact step that failed before 0015", async () => {
    const { error } = await inviteeClient
      .from("organization_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inviteId);
    expect(error).toBeNull();
  });

  it("keeps the now-accepted invite visible to the invitee", async () => {
    const { data, error } = await inviteeClient
      .from("organization_invites")
      .select("accepted_at")
      .eq("id", inviteId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.accepted_at).not.toBeNull();
  });

  it("blocks a stranger from accepting someone else's invite", async () => {
    const strangerClient = await signInAsTestUser(strangerEmail);
    const { data: strangerData } = await strangerClient.auth.getUser();
    strangerUserId = strangerData.user!.id;

    const { error } = await strangerClient
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: strangerUserId, role: "staff" });
    expect(error).not.toBeNull();
  });
});
