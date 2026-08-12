"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMuxClient } from "@/lib/mux/client";
import { getSiteOrigin } from "@/lib/url";
import type { PerformanceStatus, VideoAssetType } from "@/lib/database.types";

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
  | { ok: true; uploadUrl: string; videoAssetId: string }
  | { ok: false; error: string };

/**
 * Creates a Mux Direct Upload and a matching `video_assets` row
 * (`waiting_for_upload`). The browser uploads the file straight to the
 * returned URL — the video itself never passes through this server. Mux
 * processes it asynchronously; the webhook handler is what eventually
 * marks the row `ready`, not this function. Returns the row's id so the
 * caller can mark it `errored` if the browser-to-Mux upload itself fails
 * (a failure the webhook never hears about, since no asset was created).
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

  let upload;
  try {
    const mux = getMuxClient();
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

  const { data: videoAsset, error: insertError } = await supabase
    .from("video_assets")
    .insert({
      performance_id: performanceId,
      asset_type: assetType,
      mux_upload_id: upload.id,
      playback_policy: "signed",
      asset_status: "waiting_for_upload",
    })
    .select("id")
    .single();

  if (insertError || !videoAsset) {
    return { ok: false, error: "Could not save the upload record." };
  }

  revalidatePath(`/admin/performances/${performanceId}`);
  return { ok: true, uploadUrl: upload.url, videoAssetId: videoAsset.id };
}

/**
 * Marks a video_assets row `errored` after the browser-to-Mux upload
 * itself fails (as opposed to Mux failing to process a file it received
 * — that's video.asset.errored in the webhook handler). Lets the admin
 * see the failed attempt in the asset list instead of a `waiting_for_upload`
 * row that Mux will never move out of, since no asset was ever created.
 */
export async function markUploadFailed(videoAssetId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("video_assets")
    .update({ asset_status: "errored" })
    .eq("id", videoAssetId)
    .eq("asset_status", "waiting_for_upload");
}

export async function updatePerformance(formData: FormData) {
  const performanceId = String(formData.get("performanceId") ?? "");
  const status = String(formData.get("status") ?? "") as PerformanceStatus;
  const scheduledOrderRaw = String(formData.get("scheduledOrder") ?? "").trim();
  const setLengthMinutesRaw = String(formData.get("setLengthMinutes") ?? "").trim();

  if (!performanceId) {
    redirect("/admin/shows");
  }

  const scheduledOrder = scheduledOrderRaw ? Number(scheduledOrderRaw) : null;
  const setLengthSeconds = setLengthMinutesRaw ? Number(setLengthMinutesRaw) * 60 : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("performances")
    .update({ status, scheduled_order: scheduledOrder, set_length_seconds: setLengthSeconds })
    .eq("id", performanceId);

  if (error) {
    redirect(
      `/admin/performances/${performanceId}?error=${encodeURIComponent("Could not update performance.")}`,
    );
  }

  revalidatePath(`/admin/performances/${performanceId}`);
  redirect(`/admin/performances/${performanceId}`);
}

/**
 * Deleting a performance cascades to its video_assets rows (on delete
 * cascade) — it does not delete the underlying asset on Mux itself, only
 * our record of it. The confirmation copy in the UI says so explicitly.
 */
export async function deletePerformance(formData: FormData) {
  const performanceId = String(formData.get("performanceId") ?? "");
  const showId = String(formData.get("showId") ?? "");

  const supabase = await createClient();
  await supabase.from("performances").delete().eq("id", performanceId);

  revalidatePath(`/admin/shows/${showId}`);
  redirect(`/admin/shows/${showId}`);
}
