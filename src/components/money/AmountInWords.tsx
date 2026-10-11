import { formatNairaExact, nairaInWords, parseAmountInput } from "@/lib/money";

/**
 * Live read-back shown under an amount box: what was typed, comma
 * formatted, and spelled out in words, so a mistyped extra zero is
 * obvious before the transaction is recorded. Renders nothing for an
 * empty or invalid entry.
 */
export function AmountInWords({ raw, className = "" }: { raw: string; className?: string }) {
  const value = parseAmountInput(raw);
  if (value === null || value <= 0) return null;
  return (
    <p aria-live="polite" className={`mt-1.5 px-1 text-sm leading-snug ${className}`}>
      <span className="font-bold tabular-nums text-heading">{formatNairaExact(value)}</span>
      <span className="block text-brand-ink/70">{nairaInWords(value)}</span>
    </p>
  );
}
