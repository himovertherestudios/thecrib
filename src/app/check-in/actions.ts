"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { CURRENT_CONSENT_VERSION } from "@/lib/consent";
import { checkAndRecordCheckInAttempt } from "@/app/check-in/rate-limit";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const CheckInSchema = z.object({
  showId: z.string().uuid(),
  stageName: z.string().trim().min(1, "Stage name is required").max(120),
  legalName: optionalText(120),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(200),
  phone: optionalText(50),
  instagram: optionalText(100),
  tiktok: optionalText(100),
  expectedSetLengthMinutes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 180), {
      message: "Enter a set length between 0 and 180 minutes",
    }),
  recordingConsent: z.enum(["allowed", "denied"], {
    message: "Choose a recording permission option",
  }),
  privateContentAccess: z.enum(["requested", "declined"], {
    message: "Choose a private access option",
  }),
  promotionalPermission: z.enum(["approved", "ask_first", "denied"], {
    message: "Choose a promotional permission option",
  }),
});

export type CheckInResult =
  | { ok: true; privateContentRequested: boolean }
  | { ok: false; error: string };

export async function submitCheckIn(formData: FormData): Promise<CheckInResult> {
  // Honeypot: a real visitor never sees or fills this field (hidden off-screen
  // in CheckInForm.tsx). Anything that fills it is a bot — feign success so it
  // doesn't learn to look for a different tell, but write nothing.
  if (formData.get("website")) {
    return { ok: true, privateContentRequested: false };
  }

  const withinRateLimit = await checkAndRecordCheckInAttempt();
  if (!withinRateLimit) {
    return {
      ok: false,
      error: "Too many check-in attempts from your network. Please try again in a few minutes.",
    };
  }

  const parsed = CheckInSchema.safeParse({
    showId: formData.get("showId"),
    stageName: formData.get("stageName"),
    legalName: formData.get("legalName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    instagram: formData.get("instagram"),
    tiktok: formData.get("tiktok"),
    expectedSetLengthMinutes: formData.get("expectedSetLengthMinutes"),
    recordingConsent: formData.get("recordingConsent"),
    privateContentAccess: formData.get("privateContentAccess"),
    promotionalPermission: formData.get("promotionalPermission"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message ?? "Please check the form and try again." };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const supabase = createAdminClient();

  const { data: show, error: showError } = await supabase
    .from("shows")
    .select("id")
    .eq("id", data.showId)
    .maybeSingle();

  if (showError || !show) {
    return { ok: false, error: "This show could not be found. Please rescan the QR code." };
  }

  const { data: existingProfile } = await supabase
    .from("comedian_profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  let comedianProfileId: string;

  if (existingProfile) {
    comedianProfileId = existingProfile.id;
    await supabase
      .from("comedian_profiles")
      .update({
        stage_name: data.stageName,
        legal_name: data.legalName,
        phone: data.phone,
        instagram: data.instagram,
        tiktok: data.tiktok,
      })
      .eq("id", comedianProfileId);
  } else {
    const { data: newProfile, error: insertError } = await supabase
      .from("comedian_profiles")
      .insert({
        stage_name: data.stageName,
        legal_name: data.legalName,
        email,
        phone: data.phone,
        instagram: data.instagram,
        tiktok: data.tiktok,
      })
      .select("id")
      .single();

    if (insertError || !newProfile) {
      return { ok: false, error: "Something went wrong saving your profile. Please try again." };
    }
    comedianProfileId = newProfile.id;
  }

  const { data: checkIn, error: checkInError } = await supabase
    .from("check_ins")
    .insert({
      show_id: data.showId,
      comedian_profile_id: comedianProfileId,
      stage_name: data.stageName,
      legal_name: data.legalName,
      email,
      phone: data.phone,
      instagram: data.instagram,
      tiktok: data.tiktok,
      expected_set_length_seconds:
        data.expectedSetLengthMinutes !== null ? data.expectedSetLengthMinutes * 60 : null,
    })
    .select("id")
    .single();

  if (checkInError || !checkIn) {
    return { ok: false, error: "Something went wrong checking you in. Please try again." };
  }

  const { error: consentError } = await supabase.from("consent_records").insert({
    check_in_id: checkIn.id,
    comedian_profile_id: comedianProfileId,
    show_id: data.showId,
    recording_consent: data.recordingConsent,
    private_content_access: data.privateContentAccess,
    promotional_permission: data.promotionalPermission,
    consent_version: CURRENT_CONSENT_VERSION,
  });

  if (consentError) {
    return { ok: false, error: "Something went wrong saving your consent. Please try again." };
  }

  return { ok: true, privateContentRequested: data.privateContentAccess === "requested" };
}
