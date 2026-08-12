import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateQrDataUrl } from "@/lib/qr";
import { getSiteOrigin } from "@/lib/url";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import {
  PROMOTIONAL_PERMISSION_LABEL,
  RECORDING_CONSENT_LABEL,
  PRIVATE_ACCESS_LABEL,
} from "@/lib/consent";
import type { CheckIn, ConsentRecord, ShowStatus } from "@/lib/database.types";
import { createPerformanceFromCheckIn } from "../../performances/actions";
import { updateShow, deleteShow } from "../../actions";

const SHOW_STATUS_OPTIONS: ShowStatus[] = ["scheduled", "live", "completed", "cancelled"];

interface ShowDetailRow {
  id: string;
  title: string;
  show_date: string;
  status: ShowStatus;
  clubs: { name: string; organization_id: string } | null;
}

interface CheckInWithConsentRow extends CheckIn {
  consent_records: ConsentRecord | ConsentRecord[] | null;
}

function firstConsent(consent: ConsentRecord | ConsentRecord[] | null): ConsentRecord | null {
  return Array.isArray(consent) ? consent[0] ?? null : consent;
}

export default async function AdminShowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ showId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { showId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: show } = await supabase
    .from("shows")
    .select<"id, title, show_date, status, clubs ( name, organization_id )", ShowDetailRow>(
      "id, title, show_date, status, clubs ( name, organization_id )",
    )
    .eq("id", showId)
    .maybeSingle();

  if (!show) notFound();

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select<"*, consent_records ( * )", CheckInWithConsentRow>("*, consent_records ( * )")
    .eq("show_id", showId)
    .order("checked_in_at", { ascending: false });

  const { data: performances } = await supabase
    .from("performances")
    .select("id, check_in_id")
    .eq("show_id", showId);

  const performanceIdByCheckIn = new Map(
    (performances ?? [])
      .filter((p): p is { id: string; check_in_id: string } => p.check_in_id !== null)
      .map((p) => [p.check_in_id, p.id]),
  );

  const origin = await getSiteOrigin();
  const checkInUrl = `${origin}/check-in?show=${showId}`;
  const qrDataUrl = await generateQrDataUrl(checkInUrl);

  const deniedRecordingCount =
    checkIns?.filter((ci) => firstConsent(ci.consent_records)?.recording_consent === "denied")
      .length ?? 0;

  return (
    <div>
      <p className="text-sm text-stage-400">{show.clubs?.name}</p>
      <h1 className="font-display text-2xl font-semibold text-white">{show.title}</h1>
      <p className="mt-1 text-sm text-stage-300">
        {new Date(show.show_date).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {deniedRecordingCount > 0 ? (
        <div className="mt-6 rounded-xl2 border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-red-400">
            {deniedRecordingCount} comedian{deniedRecordingCount === 1 ? "" : "s"} did NOT
            consent to recording — do not record or use their footage.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_240px]">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Check-ins
          </h2>

          {!checkIns || checkIns.length === 0 ? (
            <p className="mt-3 text-sm text-stage-300">No check-ins yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {checkIns.map((checkIn) => {
                const consent = firstConsent(checkIn.consent_records);
                const recordingDenied = consent?.recording_consent === "denied";

                return (
                  <li
                    key={checkIn.id}
                    className={`rounded-xl2 border px-4 py-4 ${
                      recordingDenied
                        ? "border-red-500/50 bg-red-500/5"
                        : "border-stage-700 bg-stage-850"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{checkIn.stage_name}</p>
                        <p className="text-sm text-stage-400">{checkIn.email}</p>
                      </div>
                      <p className="text-xs text-stage-400">
                        {new Date(checkIn.checked_in_at).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {consent ? (
                        <>
                          <Badge tone={recordingDenied ? "bad" : "good"}>
                            Recording: {RECORDING_CONSENT_LABEL[consent.recording_consent]}
                          </Badge>
                          <Badge
                            tone={
                              consent.promotional_permission === "approved"
                                ? "good"
                                : consent.promotional_permission === "ask_first"
                                  ? "warn"
                                  : "bad"
                            }
                          >
                            Promo: {PROMOTIONAL_PERMISSION_LABEL[consent.promotional_permission]}
                          </Badge>
                          <Badge tone="neutral">
                            Private access:{" "}
                            {PRIVATE_ACCESS_LABEL[consent.private_content_access]}
                          </Badge>
                        </>
                      ) : (
                        <Badge tone="warn">No consent recorded</Badge>
                      )}
                    </div>

                    <div className="mt-3">
                      {performanceIdByCheckIn.has(checkIn.id) ? (
                        <Link
                          href={`/admin/performances/${performanceIdByCheckIn.get(checkIn.id)}`}
                          className="text-sm text-marquee hover:text-marquee-muted"
                        >
                          View performance →
                        </Link>
                      ) : (
                        <form action={createPerformanceFromCheckIn}>
                          <input type="hidden" name="checkInId" value={checkIn.id} />
                          <input type="hidden" name="showId" value={showId} />
                          <Button type="submit" variant="secondary" className="w-auto px-4 py-2 text-sm">
                            Create performance
                          </Button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Check-in QR code
          </h2>
          <div className="mt-3 rounded-xl2 border border-stage-700 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Check-in QR code" className="h-auto w-full" />
          </div>
          <p className="mt-2 break-all text-xs text-stage-500">{checkInUrl}</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Edit show
          </h2>
          <form
            action={updateShow}
            className="mt-3 flex flex-col gap-3 rounded-xl2 border border-stage-700 bg-stage-900 p-4"
          >
            <input type="hidden" name="showId" value={show.id} />
            <input
              name="title"
              required
              defaultValue={show.title}
              placeholder="Show title"
              className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
            />
            <input
              name="showDate"
              type="date"
              required
              defaultValue={show.show_date}
              className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
            />
            <select
              name="status"
              defaultValue={show.status}
              className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
            >
              {SHOW_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Save changes
            </Button>
          </form>

          <form action={deleteShow} className="mt-3">
            <input type="hidden" name="showId" value={show.id} />
            <input
              type="hidden"
              name="organizationId"
              value={show.clubs?.organization_id ?? ""}
            />
            <ConfirmSubmitButton
              variant="ghost"
              confirmMessage={`Delete "${show.title}"? This permanently deletes all of its check-ins, performances, and video asset records. This cannot be undone.`}
              className="text-red-400 hover:text-red-300"
            >
              Delete show
            </ConfirmSubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
