import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/url";
import { sendEmail } from "./send-email";

/**
 * Called from the Mux webhook handler once a performance's full set
 * becomes ready. Uses the service-role client because this runs from an
 * unauthenticated server-to-server context (there's no comedian session
 * to scope an RLS-respecting client to) — the same reason the webhook
 * handler itself uses it.
 *
 * Only sends if this specific check-in's consent explicitly requested
 * private access ("Yes, send me access when my set is ready") — silence
 * is the correct behavior for "No, I do not need access", not a bug.
 */
interface PerformanceForNotifyRow {
  id: string;
  check_in_id: string | null;
  comedian_profile_id: string;
  shows: { title: string; clubs: { name: string } | null } | null;
}

export async function notifyComedianVideoReady(performanceId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: performance } = await supabase
    .from("performances")
    .select<
      "id, check_in_id, comedian_profile_id, shows ( title, clubs ( name ) )",
      PerformanceForNotifyRow
    >("id, check_in_id, comedian_profile_id, shows ( title, clubs ( name ) )")
    .eq("id", performanceId)
    .maybeSingle();

  if (!performance || !performance.check_in_id) return;

  const { data: consent } = await supabase
    .from("consent_records")
    .select("private_content_access")
    .eq("check_in_id", performance.check_in_id)
    .maybeSingle();

  if (!consent || consent.private_content_access !== "requested") return;

  const { data: comedian } = await supabase
    .from("comedian_profiles")
    .select("email, stage_name")
    .eq("id", performance.comedian_profile_id)
    .maybeSingle();

  if (!comedian) return;

  const show = performance.shows;
  const origin = await getSiteOrigin();
  const setUrl = `${origin}/dashboard/sets/${performance.id}`;

  await sendEmail({
    to: comedian.email,
    subject: "Your set is ready to watch",
    html: `
      <p>Hi ${comedian.stage_name},</p>
      <p>Your set from <strong>${show?.title ?? "your show"}</strong>${show?.clubs?.name ? ` at ${show.clubs.name}` : ""} is ready to watch privately.</p>
      <p><a href="${setUrl}">Watch your set</a></p>
      <p>This link only works when you're signed in as yourself — no one else can use it to see your footage.</p>
    `,
  });
}
