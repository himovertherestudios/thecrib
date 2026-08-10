import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen bg-stage-950">
      <header className="border-b border-stage-700 bg-stage-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-display text-lg font-semibold text-white">
            TheCrib <span className="text-marquee">Admin</span>
          </Link>
          <nav className="flex gap-6 text-sm text-stage-300">
            <Link href="/admin" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/admin/shows" className="hover:text-white">
              Shows
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
