import { getShowSummary } from "./queries";
import { CheckInForm } from "./CheckInForm";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show: showId } = await searchParams;
  const show = showId ? await getShowSummary(showId) : null;

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10 safe-bottom">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-marquee">Check-in</p>

      {!showId || !show ? (
        <div className="mt-6 rounded-xl2 border border-stage-600 bg-stage-850 p-6">
          <h1 className="font-display text-2xl font-semibold text-white">
            {showId ? "Show not found" : "Scan the QR code at the venue"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stage-300">
            {showId
              ? "We couldn't find that show. Ask a staff member for the correct check-in QR code."
              : "This check-in link needs a specific show. Look for the QR code posted at the club, or ask a staff member for it."}
          </p>
        </div>
      ) : (
        <>
          <h1 className="mt-2 font-display text-2xl font-semibold text-white">{show.title}</h1>
          <p className="mt-1 text-sm text-stage-300">
            {show.clubName} · {new Date(show.showDate).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>

          <div className="mt-8">
            <CheckInForm show={show} />
          </div>
        </>
      )}
    </main>
  );
}
