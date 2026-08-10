const toneClasses = {
  good: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warn: "bg-spotlight/15 text-spotlight border-spotlight/30",
  bad: "bg-red-500/15 text-red-400 border-red-500/30",
  neutral: "bg-stage-700 text-stage-300 border-stage-600",
} as const;

export function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: keyof typeof toneClasses;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
