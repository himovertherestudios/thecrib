import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full max-w-sm">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-marquee">TheCrib</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-white">
          You stay in control of your material.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stage-300">
          Check in at the club, set your own recording and promotional consent, and access your
          sets privately when they&apos;re ready.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link href="/login">
            <Button variant="primary">Sign in</Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-stage-400">
          Scanning a club QR code? Use the code at the venue to check in — it will take you
          straight to the right show.
        </p>

        <p className="mt-10 text-xs text-stage-500">
          <Link href="/privacy" className="underline hover:text-stage-300">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="underline hover:text-stage-300">
            Terms of Service
          </Link>
        </p>
      </div>
    </main>
  );
}
