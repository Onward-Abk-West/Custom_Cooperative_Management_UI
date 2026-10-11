"use client";

import { useState } from "react";

const SIZES = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

/**
 * A member's profile picture, or their initial when there is none (or
 * the image fails to load). One component so a picture looks the same
 * everywhere a member appears: lists, headers, cards, the sidebar.
 * `onDark` is for use on a coloured card.
 */
export function Avatar({
  pictureUrl,
  name,
  email,
  size = "md",
  onDark = false,
  className = "",
}: {
  pictureUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: keyof typeof SIZES;
  onDark?: boolean;
  className?: string;
}) {
  // Remember which URL failed so a different picture gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPicture = Boolean(pictureUrl) && failedUrl !== pictureUrl;
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-semibold ${SIZES[size]} ${
        onDark
          ? "border-white/40 bg-white/20 text-white"
          : "border-brand-line bg-brand-line/25 text-brand-ink/60"
      } ${className}`}
    >
      {showPicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl as string}
          alt=""
          onError={() => setFailedUrl(pictureUrl ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  );
}
