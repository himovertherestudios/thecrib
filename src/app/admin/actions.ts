"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { notifyOrgInvite } from "@/lib/email/notify-org-invite";
import type { OrgRole, ShowStatus } from "@/lib/database.types";

/**
 * All admin mutations below use the RLS-respecting server client (not the
 * service-role client) so Postgres RLS — not application code — is the
 * authority on who may create an organization, club, or show, and who
 * becomes an org's first admin.
 */

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin?error=Organization name is required");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Generate the id up front instead of reading it back after insert.
  // The "select an org back" RLS policy requires org membership, which
  // doesn't exist until the organization_members insert just below —
  // reading back via .select() here would be blocked by RLS before that
  // membership row exists.
  const organizationId = crypto.randomUUID();

  const { error: orgError } = await supabase
    .from("organizations")
    .insert({ id: organizationId, name, slug: slugify(name) });

  if (orgError) {
    redirect(`/admin?error=${encodeURIComponent("Could not create organization.")}`);
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({ organization_id: organizationId, user_id: userData.user!.id, role: "admin" });

  if (memberError) {
    redirect(`/admin?error=${encodeURIComponent("Could not assign you as admin.")}`);
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function createClub(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "America/New_York";

  if (!organizationId || !name) {
    redirect(`/admin/shows?org=${organizationId}&error=${encodeURIComponent("Club name is required.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clubs").insert({
    organization_id: organizationId,
    name,
    slug: slugify(name),
    address: address || null,
    timezone,
  });

  if (error) {
    redirect(
      `/admin/shows?org=${organizationId}&error=${encodeURIComponent("Could not create club.")}`,
    );
  }

  revalidatePath("/admin/shows");
  redirect(`/admin/shows?org=${organizationId}`);
}

export async function createShow(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const clubId = String(formData.get("clubId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const showDate = String(formData.get("showDate") ?? "");

  if (!clubId || !title || !showDate) {
    redirect(
      `/admin/shows?org=${organizationId}&error=${encodeURIComponent("Club, title, and date are required.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("shows").insert({
    club_id: clubId,
    title,
    show_date: showDate,
  });

  if (error) {
    redirect(
      `/admin/shows?org=${organizationId}&error=${encodeURIComponent("Could not create show.")}`,
    );
  }

  revalidatePath("/admin/shows");
  redirect(`/admin/shows?org=${organizationId}`);
}

export async function inviteTeammate(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as OrgRole;

  if (!organizationId || !email || (role !== "admin" && role !== "staff")) {
    redirect(
      `/admin/team?org=${organizationId}&error=${encodeURIComponent("Email and role are required.")}`,
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  const { error: inviteError } = await supabase.from("organization_invites").insert({
    organization_id: organizationId,
    email,
    role,
    invited_by: userData.user!.id,
  });

  if (inviteError) {
    const message =
      inviteError.code === "23505"
        ? "There's already a pending invite for this email."
        : "Could not create the invite.";
    redirect(`/admin/team?org=${organizationId}&error=${encodeURIComponent(message)}`);
  }

  await notifyOrgInvite({ email, organizationName: organization?.name ?? "TheCrib", role });

  revalidatePath("/admin/team");
  redirect(`/admin/team?org=${organizationId}`);
}

export async function revokeInvite(formData: FormData) {
  const inviteId = String(formData.get("inviteId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");

  const supabase = await createClient();
  await supabase.from("organization_invites").delete().eq("id", inviteId);

  revalidatePath("/admin/team");
  redirect(`/admin/team?org=${organizationId}`);
}

export async function updateShow(formData: FormData) {
  const showId = String(formData.get("showId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const showDate = String(formData.get("showDate") ?? "");
  const status = String(formData.get("status") ?? "") as ShowStatus;

  if (!showId || !title || !showDate) {
    redirect(
      `/admin/shows/${showId}?error=${encodeURIComponent("Title and date are required.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shows")
    .update({ title, show_date: showDate, status })
    .eq("id", showId);

  if (error) {
    redirect(`/admin/shows/${showId}?error=${encodeURIComponent("Could not update show.")}`);
  }

  revalidatePath(`/admin/shows/${showId}`);
  redirect(`/admin/shows/${showId}`);
}

/**
 * Deleting a show cascades to its performances, video_assets, check_ins,
 * and consent_records (all on delete cascade) — the confirmation copy in
 * the UI says so explicitly, since this is the one action here that
 * can't be undone from within the app.
 */
export async function deleteShow(formData: FormData) {
  const showId = String(formData.get("showId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");

  const supabase = await createClient();
  await supabase.from("shows").delete().eq("id", showId);

  revalidatePath("/admin/shows");
  redirect(`/admin/shows?org=${organizationId}`);
}
