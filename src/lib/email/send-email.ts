import "server-only";

/**
 * Thin wrapper around Resend's REST API for one-off transactional emails
 * that aren't a Supabase Auth email (magic link / OTP already go through
 * Supabase's own SMTP config — this is for everything else, like a "your
 * set is ready" notice). Uses a plain fetch rather than the Resend SDK
 * since this is the only call site and the API is a single POST.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { ok: false, error: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: `Resend API error (${response.status}): ${body}` };
  }

  return { ok: true };
}
