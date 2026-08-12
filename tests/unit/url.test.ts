import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();
vi.mock("next/headers", () => ({ headers: headersMock }));

describe("getSiteOrigin", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.resetModules();
    headersMock.mockReset();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("prefers NEXT_PUBLIC_SITE_URL when set, stripping any trailing slash", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://thecrib.example.com/";
    const { getSiteOrigin } = await import("@/lib/url");
    expect(await getSiteOrigin()).toBe("https://thecrib.example.com");
  });

  it("falls back to request headers when NEXT_PUBLIC_SITE_URL is unset", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    headersMock.mockResolvedValue(
      new Map([
        ["host", "preview-123.vercel.app"],
        ["x-forwarded-proto", "https"],
      ]),
    );
    const { getSiteOrigin } = await import("@/lib/url");
    expect(await getSiteOrigin()).toBe("https://preview-123.vercel.app");
  });

  it("defaults the protocol to https when x-forwarded-proto is missing", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    headersMock.mockResolvedValue(new Map([["host", "localhost:3000"]]));
    const { getSiteOrigin } = await import("@/lib/url");
    expect(await getSiteOrigin()).toBe("https://localhost:3000");
  });
});
