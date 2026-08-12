import { describe, expect, it } from "vitest";
import { friendlyOtpErrorMessage } from "@/lib/otp";

describe("friendlyOtpErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(friendlyOtpErrorMessage(null)).toBeNull();
  });

  it("recognizes Supabase's rate-limit error code", () => {
    expect(friendlyOtpErrorMessage({ code: "over_email_send_rate_limit" })).toMatch(/wait/i);
  });

  it("recognizes a bare 429 status as a rate limit even without the code", () => {
    expect(friendlyOtpErrorMessage({ status: 429 })).toMatch(/wait/i);
  });

  it("falls back to a generic message for any other error", () => {
    expect(friendlyOtpErrorMessage({ code: "some_internal_smtp_error", status: 500 })).toMatch(
      /couldn't send/i,
    );
  });
});
