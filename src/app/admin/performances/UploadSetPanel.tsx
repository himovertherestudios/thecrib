"use client";

import { useState } from "react";
import MuxUploader from "@mux/mux-uploader-react";
import { Button } from "@/components/ui/Button";
import { createDirectUpload, markUploadFailed } from "./actions";
import type { VideoAssetType } from "@/lib/database.types";

const ASSET_TYPE_OPTIONS: { value: VideoAssetType; label: string }[] = [
  { value: "full_set", label: "Full set" },
  { value: "private_preview", label: "Private preview" },
  { value: "social_clip", label: "Social clip" },
  { value: "clean_clip", label: "Clean clip" },
  { value: "promo_clip", label: "Promo clip" },
];

export function UploadSetPanel({ performanceId }: { performanceId: string }) {
  const [assetType, setAssetType] = useState<VideoAssetType>("full_set");
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [videoAssetId, setVideoAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "uploading" | "failed" | "done">(
    "idle",
  );

  async function handleStart() {
    setError(null);
    setStatus("starting");

    let result;
    try {
      result = await createDirectUpload(performanceId, assetType);
    } catch {
      setError("Something went wrong starting the upload. You can try again.");
      setStatus("idle");
      return;
    }

    if (!result.ok) {
      setError(result.error);
      setStatus("idle");
      return;
    }

    setUploadUrl(result.uploadUrl);
    setVideoAssetId(result.videoAssetId);
    setStatus("uploading");
  }

  function handleUploadError() {
    setError("The upload failed. You can try again.");
    setStatus("failed");
    if (videoAssetId) {
      markUploadFailed(videoAssetId).catch(() => {});
    }
  }

  function handleRetry() {
    setError(null);
    setUploadUrl(null);
    setVideoAssetId(null);
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className="rounded-xl2 border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="text-sm text-emerald-400">
          Uploaded. Mux is processing it now — refresh this page in a bit to see its status.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-xl2 border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">{error}</p>
        <Button type="button" onClick={handleRetry} className="mt-3">
          Try again
        </Button>
      </div>
    );
  }

  if (uploadUrl) {
    return (
      <div className="rounded-xl2 border border-stage-700 bg-stage-850 p-4">
        <MuxUploader endpoint={uploadUrl} onSuccess={() => setStatus("done")} onUploadError={handleUploadError} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-stage-700 bg-stage-850 p-4">
      <label htmlFor="assetType" className="text-sm text-stage-300">
        Video type
      </label>
      <select
        id="assetType"
        value={assetType}
        onChange={(e) => setAssetType(e.target.value as VideoAssetType)}
        className="tap-target rounded-xl2 border border-stage-600 bg-stage-900 px-4 py-3 text-white focus:border-marquee focus:outline-none"
      >
        {ASSET_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <Button type="button" onClick={handleStart} disabled={status === "starting"}>
        {status === "starting" ? "Starting…" : "Upload Set"}
      </Button>
    </div>
  );
}
