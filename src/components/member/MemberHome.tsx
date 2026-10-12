"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { ChevronRightIcon } from "./MemberIcons";
import { MemberPageHeader } from "./MemberPageHeader";
import { MemberRecordsViewer } from "./MemberRecordsViewer";
import { getMyProfile, type MemberProfileData } from "@/lib/api/members";
import { PROFILE_PICTURE_EVENT } from "@/lib/api/profile-picture";

/**
 * Member dashboard (what /dashboard renders for the Member role — see
 * (app)/dashboard/page.tsx). The society-wide charts mean nothing to a
 * single member, so this shows the member themself: a profile summary
 * (picture, name, status, contact — the same details an officer sees
 * on the member detail page) above their financial records.
 */
export function MemberHome({ fallbackName }: { fallbackName?: string }) {
  const [profile, setProfile] = useState<MemberProfileData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((response) => {
        if (!cancelled && response.success && response.data) setProfile(response.data);
      })
      .catch(() => {
        // Keep the fallback name — the records don't depend on the profile.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPictureChanged(event: Event) {
      const url = (event as CustomEvent<{ url: string | null }>).detail?.url ?? null;
      setProfile((current) => (current ? { ...current, profilePictureUrl: url } : current));
    }
    window.addEventListener(PROFILE_PICTURE_EVENT, onPictureChanged);
    return () => window.removeEventListener(PROFILE_PICTURE_EVENT, onPictureChanged);
  }, []);

  const holder = profile?.name || fallbackName || "Member";
  const firstName = profile?.name ? profile.name.split(/\s+/)[0] : null;
  const contact = [profile?.email, profile?.phoneNumber].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:gap-6">
      <MemberPageHeader
        title={firstName ? `Hi, ${firstName}` : "My records"}
        subtitle="Your profile and financial records"
      />

      <Link
        href="/records"
        className="flex items-center gap-3 rounded-3xl bg-brand-green p-4 text-brand-cream shadow-sm transition hover:opacity-95 md:gap-5 md:p-6"
      >
        <Avatar
          pictureUrl={profile?.profilePictureUrl}
          name={profile?.name}
          email={profile?.email || fallbackName}
          size="lg"
          onDark
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold">{holder}</span>
          {contact.map((line) => (
            <span key={line} className="block truncate text-xs opacity-80">
              {line}
            </span>
          ))}
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {profile?.status ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                {profile.status}
              </span>
            ) : null}
            {profile?.roles?.length ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                {profile.roles.join(", ")}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronRightIcon className="h-5 w-5 shrink-0" />
      </Link>

      <MemberRecordsViewer holder={holder} holderPictureUrl={profile?.profilePictureUrl} />
    </div>
  );
}
