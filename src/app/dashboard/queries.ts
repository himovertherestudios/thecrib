import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Performance } from "@/lib/database.types";

export interface PerformanceCard extends Performance {
  showTitle: string;
  showDate: string;
  clubName: string;
}

interface PerformanceWithShowRow extends Performance {
  shows: {
    title: string;
    show_date: string;
    clubs: { name: string } | null;
  } | null;
}

/**
 * Performances for the signed-in comedian, newest show first. Returns an
 * empty list today (Phase 1 doesn't create performances yet) — this exists
 * so /dashboard's "Your Sets" section can render real performance cards
 * as soon as Phase 2 starts populating the table, with no page changes.
 */
export async function getComedianPerformances(
  comedianProfileId: string,
): Promise<PerformanceCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("performances")
    .select<"*, shows ( title, show_date, clubs ( name ) )", PerformanceWithShowRow>(
      "*, shows ( title, show_date, clubs ( name ) )",
    )
    .eq("comedian_profile_id", comedianProfileId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map(({ shows, ...performance }) => ({
    ...performance,
    showTitle: shows?.title ?? "",
    showDate: shows?.show_date ?? "",
    clubName: shows?.clubs?.name ?? "",
  }));
}
