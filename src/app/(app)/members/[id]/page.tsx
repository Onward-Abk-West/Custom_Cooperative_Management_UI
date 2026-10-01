"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { getMemberProfile, updateMemberProfile, type MemberProfileData } from "@/lib/api/members";

/**
 * GET /api/v1/members/{id} — Developer Superadmin, Onward Superadmin,
 * Supervisor, President, Admin. PUT is narrower (Developer Superadmin,
 * Supervisor only): the edit form below always renders, and a viewer
 * who can see but not edit finds out via a 403 from the API on submit
 * — this page doesn't duplicate that role matrix client-side.
 */
export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: memberId } = usePromise(params);
  const [profile, setProfile] = useState<MemberProfileData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMemberProfile(memberId)
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setLoadError(response.message || "Member not found.");
          return;
        }
        setProfile(response.data);
        setName(response.data.name ?? "");
        setEmail(response.data.email ?? "");
        setPhoneNumber(response.data.phoneNumber ?? "");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message || "Member not found." : "Could not reach the server."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const response = await updateMemberProfile(memberId, name, email, phoneNumber);
      if (!response.success || !response.data) {
        setSaveError(response.message || "The profile could not be updated.");
        return;
      }
      setProfile(response.data);
      setSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message || "The profile could not be updated."
          : "Could not reach the server."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-brand-ink/60">Loading member…</p>;
  }

  if (loadError || !profile) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {loadError || "Member not found."}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Link href="/members" className="text-sm font-medium text-brand-gold-dark hover:underline">
          ← Look up another member
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-bold text-brand-ink">
          {profile.name || profile.email || profile.phoneNumber || "Member"}
        </h1>
        <p className="mt-1 text-sm text-brand-ink/60">Roles: {profile.roles.join(", ") || "—"}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-brand-line bg-surface-card p-5">
        <Input
          id="member-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          id="member-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="member-phone"
          label="Phone number"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        {saveError && (
          <p role="alert" className="text-sm text-red-600">
            {saveError}
          </p>
        )}
        {saved && <p className="text-sm text-brand-green">Saved.</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
