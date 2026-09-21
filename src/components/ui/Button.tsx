import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-brand-green to-brand-green-dark text-brand-cream shadow-md hover:brightness-110",
  outline:
    "border border-brand-line bg-transparent text-brand-ink hover:bg-brand-line/25",
  ghost: "bg-transparent text-brand-ink hover:bg-brand-line/25",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * The one button shape used across the app — pill radius, brand
 * gradient for the primary action. Pulled out of login/forgot-pin
 * (which had this exact class string duplicated) so every screen
 * after this one starts from a shared component instead of copying
 * Tailwind classes around.
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
