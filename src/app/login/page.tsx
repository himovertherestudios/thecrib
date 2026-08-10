"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-stage-300">
          We&apos;ll email you a link — no password needed.
        </p>

        {status === "sent" ? (
          <div className="mt-8 rounded-xl2 border border-stage-600 bg-stage-850 p-5">
            <p className="text-white">Check your email.</p>
            <p className="mt-1 text-sm text-stage-300">
              We sent a sign-in link to <span className="text-white">{email}</span>. Open it on
              this device to finish signing in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-stage-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="tap-target w-full rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white placeholder:text-stage-500 focus:border-marquee focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            {status === "error" && errorMessage ? (
              <p className="text-sm text-red-400">{errorMessage}</p>
            ) : null}

            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending link…" : "Send sign-in link"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
