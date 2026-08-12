import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * /check-in is public and unauthenticated by design, so there's no
 * session to scope RLS to — this is the only thing standing between the
 * endpoint and a script hammering it. Generous enough for a green room
 * full of comedians checking in from the same venue Wi-Fi in a short
 * window; restrictive enough to block scripted spam.
 */
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return requestHeaders.get("x-real-ip") ?? "unknown";
}

/**
 * Returns true and records this attempt if the caller is still within
 * the allowed rate. Returns false — recording nothing further, so a
 * blocked caller can't inflate their own count by retrying — if they've
 * already hit the limit within the window.
 */
export async function checkAndRecordCheckInAttempt(): Promise<boolean> {
  const ip = await getClientIp();
  const supabase = createAdminClient();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("check_in_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  await supabase.from("check_in_rate_limits").insert({ ip_address: ip });
  return true;
}
