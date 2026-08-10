import Link from "next/link";
import { requireUser, claimComedianProfileIfNeeded } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.email) {
    await claimComedianProfileIfNeeded(user.id, user.email);
  }

  return (
    <div className="min-h-screen bg-stage-950">
      <header className="border-b border-stage-700 bg-stage-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-display text-lg font-semibold text-white">
            TheCrib
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8 safe-bottom">{children}</main>
    </div>
  );
}
