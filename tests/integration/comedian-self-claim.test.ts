import { afterAll, describe, expect, it } from "vitest";
import { serviceClient, signInAsTestUser, testEmail, deleteTestUser } from "../helpers/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Regression test for migration 0012. comedian_profiles_select_own only
 * matches once user_id is already set — which isn't true for a freshly
 * checked-in comedian who hasn't signed in yet. Without
 * comedian_profiles_select_unclaimed_self, this whole flow silently
 * no-ops: the UPDATE in claimComedianProfileIfNeeded matches zero rows
 * because Postgres requires SELECT visibility before UPDATE/DELETE can
 * act on a row at all, independent of the UPDATE policy's own USING
 * clause.
 */
describe("comedian self-claim", () => {
  const email = testEmail("comedian-claim");
  let comedianProfileId: string;
  let userId: string;
  let client: SupabaseClient<Database>;

  afterAll(async () => {
    const admin = serviceClient();
    await admin.from("comedian_profiles").delete().eq("id", comedianProfileId);
    if (userId) await deleteTestUser(admin, userId);
  });

  it("sets up an unclaimed comedian profile and signs the matching user in once", async () => {
    const admin = serviceClient();
    const { data, error } = await admin
      .from("comedian_profiles")
      .insert({ stage_name: "Test Comedian", email })
      .select("id")
      .single();
    expect(error).toBeNull();
    comedianProfileId = data!.id;

    client = await signInAsTestUser(email);
    const { data: userData } = await client.auth.getUser();
    userId = userData.user!.id;
  });

  it("is visible to the matching signed-in email before being claimed", async () => {
    const { data, error } = await client
      .from("comedian_profiles")
      .select("id, user_id")
      .eq("id", comedianProfileId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(comedianProfileId);
    expect(data?.user_id).toBeNull();
  });

  it("lets the signed-in user claim it by setting user_id", async () => {
    const { error } = await client
      .from("comedian_profiles")
      .update({ user_id: userId })
      .is("user_id", null)
      .eq("email", email.toLowerCase());
    expect(error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin
      .from("comedian_profiles")
      .select("user_id")
      .eq("id", comedianProfileId)
      .maybeSingle();
    expect(data?.user_id).toBe(userId);
  });

  it("is a no-op on a second claim attempt rather than an error", async () => {
    const { error } = await client
      .from("comedian_profiles")
      .update({ user_id: userId })
      .is("user_id", null)
      .eq("email", email.toLowerCase());
    expect(error).toBeNull();
  });
});
