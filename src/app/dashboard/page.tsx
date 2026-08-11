import Link from "next/link";
import { getCurrentUser, getComedianProfileForUser } from "@/lib/auth";
import { getComedianPerformances } from "./queries";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const comedianProfile = user ? await getComedianProfileForUser(user.id) : null;
  const performances = comedianProfile ? await getComedianPerformances(comedianProfile.id) : [];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Welcome, {comedianProfile?.stage_name ?? "comedian"}
      </h1>

      {!comedianProfile ? (
        <p className="mt-3 text-sm text-stage-300">
          We don&apos;t see a comedian profile linked to this account yet. Check in at a show
          with this email address to get started.
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
          Your Sets
        </h2>

        {performances.length === 0 ? (
          <p className="mt-3 text-sm text-stage-300">No performances are available yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {performances.map((performance) => (
              <li key={performance.id}>
                <Link
                  href={`/dashboard/sets/${performance.id}`}
                  className="block rounded-xl2 border border-stage-700 bg-stage-850 px-4 py-3 hover:border-stage-500"
                >
                  <p className="text-white">{performance.showTitle}</p>
                  <p className="text-sm text-stage-400">
                    {performance.clubName} ·{" "}
                    {performance.showDate ? new Date(performance.showDate).toLocaleDateString() : ""}
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
