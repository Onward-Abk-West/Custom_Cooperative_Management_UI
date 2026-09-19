/**
 * Small brand mark: a rising sun over a sheaf of wheat inside a circle,
 * used wherever a compact logo is needed (splash screen, login header).
 * Hand-drawn as SVG rather than a photo/import — no image asset needed,
 * scales cleanly, and themes with currentColor + the two accent colors.
 */
export function CooperativeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      role="img"
      aria-label="Onward Abeokuta-West cooperative mark"
    >
      <circle cx="48" cy="48" r="46" className="fill-[var(--brand-cream)]" />
      <circle
        cx="48"
        cy="48"
        r="46"
        fill="none"
        strokeWidth="2"
        className="stroke-[var(--brand-gold)]"
      />
      {/* sun */}
      <circle cx="48" cy="38" r="12" className="fill-[var(--brand-gold)]" />
      {/* wheat stalks */}
      <g className="stroke-[var(--brand-green)]" strokeWidth="2.5" strokeLinecap="round">
        <path d="M48 40 V78" fill="none" />
        <path d="M34 46 L48 40" fill="none" />
        <path d="M62 46 L48 40" fill="none" />
      </g>
      <g className="fill-[var(--brand-green)]">
        {[52, 58, 64, 70].map((y) => (
          <g key={y}>
            <ellipse cx="42" cy={y} rx="5" ry="2.6" transform={`rotate(-30 42 ${y})`} />
            <ellipse cx="54" cy={y} rx="5" ry="2.6" transform={`rotate(30 54 ${y})`} />
          </g>
        ))}
      </g>
    </svg>
  );
}
