"use client";

import { useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";

/**
 * signPlaybackToken mints a 6h-lived token (src/lib/mux/sign-playback-token.ts).
 * Refreshing a while before that, rather than waiting for Mux to reject an
 * expired token, means a comedian who leaves this tab open never sees a
 * broken player. onError is a fallback for whatever the timer misses
 * (clock drift, a token invalidated early, etc.), capped so a persistent,
 * non-token error can't turn into a refresh loop.
 */
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const REFRESH_BEFORE_EXPIRY_MS = 30 * 60 * 1000;
const MAX_ERROR_REFRESH_ATTEMPTS = 3;

export function SignedVideoPlayer({
  performanceId,
  initialPlaybackId,
  initialToken,
  title,
}: {
  performanceId: string;
  initialPlaybackId: string;
  initialToken: string;
  title: string;
}) {
  const [playbackId, setPlaybackId] = useState(initialPlaybackId);
  const [token, setToken] = useState(initialToken);
  const refreshingRef = useRef(false);
  const errorRefreshCountRef = useRef(0);

  async function refreshToken() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const response = await fetch(`/api/performances/${performanceId}/playback`);
      if (response.ok) {
        const data = await response.json();
        setPlaybackId(data.playbackId);
        setToken(data.token);
      }
    } finally {
      refreshingRef.current = false;
    }
  }

  useEffect(() => {
    errorRefreshCountRef.current = 0;
    const timer = setTimeout(refreshToken, TOKEN_TTL_MS - REFRESH_BEFORE_EXPIRY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <MuxPlayer
      playbackId={playbackId}
      tokens={{ playback: token }}
      streamType="on-demand"
      metadata={{ video_title: title }}
      style={{ width: "100%", aspectRatio: "16 / 9" }}
      onError={() => {
        if (errorRefreshCountRef.current >= MAX_ERROR_REFRESH_ATTEMPTS) return;
        errorRefreshCountRef.current += 1;
        refreshToken();
      }}
    />
  );
}
