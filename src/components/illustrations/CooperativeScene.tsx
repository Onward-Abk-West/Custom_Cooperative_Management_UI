/**
 * Wider cooperative-themed scene: farmland under a rising sun with a
 * circle of joined hands in the foreground (the cooperative — members
 * working the same land, sharing one record of it). Used as the login
 * page's hero panel and the splash screen's backdrop.
 *
 * This is a hand-authored SVG illustration, not a stock photo — there's
 * no legitimate source of real cooperative photography to license here,
 * and a generic stock image would say nothing specific about THIS
 * cooperative anyway. The illustration is deliberately literal instead:
 * wheat = the societies' agricultural base, joined hands = the
 * cooperative structure itself, sunrise = "Onward".
 */
export function CooperativeScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 480"
      className={className}
      role="img"
      aria-label="Illustration of farmland and joined hands, representing the cooperative"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCEFD0" />
          <stop offset="55%" stopColor="#F6D998" />
          <stop offset="100%" stopColor="#E9B85A" />
        </linearGradient>
        <linearGradient id="hill-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C9A5E" />
          <stop offset="100%" stopColor="#5E7C46" />
        </linearGradient>
        <linearGradient id="hill-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3F6B3A" />
          <stop offset="100%" stopColor="#2F5230" />
        </linearGradient>
      </defs>

      <rect width="640" height="480" fill="url(#sky)" />

      {/* sun */}
      <circle cx="320" cy="190" r="70" fill="#F2B33D" opacity="0.9" />
      <circle cx="320" cy="190" r="70" fill="none" stroke="#D98C1F" strokeWidth="2" opacity="0.6" />

      {/* rolling farmland */}
      <path
        d="M0 300 C 120 260, 220 320, 340 280 C 440 250, 540 300, 640 270 L640 480 L0 480 Z"
        fill="url(#hill-far)"
      />
      <path
        d="M0 360 C 100 330, 240 390, 360 350 C 460 320, 560 370, 640 340 L640 480 L0 480 Z"
        fill="url(#hill-near)"
      />

      {/* wheat rows, simple repeated strokes to suggest cultivated fields */}
      <g stroke="#D9B25A" strokeWidth="2" opacity="0.55">
        {Array.from({ length: 14 }).map((_, i) => {
          const x = 20 + i * 46;
          return <path key={i} d={`M${x} 470 L${x + 10} 400`} />;
        })}
      </g>

      {/* circle of joined hands — the cooperative */}
      <g transform="translate(320 400)">
        <circle r="58" fill="#FCEFD0" opacity="0.9" />
        <circle r="58" fill="none" stroke="#B9791C" strokeWidth="2" />
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * 34;
          const y = Math.sin(angle) * 34;
          const hue = i % 2 === 0 ? "#3F6B3A" : "#8C5A2B";
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle r="10" fill={hue} />
            </g>
          );
        })}
        <circle r="14" fill="#F2B33D" />
      </g>
    </svg>
  );
}
