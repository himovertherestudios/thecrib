import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminOrgMemberships } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { createClub, createShow } from "../actions";

interface ShowWithClubRow {
  id: string;
  title: string;
  show_date: string;
  status: string;
  clubs: { name: string } | null;
}

export default async function AdminShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; error?: string }>;
}) {
  const { org: orgParam, error } = await searchParams;
  const orgs = await getAdminOrgMemberships();

  if (orgs.length === 0) redirect("/admin");

  const activeOrg = orgs.find((o) => o.organization_id === orgParam) ?? orgs[0]!;

  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, address, timezone")
    .eq("organization_id", activeOrg.organization_id)
    .order("name");

  const clubIds = clubs?.map((c) => c.id) ?? [];

  const { data: shows }: { data: ShowWithClubRow[] | null } = clubIds.length
    ? await supabase
        .from("shows")
        .select<"id, title, show_date, status, clubs ( name )", ShowWithClubRow>(
          "id, title, show_date, status, clubs ( name )",
        )
        .in("club_id", clubIds)
        .order("show_date", { ascending: false })
    : { data: [] };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold text-white">Shows</h1>

        {orgs.length > 1 ? (
          <form method="get" className="flex items-center gap-2">
            <select
              name="org"
              defaultValue={activeOrg.organization_id}
              className="rounded-xl2 border border-stage-600 bg-stage-850 px-3 py-2 text-sm text-white"
            >
              {orgs.map((org) => (
                <option key={org.organization_id} value={org.organization_id}>
                  {org.organization_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl2 border border-stage-600 px-3 py-2 text-sm text-stage-300 hover:text-white"
            >
              Switch
            </button>
          </form>
        ) : (
          <p className="text-sm text-stage-400">{activeOrg.organization_name}</p>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">Clubs</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {clubs && clubs.length > 0 ? (
              clubs.map((club) => (
                <li
                  key={club.id}
                  className="rounded-xl2 border border-stage-700 bg-stage-850 px-4 py-3"
                >
                  <p className="text-white">{club.name}</p>
                  {club.address ? <p className="text-sm text-stage-400">{club.address}</p> : null}
                </li>
              ))
            ) : (
              <p className="text-sm text-stage-300">No clubs yet.</p>
            )}
          </ul>

          <form action={createClub} className="mt-4 flex flex-col gap-3 rounded-xl2 border border-stage-700 bg-stage-900 p-4">
            <input type="hidden" name="organizationId" value={activeOrg.organization_id} />
            <p className="text-sm font-medium text-white">Add a club</p>
            <input
              name="name"
              required
              placeholder="Club name"
              className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
            />
            <input
              name="address"
              placeholder="Address (optional)"
              className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
            />
            <Button type="submit" variant="secondary">
              Add club
            </Button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">Shows</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {shows && shows.length > 0 ? (
              shows.map((show) => (
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
              ))
            ) : (
              <p className="text-sm text-stage-300">No shows yet.</p>
            )}
          </ul>

          {clubs && clubs.length > 0 ? (
            <form action={createShow} className="mt-4 flex flex-col gap-3 rounded-xl2 border border-stage-700 bg-stage-900 p-4">
              <input type="hidden" name="organizationId" value={activeOrg.organization_id} />
              <p className="text-sm font-medium text-white">Add a show</p>
              <select
                name="clubId"
                required
                className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
              >
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
              <input
                name="title"
                required
                placeholder="Show title"
                className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
              />
              <input
                name="showDate"
                type="date"
                required
                className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
              />
              <Button type="submit" variant="secondary">
                Add show
              </Button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-stage-400">Add a club first.</p>
          )}
        </section>
      </div>
    </div>
  );
}
