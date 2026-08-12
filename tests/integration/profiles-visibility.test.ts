import { afterAll, describe, expect, it } from "vitest";
import { serviceClient, signInAsTestUser, testEmail, deleteTestUser } from "../helpers/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Regression test for migration 0016. profiles_select_own only ever let
 * someone see their own profile — an org admin viewing their team
 * roster saw every teammate's name/email as null except their own. This
 * checks the fix is properly scoped: an admin can see a teammate's
 * profile, but an unrelated stranger cannot see either of theirs.
 */
describe("profiles visibility for org admins", () => {
  const adminEmail = testEmail("profiles-admin");
  const teammateEmail = testEmail("profiles-teammate");
  const strangerEmail = testEmail("profiles-stranger");
  let organizationId: string;
  let adminUserId: string;
  let teammateUserId: string;
  let strangerUserId: string;
  let adminClient: SupabaseClient<Database>;
  let teammateClient: SupabaseClient<Database>;

  afterAll(async () => {
    const admin = serviceClient();
    await admin.from("organization_members").delete().eq("organization_id", organizationId);
    await admin.from("organizations").delete().eq("id", organizationId);
    if (adminUserId) await deleteTestUser(admin, adminUserId);
    if (teammateUserId) await deleteTestUser(admin, teammateUserId);
    if (strangerUserId) await deleteTestUser(admin, strangerUserId);
  });

  it("sets up an org with an admin and a staff teammate", async () => {
    adminClient = await signInAsTestUser(adminEmail);
    adminUserId = (await adminClient.auth.getUser()).data.user!.id;

    organizationId = crypto.randomUUID();
    const { error: orgError } = await adminClient
      .from("organizations")
      .insert({ id: organizationId, name: "Test Org", slug: `test-org-${organizationId}` });
    expect(orgError).toBeNull();

    const { error: adminMemberError } = await adminClient
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: adminUserId, role: "admin" });
    expect(adminMemberError).toBeNull();

    teammateClient = await signInAsTestUser(teammateEmail);
    teammateUserId = (await teammateClient.auth.getUser()).data.user!.id;

    const admin = serviceClient();
    const { error } = await admin
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: teammateUserId, role: "staff" });
    expect(error).toBeNull();
  });

  it("lets the admin see the teammate's profile", async () => {
    const { data, error } = await adminClient
      .from("profiles")
      .select("email")
      .eq("id", teammateUserId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.email).toBe(teammateEmail.toLowerCase());
  });

  it("does not let an unrelated stranger see the teammate's profile", async () => {
    const strangerClient = await signInAsTestUser(strangerEmail);
    strangerUserId = (await strangerClient.auth.getUser()).data.user!.id;

    const { data } = await strangerClient
      .from("profiles")
      .select("email")
      .eq("id", teammateUserId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("does not let the teammate (a non-admin) see the admin's profile", async () => {
    const { data } = await teammateClient
      .from("profiles")
      .select("email")
      .eq("id", adminUserId)
      .maybeSingle();
    expect(data).toBeNull();
  });
});
