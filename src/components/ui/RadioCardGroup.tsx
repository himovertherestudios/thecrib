"use client";

type Option<T extends string> = { value: T; label: string };

export function RadioCardGroup<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`tap-target flex cursor-pointer items-start gap-3 rounded-xl2 border px-4 py-3 text-base transition-colors ${
              selected
                ? "border-marquee bg-marquee/10 text-white"
                : "border-stage-600 bg-stage-850 text-stage-300 hover:border-stage-500"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="mt-1 h-4 w-4 shrink-0 accent-marquee"
            />
            <span className="leading-snug">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
