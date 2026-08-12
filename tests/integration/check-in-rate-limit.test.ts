import { afterAll, describe, expect, it, vi } from "vitest";
import { serviceClient } from "../helpers/supabase";

// A unique fake IP per test run so this never collides with real traffic
// or another concurrent run's rate-limit state.
const testIp = `203.0.113.${Math.floor(Math.random() * 255)}`;

vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", testIp]]),
}));

describe("check-in rate limiting", () => {
  afterAll(async () => {
    await serviceClient().from("check_in_rate_limits").delete().eq("ip_address", testIp);
  });

  it("allows up to 5 attempts and blocks the 6th within the window", async () => {
    const { checkAndRecordCheckInAttempt } = await import(
      "@/app/check-in/rate-limit"
    );

    for (let i = 0; i < 5; i++) {
      expect(await checkAndRecordCheckInAttempt()).toBe(true);
    }
    expect(await checkAndRecordCheckInAttempt()).toBe(false);
  });

  it("does not record an attempt for a blocked call, so a blocked caller can't self-extend", async () => {
    const admin = serviceClient();
    const { count: before } = await admin
      .from("check_in_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", testIp);

    const { checkAndRecordCheckInAttempt } = await import(
      "@/app/check-in/rate-limit"
    );
    expect(await checkAndRecordCheckInAttempt()).toBe(false);

    const { count: after } = await admin
      .from("check_in_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", testIp);

    expect(after).toBe(before);
  });
});
