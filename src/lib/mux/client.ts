import "server-only";
import Mux from "@mux/mux-node";

let cachedClient: Mux | null = null;

/**
 * Server-only Mux client. Never import this from a "use client" file —
 * the "server-only" import above makes that a build-time error.
 */
export function getMuxClient(): Mux {
  if (cachedClient) return cachedClient;

  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new Error("Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET environment variables.");
  }

  cachedClient = new Mux({
    tokenId,
    tokenSecret,
    jwtSigningKey: process.env.MUX_SIGNING_KEY_ID,
    jwtPrivateKey: process.env.MUX_SIGNING_PRIVATE_KEY,
    webhookSecret: process.env.MUX_WEBHOOK_SECRET,
  });

  return cachedClient;
}
