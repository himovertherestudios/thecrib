import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Bypasses RLS. Use only for test setup/teardown, never to assert authorization. */
export function serviceClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

/**
 * Returns a real, RLS-scoped client authenticated as `email`, without
 * ever sending an email. admin.generateLink mints a numeric code
 * server-side (data.properties.email_otp) — the same one a real user
 * would type into /login's code field — and verifyOtp redeems it
 * directly. Creates the user if they don't already exist, matching how
 * the app's real signup path (signInWithOtp with shouldCreateUser: true)
 * behaves.
 */
export async function signInAsTestUser(email: string): Promise<SupabaseClient<Database>> {
  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data) throw new Error(`generateLink failed for ${email}: ${error?.message}`);

  const client = createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );

  const { error: verifyError } = await client.auth.verifyOtp({
    email,
    token: data.properties.email_otp,
    type: "email",
  });
  if (verifyError) throw new Error(`verifyOtp failed for ${email}: ${verifyError.message}`);

  return client;
}

/** A unique-per-run email so parallel/repeated test runs never collide. */
export function testEmail(label: string): string {
  return `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function deleteTestUser(admin: SupabaseClient<Database>, userId: string) {
  await admin.auth.admin.deleteUser(userId);
}
