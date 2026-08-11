import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signPlaybackToken } from "./sign-playback-token";
import type { VideoAsset } from "@/lib/database.types";

export type PerformancePlaybackResult =
  | { ok: true; playbackId: string; token: string; assetType: VideoAsset["asset_type"] }
  | { ok: false; reason: "not_found" | "not_ready" };

/**
 * The private-playback authorization flow described in the product spec:
 * verify the performance belongs to the caller (enforced by RLS on this
 * query, not by application code), find its playable video, confirm it's
 * actually ready, then mint a short-lived signed token. The browser never
 * gets to decide any of this on its own — it only ever receives the
 * playback ID and token this function chooses to hand back.
 *
 * Relies entirely on the RLS-respecting server client for authorization —
 * call this only from a path that has already confirmed there's a signed-in
 * user (e.g. after `requireUser()`), since an unauthenticated caller will
 * simply get "not_found" for every performance rather than an auth error.
 */
export async function getPerformancePlaybackForUser(
  performanceId: string,
): Promise<PerformancePlaybackResult> {
  const supabase = await createClient();

  const { data: performance } = await supabase
    .from("performances")
    .select("id")
    .eq("id", performanceId)
    .maybeSingle();

  if (!performance) {
    return { ok: false, reason: "not_found" };
  }

  const { data: videoAssets } = await supabase
    .from("video_assets")
    .select("*")
    .eq("performance_id", performanceId)
    .in("asset_type", ["full_set", "private_preview"])
    .order("created_at", { ascending: false });

  const playable = videoAssets?.find(
    (asset) => asset.asset_status === "ready" && asset.playback_policy === "signed" && asset.mux_playback_id,
  );

  if (!playable || !playable.mux_playback_id) {
    return { ok: false, reason: "not_ready" };
  }

  const token = await signPlaybackToken(playable.mux_playback_id);

  return { ok: true, playbackId: playable.mux_playback_id, token, assetType: playable.asset_type };
}
