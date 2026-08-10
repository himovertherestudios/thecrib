import Link from "next/link";
import { getAdminOrgMemberships } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { createOrganization } from "./actions";

interface UpcomingShowRow {
  id: string;
  title: string;
  show_date: string;
  clubs: { name: string } | null;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const orgs = await getAdminOrgMemberships();

  if (orgs.length === 0) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-2xl font-semibold text-white">
          Create your organization
        </h1>
        <p className="mt-2 text-sm text-stage-300">
          You&apos;ll manage clubs and shows underneath it. You become its first admin
          automatically.
        </p>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <form action={createOrganization} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm text-stage-300">
              Organization name
            </label>
            <input
              id="name"
              name="name"
              required
              className="tap-target w-full rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
              placeholder="e.g. Laugh Track Presents"
            />
          </div>
          <Button type="submit">Create organization</Button>
        </form>
      </div>
    );
  }

  const supabase = await createClient();
  const orgIds = orgs.map((o) => o.organization_id);

  const { data: clubRows } = await supabase
    .from("clubs")
    .select("id")
    .in("organization_id", orgIds);
  const clubIds = clubRows?.map((c) => c.id) ?? [];

  const { data: upcomingShows }: { data: UpcomingShowRow[] | null } = clubIds.length
    ? await supabase
        .from("shows")
        .select<"id, title, show_date, clubs ( name )", UpcomingShowRow>(
          "id, title, show_date, clubs ( name )",
        )
        .in("club_id", clubIds)
        .order("show_date", { ascending: true })
        .limit(10)
    : { data: [] };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Dashboard</h1>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
          Your organizations
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {orgs.map((org) => (
            <li
              key={org.organization_id}
              className="rounded-xl2 border border-stage-700 bg-stage-850 px-4 py-3 text-white"
            >
              {org.organization_name}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Upcoming shows
          </h2>
          <Link href="/admin/shows" className="text-sm text-marquee hover:text-marquee-muted">
            Manage shows →
          </Link>
        </div>

        {!upcomingShows || upcomingShows.length === 0 ? (
          <p className="mt-3 text-sm text-stage-300">No shows yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {upcomingShows.map((show) => (
              <li key={show.id}>
                <Link
                  href={`/admin/shows/${show.id}`}
                  className="block rounded-xl2 border border-stage-700 bg-stage-850 px-4 py-3 hover:border-stage-500"
                >
                  <p className="text-white">{show.title}</p>
                  <p className="text-sm text-stage-400">
                    {show.clubs?.name} · {new Date(show.show_date).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
