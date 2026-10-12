"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/member/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import {
  ChevronRightIcon,
  DownloadIcon,
  IdCardIcon,
  KeyIcon,
  LogoutIcon,
  PaletteIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/member/MemberIcons";
import { MemberCard } from "@/components/member/MemberCard";
import { MemberPageHeader } from "@/components/member/MemberPageHeader";
import { getMyProfile } from "@/lib/api/members";
import { removeProfilePicture } from "@/lib/api/profile-picture";
import { ProfilePhotoPicker } from "@/components/member/ProfilePhotoPicker";
import { logout, readSessionInfo } from "@/lib/session";
import { useMemberOnly } from "@/lib/use-member-only";

/** One tappable / informational row inside a settings card. */
function SettingsRow({
  icon,
  title,
  subtitle,
  href,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  right?: React.ReactNode;
}) {
  const inner = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green/15 text-brand-green">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-brand-ink">{title}</span>
        {subtitle ? <span className="block text-xs text-brand-ink/60">{subtitle}</span> : null}
      </span>
      {right ?? (href ? <ChevronRightIcon className="h-5 w-5 shrink-0 text-brand-ink/40" /> : null)}
    </>
  );
  const cls = "flex items-center gap-3 border-t border-brand-line/70 py-3 first:border-t-0";
  return href ? (
    <Link href={href} className={`${cls} transition hover:opacity-80`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default function SettingsPage() {
  useMemberOnly();
  const [name, setName] = useState<string | null>(null);
  const [contact, setContact] = useState<string | null>(null);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    // Immediate placeholder from the session cookie, replaced by the
    // real profile once it loads.
    const info = readSessionInfo();
    if (info) setContact(info.displayName);
    let cancelled = false;
    getMyProfile()
      .then((response) => {
        if (cancelled || !response.success || !response.data) return;
        setName(response.data.name);
        setContact(response.data.email || response.data.phoneNumber);
        setPictureUrl(response.data.profilePictureUrl);
      })
      .catch(() => {
        // Keep the placeholder — Settings still works without the profile.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRemovePhoto() {
    if (removingPhoto) return;
    setPhotoError(null);
    setRemovingPhoto(true);
    try {
      const response = await removeProfilePicture();
      if (response.success) setPictureUrl(null);
      else setPhotoError(response.message || "Your photo could not be removed.");
    } catch {
      setPhotoError("Your photo could not be removed. Please try again.");
    } finally {
      setRemovingPhoto(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <MemberPageHeader title="Settings" subtitle="Your account and this device" />

      <Link
        href="/records"
        className="flex items-center gap-3 rounded-3xl bg-brand-green p-4 text-brand-cream shadow-sm transition hover:opacity-95"
      >
        <Avatar pictureUrl={pictureUrl} name={name} email={contact} size="lg" onDark />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold">{name || "Your profile"}</span>
          <span className="block truncate text-sm opacity-80">{contact || "Member"}</span>
        </span>
        <ChevronRightIcon className="h-5 w-5 shrink-0" />
      </Link>

      <MemberCard icon={<UserIcon className="h-6 w-6" />} title="Account">
        <SettingsRow
          icon={<UserIcon className="h-6 w-6" />}
          title="Profile photo"
          subtitle={pictureUrl ? "Change or remove your passport photo" : "Add your passport photo"}
          right={
            <button
              type="button"
              onClick={() => {
                setPhotoError(null);
                setEditingPhoto((open) => !open);
              }}
              className="shrink-0 rounded-full border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-ink transition hover:bg-brand-line/25"
            >
              {editingPhoto ? "Close" : pictureUrl ? "Change" : "Add"}
            </button>
          }
        />
        {editingPhoto ? (
          <div className="border-t border-brand-line/70 py-4">
            <ProfilePhotoPicker
              onUploaded={(url) => {
                setPictureUrl(url);
                setEditingPhoto(false);
              }}
            />
            {pictureUrl ? (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={removingPhoto}
                className="mt-3 w-full text-center text-xs font-semibold text-status-bad hover:underline disabled:opacity-60"
              >
                {removingPhoto ? "Removing…" : "Remove current photo"}
              </button>
            ) : null}
            {photoError ? (
              <p role="alert" className="mt-2 text-center text-sm font-semibold text-status-bad">
                {photoError}
              </p>
            ) : null}
          </div>
        ) : null}
        <SettingsRow
          icon={<IdCardIcon className="h-6 w-6" />}
          title="Profile information"
          subtitle="Membership, contact and identity details"
          href="/records"
        />
      </MemberCard>

      <MemberCard icon={<ShieldIcon className="h-6 w-6" />} title="Security" subtitle="Protects your account">
        <SettingsRow
          icon={<KeyIcon className="h-6 w-6" />}
          title="Request a PIN reset"
          subtitle="Your Supervisor or President approves it"
          href="/records#pin-reset"
        />
      </MemberCard>

      <MemberCard icon={<PaletteIcon className="h-6 w-6" />} title="Appearance">
        <SettingsRow
          icon={<PaletteIcon className="h-6 w-6" />}
          title="Theme"
          subtitle="Switch between sun and night"
          right={<ThemeToggle />}
        />
      </MemberCard>

      {/* Renders only where installing is possible (Android Chrome, or the iPhone how-to). */}
      <InstallPrompt
        popoverAlign="right"
        renderRow={(control) => (
          <MemberCard icon={<DownloadIcon className="h-6 w-6" />} title="This device">
            <SettingsRow
              icon={<DownloadIcon className="h-6 w-6" />}
              title="Install the app"
              subtitle="Add Onward to your Home Screen"
              right={control}
            />
          </MemberCard>
        )}
      />

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-status-bad/40 py-3.5 text-sm font-semibold text-status-bad transition hover:bg-status-bad/10 disabled:opacity-60"
      >
        <LogoutIcon className="h-5 w-5" />
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
