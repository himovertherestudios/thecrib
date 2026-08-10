import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-marquee text-white hover:bg-marquee-muted active:bg-marquee disabled:bg-stage-700 disabled:text-stage-400",
  secondary:
    "bg-stage-800 text-white border border-stage-600 hover:bg-stage-700 disabled:text-stage-500",
  ghost: "bg-transparent text-stage-300 hover:text-white disabled:text-stage-500",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className = "", variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`tap-target inline-flex w-full items-center justify-center rounded-xl2 px-5 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});
