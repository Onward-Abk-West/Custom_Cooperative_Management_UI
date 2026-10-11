"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSessionInfo } from "@/lib/session";

/**
 * The Settings page is part of the member app. Staff roles have no nav
 * entry for it, but a typed URL would still render, so bounce anyone
 * who isn't a member back to the dashboard.
 */
export function useMemberOnly() {
  const router = useRouter();
  useEffect(() => {
    const session = readSessionInfo();
    if (session && session.role !== "member") router.replace("/dashboard");
  }, [router]);
}
