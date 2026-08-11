import "server-only";
import { headers } from "next/headers";

export async function getSiteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    // Strip any trailing slash — callers always append their own leading
    // slash (e.g. `${origin}/check-in`), and a trailing slash here would
    // silently double it up.
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
