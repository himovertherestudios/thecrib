import "server-only";
import { getMuxClient } from "./client";

/**
 * Mints a short-lived signed playback token for a Mux signed playback ID.
 * Never call this without having already verified, server-side, that the
 * requesting user actually owns the performance this playback ID belongs
 * to — this function only proves the token is valid to Mux, not that the
 * caller is allowed to have it.
 */
export async function signPlaybackToken(
  playbackId: string,
  expiration: string = "6h",
): Promise<string> {
  const mux = getMuxClient();
  return mux.jwt.signPlaybackId(playbackId, {
    type: "video",
    expiration,
  });
}
