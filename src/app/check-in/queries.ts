import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ShowSummary {
  id: string;
  title: string;
  showDate: string;
  clubName: string;
}

interface ShowSummaryRow {
  id: string;
  title: string;
  show_date: string;
  clubs: { name: string } | null;
}

/**
 * Reads the minimal, non-sensitive show info needed to render the public
 * check-in page (title, date, club name). Uses the service-role client
 * because this page is unauthenticated by design — `shows` has no public
 * RLS policy, so an anon/browser query would return nothing anyway. The
 * server decides what's safe to show here, not a client-side policy.
 */
export async function getShowSummary(showId: string): Promise<ShowSummary | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shows")
    .select<"id, title, show_date, clubs ( name )", ShowSummaryRow>(
      "id, title, show_date, clubs ( name )",
    )
    .eq("id", showId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    showDate: data.show_date,
    clubName: data.clubs?.name ?? "",
  };
}
