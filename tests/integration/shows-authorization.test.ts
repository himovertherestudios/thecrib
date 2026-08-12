import { afterAll, describe, expect, it } from "vitest";
import { serviceClient, signInAsTestUser, testEmail, deleteTestUser } from "../helpers/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * The edit/delete UI for shows has no authorization logic of its own —
 * it's a thin form over an update()/delete() call, entirely reliant on
 * shows_update_org_admin / shows_delete_org_admin actually restricting
 * who can act. This exercises that boundary directly.
 */
describe("shows update/delete authorization", () => {
  const adminEmail = testEmail("shows-admin");
  const strangerEmail = testEmail("shows-stranger");
  let organizationId: string;
  let clubId: string;
  let showId: string;
  let adminUserId: string;
  let strangerUserId: string;
  let adminClient: SupabaseClient<Database>;
  let strangerClient: SupabaseClient<Database>;

  afterAll(async () => {
    const admin = serviceClient();
    await admin.from("shows").delete().eq("id", showId);
    await admin.from("clubs").delete().eq("id", clubId);
    await admin.from("organization_members").delete().eq("organization_id", organizationId);
    await admin.from("organizations").delete().eq("id", organizationId);
    if (adminUserId) await deleteTestUser(admin, adminUserId);
    if (strangerUserId) await deleteTestUser(admin, strangerUserId);
  });

  it("sets up an org, club, and show owned by the admin", async () => {
    adminClient = await signInAsTestUser(adminEmail);
    adminUserId = (await adminClient.auth.getUser()).data.user!.id;

    organizationId = crypto.randomUUID();
    await adminClient
      .from("organizations")
      .insert({ id: organizationId, name: "Test Org", slug: `test-org-${organizationId}` });
    await adminClient
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: adminUserId, role: "admin" });

    const { data: club, error: clubError } = await adminClient
      .from("clubs")
      .insert({ organization_id: organizationId, name: "Test Club", slug: `test-club-${organizationId}` })
      .select("id")
      .single();
    expect(clubError).toBeNull();
    clubId = club!.id;

    const { data: show, error: showError } = await adminClient
      .from("shows")
      .insert({ club_id: clubId, title: "Original Title", show_date: "2026-09-01" })
      .select("id")
      .single();
    expect(showError).toBeNull();
    showId = show!.id;

    strangerClient = await signInAsTestUser(strangerEmail);
    strangerUserId = (await strangerClient.auth.getUser()).data.user!.id;
  });

  it("blocks an unrelated user from updating the show", async () => {
    const { error } = await strangerClient
      .from("shows")
      .update({ title: "Hijacked Title" })
      .eq("id", showId);
    // RLS on UPDATE with a non-matching USING clause silently affects
    // zero rows rather than erroring — the real assertion is that the
    // title never actually changed.
    expect(error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin.from("shows").select("title").eq("id", showId).maybeSingle();
    expect(data?.title).toBe("Original Title");
  });

  it("blocks an unrelated user from deleting the show", async () => {
    await strangerClient.from("shows").delete().eq("id", showId);

    const admin = serviceClient();
    const { data } = await admin.from("shows").select("id").eq("id", showId).maybeSingle();
    expect(data?.id).toBe(showId);
  });

  it("lets the admin update the show", async () => {
    const { error } = await adminClient
      .from("shows")
      .update({ title: "Updated Title" })
      .eq("id", showId);
    expect(error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin.from("shows").select("title").eq("id", showId).maybeSingle();
    expect(data?.title).toBe("Updated Title");
  });

  it("lets the admin delete the show", async () => {
    const { error } = await adminClient.from("shows").delete().eq("id", showId);
    expect(error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin.from("shows").select("id").eq("id", showId).maybeSingle();
    expect(data).toBeNull();
  });
});
