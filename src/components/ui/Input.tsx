import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Keep the label for screen readers but not sighted layout — the
   * pill inputs on login/forgot-pin rely on the placeholder instead. */
  hideLabel?: boolean;
  error?: string;
}

/**
 * The one text-input shape used across the app — pill radius, brand
 * focus ring, an optional visible-or-sr-only label and inline error.
 * `id` is required by InputHTMLAttributes' typing but effectively
 * mandatory here too: the label needs it to stay associated with the
 * field.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel, error, id, className = "", ...props },
  ref
) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className={
          hideLabel
            ? "sr-only"
            : "mb-1 block text-sm font-medium text-brand-ink"
        }
      >
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`w-full rounded-full border bg-brand-line/25 px-5 py-3 text-sm text-brand-ink outline-none placeholder:text-brand-ink/50 focus:bg-white focus:ring-2 focus:ring-brand-gold/30 ${
          error
            ? "border-red-400 focus:border-red-400"
            : "border-brand-line focus:border-brand-gold"
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
