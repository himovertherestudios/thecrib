import { NextResponse } from "next/server";
import { getMuxClient } from "@/lib/mux/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mux calls this server-to-server with no Supabase session, so signature
 * verification (mux.webhooks.unwrap) is the entire authorization boundary
 * here — an unverified payload is never trusted or acted on. All writes go
 * through the service-role client for the same reason: there's no user to
 * scope an RLS-respecting client to.
 *
 * Every handler below updates rows by a Mux-issued id (mux_upload_id or
 * mux_asset_id) rather than inserting new ones, so redelivering the same
 * event is naturally idempotent — it just re-applies the same update.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const mux = getMuxClient();

  let event;
  try {
    event = await mux.webhooks.unwrap(rawBody, request.headers, process.env.MUX_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "video.upload.asset_created": {
      const uploadId = event.data.id;
      const assetId = event.data.asset_id;
      if (assetId) {
        await supabase
          .from("video_assets")
          .update({ mux_asset_id: assetId, asset_status: "preparing" })
          .eq("mux_upload_id", uploadId);
      }
      break;
    }

    case "video.asset.ready": {
      const assetId = event.data.id;
      const signedPlaybackId = event.data.playback_ids?.find((p) => p.policy === "signed")?.id ?? null;

      const { data: videoAsset } = await supabase
        .from("video_assets")
        .select("id, performance_id, asset_type")
        .eq("mux_asset_id", assetId)
        .maybeSingle();

      await supabase
        .from("video_assets")
        .update({
          asset_status: "ready",
          mux_playback_id: signedPlaybackId,
          duration_seconds: event.data.duration ?? null,
          aspect_ratio: event.data.aspect_ratio ?? null,
        })
        .eq("mux_asset_id", assetId);

      // The full set becoming playable is what actually makes a
      // performance "ready" from the comedian's point of view. Other
      // asset types (clips, previews) don't drive this status.
      if (videoAsset && videoAsset.asset_type === "full_set") {
        await supabase
          .from("performances")
          .update({ status: "ready" })
          .eq("id", videoAsset.performance_id);
      }
      break;
    }

    case "video.asset.errored": {
      const assetId = event.data.id;
      await supabase
        .from("video_assets")
        .update({ asset_status: "errored" })
        .eq("mux_asset_id", assetId);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
