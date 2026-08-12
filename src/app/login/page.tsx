"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { friendlyOtpErrorMessage } from "@/lib/otp";

/**
 * Code entry is the primary path here, not just the magic link — a link
 * opened from an email app's in-app browser doesn't share cookies with
 * whatever browser requested it, which silently breaks the PKCE code
 * exchange in /auth/callback and dead-ends at `?error=auth` with no
 * obvious next step. Entering the code happens in this same tab, so it
 * has no cross-browser dependency to break.
 */
function LoginForm() {
  const searchParams = useSearchParams();
  const linkFailed = searchParams.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    linkFailed
      ? "That sign-in link didn't work. Enter your email below and we'll send you a code instead."
      : null,
  );

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSending(true);

    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSending(false);

    if (sendError) {
      setError(friendlyOtpErrorMessage(sendError));
      return;
    }

    setStep("code");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsVerifying(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    setIsVerifying(false);

    if (verifyError) {
      setError("That code didn't work. Check it and try again.");
      return;
    }

    // A brand-new admin/staff invite has no comedian_profiles row to land
    // on at /dashboard — send them straight to /admin instead, where
    // claimPendingOrgInvites() picks up the invite and completes it.
    const { data: pendingInvite } = await supabase
      .from("organization_invites")
      .select("id")
      .is("accepted_at", null)
      .eq("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();

    window.location.href = pendingInvite ? "/admin" : "/dashboard";
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsSending(true);

    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSending(false);
    setNotice(sendError ? null : "Sent a new code.");
    setError(friendlyOtpErrorMessage(sendError));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-stage-300">
          {step === "email" ? (
            "Enter your email and we'll send you a code."
          ) : (
            <>
              We sent a code to <span className="text-white">{email}</span>. Enter it below.
            </>
          )}
        </p>

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-8 flex flex-col gap-4">
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

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <Button type="submit" disabled={isSending}>
              {isSending ? "Sending code…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-8 flex flex-col gap-3">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={12}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Enter code"
              className="tap-target w-full rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-center text-lg tracking-[0.3em] text-white placeholder:text-stage-500 focus:border-marquee focus:outline-none"
            />

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}

            <Button type="submit" disabled={isVerifying || code.trim().length === 0}>
              {isVerifying ? "Verifying…" : "Sign in"}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isSending}
              className="text-sm text-stage-400 hover:text-white disabled:opacity-50"
            >
              {isSending ? "Sending…" : "Didn't get a code? Resend"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
