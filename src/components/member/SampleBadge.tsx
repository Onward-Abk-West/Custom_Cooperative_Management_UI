/**
 * Marks screens that show hand-authored sample figures (the API has no
 * passbook / transactions endpoints yet — see src/lib/member-sample-data.ts).
 * `onGreen` is the variant for use on the solid green hero card.
 */
export function SampleBadge({
  tone = "gold",
  className = "",
}: {
  tone?: "gold" | "onGreen";
  className?: string;
}) {
  const colors =
    tone === "onGreen"
      ? "border-brand-cream/40 bg-brand-cream/15 text-brand-cream"
      : "border-brand-gold/50 bg-brand-gold/10 text-brand-gold-dark";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors} ${className}`}
    >
      Sample figures
    </span>
  );
}
