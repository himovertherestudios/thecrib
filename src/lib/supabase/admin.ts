import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * This must only be used from trusted server-side code paths that perform
 * their own authorization checks in application code, namely:
 *   - the public check-in submission flow (unauthenticated by design)
 *   - reading show/club display info for the public check-in page
 *   - the Mux webhook handler (Phase 2)
 *
 * Every other read/write should go through `lib/supabase/server.ts` so
 * Postgres RLS is the actual authority. Importing "server-only" makes any
 * accidental client-bundle import a build-time error.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
