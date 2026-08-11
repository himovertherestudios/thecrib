import Link from "next/link";

export function LegalDocument({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 safe-bottom">
      <Link href="/" className="text-sm text-stage-400 hover:text-white">
        ← Back to TheCrib
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-1 text-sm text-stage-400">Last updated: {lastUpdated}</p>
      <div className="mt-8 flex flex-col gap-6">{children}</div>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-white">{heading}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-stage-300">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5">
      {items.map((item, i) => (
        <li key={i} className="mt-1">
          {item}
        </li>
      ))}
    </ul>
  );
}
