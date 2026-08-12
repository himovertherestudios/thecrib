import "server-only";
import { getSiteOrigin } from "@/lib/url";
import { sendEmail } from "./send-email";
import type { OrgRole } from "@/lib/database.types";

/**
 * Sent when an admin invites someone to join their organization. Points
 * at /login rather than a dedicated accept-invite page — signing in with
 * this email is the entire acceptance flow (see
 * claimPendingOrgInvites in src/lib/auth.ts), including for someone who
 * has never had an account before.
 */
export async function notifyOrgInvite({
  email,
  organizationName,
  role,
}: {
  email: string;
  organizationName: string;
  role: OrgRole;
}): Promise<void> {
  const origin = await getSiteOrigin();
  const loginUrl = `${origin}/login`;

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName} on TheCrib`,
    html: `
      <p>You've been invited to join <strong>${organizationName}</strong> on TheCrib as ${role === "admin" ? "an admin" : "a staff member"}.</p>
      <p><a href="${loginUrl}">Sign in with this email address</a> to accept. If you don't have an account yet, signing in will create one.</p>
    `,
  });
}
