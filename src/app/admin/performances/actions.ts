"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMuxClient } from "@/lib/mux/client";
import { getSiteOrigin } from "@/lib/url";
import type { VideoAssetType } from "@/lib/database.types";

/**
 * Creates a performance from an existing check-in. Uses the RLS-respecting
 * server client — the performances INSERT policy already requires the
 * caller to be an admin of the show's organization, so authorization is
 * enforced by Postgres, not by this function.
 */
export async function createPerformanceFromCheckIn(formData: FormData) {
  const checkInId = String(formData.get("checkInId") ?? "");
  const showId = String(formData.get("showId") ?? "");

  if (!checkInId || !showId) {
    redirect(`/admin/shows/${showId}?error=${encodeURIComponent("Missing check-in.")}`);
  }

  const supabase = await createClient();

  const { data: checkIn, error: checkInError } = await supabase
    .from("check_ins")
    .select("id, comedian_profile_id, show_id")
    .eq("id", checkInId)
    .maybeSingle();

  if (checkInError || !checkIn) {
    redirect(`/admin/shows/${showId}?error=${encodeURIComponent("Check-in not found.")}`);
  }

  const { data: performance, error: performanceError } = await supabase
    .from("performances")
    .insert({
      show_id: checkIn.show_id,
      comedian_profile_id: checkIn.comedian_profile_id,
      check_in_id: checkIn.id,
    })
    .select("id")
    .single();

  if (performanceError || !performance) {
    redirect(`/admin/shows/${showId}?error=${encodeURIComponent("Could not create performance.")}`);
  }

  revalidatePath(`/admin/shows/${showId}`);
  redirect(`/admin/performances/${performance.id}`);
}

export type CreateDirectUploadResult =
  | { ok: true; uploadUrl: string }
  | { ok: false; error: string };

/**
 * Creates a Mux Direct Upload and a matching `video_assets` row
 * (`waiting_for_upload`). The browser uploads the file straight to the
 * returned URL — the video itself never passes through this server. Mux
 * processes it asynchronously; the webhook handler is what eventually
 * marks the row `ready`, not this function.
 */
export async function createDirectUpload(
  performanceId: string,
  assetType: VideoAssetType,
): Promise<CreateDirectUploadResult> {
  const supabase = await createClient();

  const { data: performance, error: performanceError } = await supabase
    .from("performances")
    .select("id")
    .eq("id", performanceId)
    .maybeSingle();

  if (performanceError || !performance) {
    return { ok: false, error: "Performance not found." };
  }

  const origin = await getSiteOrigin();
  const mux = getMuxClient();

  let upload;
  try {
    upload = await mux.video.uploads.create({
      cors_origin: origin,
      new_asset_settings: { playback_policies: ["signed"] },
    });
  } catch {
    return { ok: false, error: "Could not create an upload with Mux." };
  }

  if (!upload.url) {
    return { ok: false, error: "Mux did not return an upload URL." };
  }

  const { error: insertError } = await supabase.from("video_assets").insert({
    performance_id: performanceId,
    asset_type: assetType,
    mux_upload_id: upload.id,
    playback_policy: "signed",
    asset_status: "waiting_for_upload",
  });

  if (insertError) {
    return { ok: false, error: "Could not save the upload record." };
  }

  revalidatePath(`/admin/performances/${performanceId}`);
  return { ok: true, uploadUrl: upload.url };
}
