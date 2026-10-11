"use client";

import { useAmountVisibility } from "@/lib/hide-amounts";
import { formatNairaFull } from "@/lib/member-sample-data";

const MASK = "•••••••";

/**
 * A naira figure that respects the member's "hide amounts" choice
 * (src/lib/hide-amounts.ts). `plain` drops the ₦ and uses a short mask,
 * for table cells where width matters.
 */
export function Amount({
  value,
  plain = false,
  className = "",
}: {
  value: number;
  plain?: boolean;
  className?: string;
}) {
  const { hidden } = useAmountVisibility();
  const text = hidden
    ? plain
      ? "••"
      : `₦${MASK}`
    : plain
      ? value.toLocaleString("en-US")
      : formatNairaFull(value);
  return (
    <span className={className} aria-label={hidden ? "Amount hidden" : undefined}>
      {text}
    </span>
  );
}
