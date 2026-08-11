import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { UploadSetPanel } from "../UploadSetPanel";
import type { VideoAsset } from "@/lib/database.types";

interface PerformanceDetailRow {
  id: string;
  show_id: string;
  status: string;
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
}: {
  params: Promise<{ performanceId: string }>;
}) {
  const { performanceId } = await params;
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
    </div>
  );
}
