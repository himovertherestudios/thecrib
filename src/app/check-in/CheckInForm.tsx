"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { RadioCardGroup } from "@/components/ui/RadioCardGroup";
import { createClient } from "@/lib/supabase/client";
import {
  PRIVATE_ACCESS_COPY,
  PROMOTIONAL_PERMISSION_COPY,
  RECORDING_CONSENT_COPY,
} from "@/lib/consent";
import type {
  PrivateContentAccess,
  PromotionalPermission,
  RecordingConsent,
} from "@/lib/database.types";
import { submitCheckIn } from "./actions";
import type { ShowSummary } from "./queries";

function TextField({
  id,
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-stage-300">
        {label}
        {required ? <span className="text-marquee"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="tap-target w-full rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white placeholder:text-stage-500 focus:border-marquee focus:outline-none"
      />
    </div>
  );
}

/**
 * Step shown right after check-in: a comedian's private dashboard requires
 * an authenticated Supabase session, and we want that set up in the same
 * flow — no separate trip to /login later. Reuses the email they just
 * entered and asks for the 6-digit code from the same passwordless email
 * (see README: the Supabase "Magic Link" template must include
 * `{{ .Token }}` for this code to actually appear in the email).
 */
function VerifyCodeStep({ email, privateContentRequested }: { email: string; privateContentRequested: boolean }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
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

    // Full page load so the server sees the freshly-set session cookie and
    // links this comedian_profile to the new account immediately.
    window.location.href = "/dashboard";
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setIsResending(false);
    setNotice(resendError ? null : "Sent a new code.");
    if (resendError) setError(resendError.message);
  }

  return (
    <div className="rounded-xl2 border border-emerald-500/30 bg-emerald-500/10 p-6">
      <p className="font-display text-2xl font-semibold text-white">You&apos;re checked in.</p>
      {privateContentRequested ? (
        <p className="mt-2 text-sm leading-relaxed text-stage-300">
          When your set is ready, we&apos;ll send you private access.
        </p>
      ) : null}

      <div className="mt-6 border-t border-emerald-500/20 pt-6">
        <p className="text-sm font-medium text-white">One more step — access your dashboard</p>
        <p className="mt-1 text-sm leading-relaxed text-stage-300">
          We sent a code to <span className="text-white">{email}</span>. Enter it below to set up
          private access to your own sets.
        </p>

        <form onSubmit={handleVerify} className="mt-4 flex flex-col gap-3">
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
            {isVerifying ? "Verifying…" : "Access my dashboard"}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-sm text-stage-400 hover:text-white disabled:opacity-50"
          >
            {isResending ? "Sending…" : "Didn't get a code? Resend"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function CheckInForm({ show }: { show: ShowSummary }) {
  const [stageName, setStageName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [expectedSetLengthMinutes, setExpectedSetLengthMinutes] = useState("");

  const [recordingConsent, setRecordingConsent] = useState<RecordingConsent | null>(null);
  const [privateContentAccess, setPrivateContentAccess] = useState<PrivateContentAccess | null>(
    null,
  );
  const [promotionalPermission, setPromotionalPermission] =
    useState<PromotionalPermission | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ privateContentRequested: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!recordingConsent) {
      setError("Please choose a recording permission option.");
      return;
    }
    if (!privateContentAccess) {
      setError("Please choose a private access option.");
      return;
    }
    if (!promotionalPermission) {
      setError("Please choose a promotional permission option.");
      return;
    }

    const formData = new FormData();
    formData.set("showId", show.id);
    formData.set("stageName", stageName);
    formData.set("legalName", legalName);
    formData.set("email", email);
    formData.set("phone", phone);
    formData.set("instagram", instagram);
    formData.set("tiktok", tiktok);
    formData.set("expectedSetLengthMinutes", expectedSetLengthMinutes);
    formData.set("recordingConsent", recordingConsent);
    formData.set("privateContentAccess", privateContentAccess);
    formData.set("promotionalPermission", promotionalPermission);

    startTransition(async () => {
      const response = await submitCheckIn(formData);
      if (!response.ok) {
        setError(response.error);
        return;
      }

      // Check-in + consent are already saved server-side at this point,
      // regardless of what happens below. Sending the OTP is what lets
      // this same page continue straight into their dashboard instead of
      // sending them off to find /login on their own later.
      const supabase = createClient();
      await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      setResult({ privateContentRequested: response.privateContentRequested });
    });
  }

  if (result) {
    return <VerifyCodeStep email={email} privateContentRequested={result.privateContentRequested} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-white">Your info</h2>
        <TextField id="stageName" label="Stage Name" required value={stageName} onChange={setStageName} />
        <TextField id="legalName" label="Legal Name" value={legalName} onChange={setLegalName} />
        <TextField id="email" label="Email" type="email" required value={email} onChange={setEmail} />
        <TextField id="phone" label="Phone" type="tel" value={phone} onChange={setPhone} />
        <TextField id="instagram" label="Instagram" value={instagram} onChange={setInstagram} placeholder="@handle" />
        <TextField id="tiktok" label="TikTok" value={tiktok} onChange={setTiktok} placeholder="@handle" />
        <TextField
          id="expectedSetLengthMinutes"
          label="Expected Set Length (minutes)"
          type="number"
          value={expectedSetLengthMinutes}
          onChange={setExpectedSetLengthMinutes}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-white">
          {RECORDING_CONSENT_COPY.heading}
        </h2>
        <p className="text-sm leading-relaxed text-stage-300">
          {RECORDING_CONSENT_COPY.description}
        </p>
        <RadioCardGroup
          name="recordingConsent"
          options={RECORDING_CONSENT_COPY.options}
          value={recordingConsent}
          onChange={setRecordingConsent}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-white">
          {PRIVATE_ACCESS_COPY.heading}
        </h2>
        <RadioCardGroup
          name="privateContentAccess"
          options={PRIVATE_ACCESS_COPY.options}
          value={privateContentAccess}
          onChange={setPrivateContentAccess}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-white">
          {PROMOTIONAL_PERMISSION_COPY.heading}
        </h2>
        <RadioCardGroup
          name="promotionalPermission"
          options={PROMOTIONAL_PERMISSION_COPY.options}
          value={promotionalPermission}
          onChange={setPromotionalPermission}
        />
        <p className="text-sm text-stage-400">{PROMOTIONAL_PERMISSION_COPY.footnote}</p>
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Checking in…" : "Check in"}
      </Button>
    </form>
  );
}
