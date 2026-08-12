/**
 * Supabase's raw OTP-send errors are either an internal-sounding SMTP
 * failure or, most often in practice, its own per-email rate limit
 * ("For security purposes, you can only request this after N seconds") —
 * neither is something a comedian should see verbatim.
 */
export function friendlyOtpErrorMessage(error: { code?: string; status?: number } | null): string | null {
  if (!error) return null;
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "Please wait about a minute before requesting another code.";
  }
  return "We couldn't send you a code just now. Tap resend in a moment, or try again.";
}
