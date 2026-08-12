import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { UploadSetPanel } from "../UploadSetPanel";
import { updatePerformance, deletePerformance } from "../actions";
import type { PerformanceStatus, VideoAsset } from "@/lib/database.types";

const PERFORMANCE_STATUS_OPTIONS: PerformanceStatus[] = [
  "scheduled",
  "recorded",
  "processing",
  "preview_ready",
  "ready",
  "archived",
];

interface PerformanceDetailRow {
  id: string;
  show_id: string;
  status: PerformanceStatus;
  scheduled_order: number | null;
  set_length_seconds: number | null;
  shows: { title: string; show_date: string; clubs: { name: string } | null } | null;
  comedian_profiles: { stage_name: string } | null;
}

const ASSET_STATUS_TONE: Record<VideoAsset["asset_status"], "good" | "warn" | "bad" | "neutral"> = {
  waiting_for_upload: "neutral",
  uploading: "warn",
  preparing: "warn",
  ready: "good",
  errored: "bad",
  deleted: "neutral",
};

export default async function AdminPerformanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ performanceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { performanceId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: performance } = await supabase
    .from("performances")
    .select<
      "id, show_id, status, scheduled_order, set_length_seconds, shows ( title, show_date, clubs ( name ) ), comedian_profiles ( stage_name )",
      PerformanceDetailRow
    >(
      "id, show_id, status, scheduled_order, set_length_seconds, shows ( title, show_date, clubs ( name ) ), comedian_profiles ( stage_name )",
    )
    .eq("id", performanceId)
    .maybeSingle();

  if (!performance) notFound();

  const { data: videoAssets } = await supabase
    .from("video_assets")
    .select("*")
    .eq("performance_id", performanceId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <Link
        href={`/admin/shows/${performance.show_id}`}
        className="text-sm text-stage-400 hover:text-white"
      >
        ← Back to show
      </Link>
      <p className="mt-3 text-sm text-stage-400">
        {performance.shows?.clubs?.name} · {performance.shows?.title}
      </p>
      <h1 className="font-display text-2xl font-semibold text-white">
        {performance.comedian_profiles?.stage_name ?? "Unknown comedian"}
      </h1>
      <p className="mt-1 text-sm text-stage-300">
        {performance.shows?.show_date
          ? new Date(performance.shows.show_date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : null}
      </p>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Video assets
          </h2>

          {!videoAssets || videoAssets.length === 0 ? (
            <p className="mt-3 text-sm text-stage-300">No video assets yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {videoAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="rounded-xl2 border border-stage-700 bg-stage-850 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white">{asset.asset_type.replace("_", " ")}</p>
                    <Badge tone={ASSET_STATUS_TONE[asset.asset_status]}>{asset.asset_status}</Badge>
                  </div>
                  {asset.duration_seconds ? (
                    <p className="mt-1 text-sm text-stage-400">
                      {Math.round(asset.duration_seconds)}s · {asset.aspect_ratio ?? "unknown ratio"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Upload a set
          </h2>
          <div className="mt-3">
            <UploadSetPanel performanceId={performance.id} />
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Edit performance
          </h2>
          <form
            action={updatePerformance}
            className="mt-3 flex flex-col gap-3 rounded-xl2 border border-stage-700 bg-stage-900 p-4"
          >
            <input type="hidden" name="performanceId" value={performance.id} />
            <div>
              <label htmlFor="status" className="mb-1.5 block text-sm text-stage-300">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={performance.status}
                className="tap-target w-full rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
              >
                {PERFORMANCE_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="scheduledOrder" className="mb-1.5 block text-sm text-stage-300">
                Lineup order
              </label>
              <input
                id="scheduledOrder"
                name="scheduledOrder"
                type="number"
                defaultValue={performance.scheduled_order ?? ""}
                className="tap-target w-full rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="setLengthMinutes" className="mb-1.5 block text-sm text-stage-300">
                Set length (minutes)
              </label>
              <input
                id="setLengthMinutes"
                name="setLengthMinutes"
                type="number"
                defaultValue={
                  performance.set_length_seconds
                    ? Math.round(performance.set_length_seconds / 60)
                    : ""
                }
                className="tap-target w-full rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
              />
            </div>
            <Button type="submit" variant="secondary">
              Save changes
            </Button>
          </form>

          <form action={deletePerformance} className="mt-3">
            <input type="hidden" name="performanceId" value={performance.id} />
            <input type="hidden" name="showId" value={performance.show_id} />
            <ConfirmSubmitButton
              variant="ghost"
              confirmMessage={`Delete this performance? This permanently deletes its video asset records (not the underlying files on Mux). This cannot be undone.`}
              className="text-red-400 hover:text-red-300"
            >
              Delete performance
            </ConfirmSubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
