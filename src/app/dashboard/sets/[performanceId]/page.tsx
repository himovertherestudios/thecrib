import { notFound } from "next/navigation";
import MuxPlayer from "@mux/mux-player-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPerformancePlaybackForUser } from "@/lib/mux/get-performance-playback";
import { Badge } from "@/components/ui/Badge";

interface PerformanceWithShowRow {
  id: string;
  status: string;
  set_length_seconds: number | null;
  shows: { title: string; show_date: string; clubs: { name: string } | null } | null;
  comedian_profiles: { stage_name: string } | null;
}

export default async function ComedianSetPage({
  params,
}: {
  params: Promise<{ performanceId: string }>;
}) {
  await requireUser();
  const { performanceId } = await params;

  const supabase = await createClient();

  // RLS (performances_select_own) is what actually enforces that this
  // performance belongs to the signed-in comedian — this query returns
  // nothing at all otherwise, which notFound() below turns into a 404
  // rather than leaking whether the id exists.
  const { data: performance } = await supabase
    .from("performances")
    .select<
      "id, status, set_length_seconds, shows ( title, show_date, clubs ( name ) ), comedian_profiles ( stage_name )",
      PerformanceWithShowRow
    >("id, status, set_length_seconds, shows ( title, show_date, clubs ( name ) ), comedian_profiles ( stage_name )")
    .eq("id", performanceId)
    .maybeSingle();

  if (!performance) notFound();

  const playback = await getPerformancePlaybackForUser(performanceId);

  return (
    <div>
      <p className="text-sm text-stage-400">
        {performance.shows?.clubs?.name} · {performance.shows?.title}
      </p>
      <h1 className="font-display text-2xl font-semibold text-white">
        {performance.comedian_profiles?.stage_name}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {performance.shows?.show_date ? (
          <p className="text-sm text-stage-300">
            {new Date(performance.shows.show_date).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        ) : null}
        {performance.set_length_seconds ? (
          <p className="text-sm text-stage-300">
            · {Math.round(performance.set_length_seconds / 60)} min set
          </p>
        ) : null}
        <Badge tone="neutral">{performance.status}</Badge>
      </div>

      <div className="mt-6">
        {playback.ok ? (
          <div className="overflow-hidden rounded-xl2 border border-stage-700">
            <MuxPlayer
              playbackId={playback.playbackId}
              tokens={{ playback: playback.token }}
              streamType="on-demand"
              metadata={{ video_title: performance.comedian_profiles?.stage_name ?? "Set" }}
              style={{ width: "100%", aspectRatio: "16 / 9" }}
            />
          </div>
        ) : (
          <div className="rounded-xl2 border border-stage-700 bg-stage-850 p-6 text-center">
            <p className="text-white">Your video isn&apos;t ready yet.</p>
            <p className="mt-2 text-sm text-stage-300">
              We&apos;ll have it ready for private viewing soon — check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
