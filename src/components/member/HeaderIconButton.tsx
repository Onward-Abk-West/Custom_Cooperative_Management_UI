import type { ButtonHTMLAttributes, ReactNode } from "react";

export function HeaderIconButton({
  label,
  children,
  className = "",
  ...rest
}: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-brand-ink transition hover:bg-brand-line/40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
