"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Amount } from "./Amount";
import { ContributionsHero } from "./ContributionsHero";
import { HideAmountsButton } from "./HideAmountsButton";
import {
  ArrowInIcon,
  ArrowOutIcon,
  BookIcon,
  ChevronRightIcon,
  IdCardIcon,
  ReceiptIcon,
} from "./MemberIcons";
import { MemberPageHeader } from "./MemberPageHeader";
import { getMyProfile } from "@/lib/api/members";
import { SAMPLE_TRANSACTIONS } from "@/lib/member-sample-data";

const LINKS = [
  { href: "/passbook", title: "Passbook", subtitle: "Contributions by scheme and month", Icon: BookIcon },
  { href: "/transactions", title: "Transactions", subtitle: "Every payment in and out", Icon: ReceiptIcon },
  { href: "/records", title: "Profile", subtitle: "Membership and contact details", Icon: IdCardIcon },
] as const;

/**
 * Member dashboard (what /dashboard renders for the Member role — see
 * (app)/dashboard/page.tsx). The staff dashboard's society-wide charts
 * and filters mean nothing to a single member, so this is their own
 * summary instead: contributions at a glance, shortcuts, and the latest
 * transactions. Figures are sample data (src/lib/member-sample-data.ts).
 */
export function MemberHome({ fallbackName }: { fallbackName: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((response) => {
        if (!cancelled && response.success && response.data?.name) setName(response.data.name);
      })
      .catch(() => {
        // The greeting falls back to the session's display name.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = SAMPLE_TRANSACTIONS.slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <MemberPageHeader title="Home" subtitle={name || fallbackName} actions={<HideAmountsButton />} />

      <ContributionsHero />

      <section className="overflow-hidden rounded-3xl border border-brand-line bg-surface-card">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="font-heading text-base font-bold text-heading">Recent transactions</h2>
          <Link href="/transactions" className="text-sm font-semibold text-brand-green hover:underline">
            See all
          </Link>
        </div>
        <ul className="mt-2">
          {recent.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border-t border-brand-line/70 px-4 py-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  t.direction === "in" ? "bg-status-good/15 text-status-good" : "bg-status-bad/15 text-status-bad"
                }`}
              >
                {t.direction === "in" ? <ArrowInIcon className="h-5 w-5" /> : <ArrowOutIcon className="h-5 w-5" />}
                <span className="sr-only">{t.direction === "in" ? "Money in" : "Money out"}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-ink">{t.description}</p>
                <p className="truncate text-xs text-brand-ink/60">{t.scheme}</p>
              </div>
              <p
                className={`shrink-0 text-sm font-bold tabular-nums ${
                  t.direction === "in" ? "text-status-good" : "text-status-bad"
                }`}
              >
                {t.direction === "in" ? "+" : "−"}
                <Amount value={t.amount} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        {LINKS.map(({ href, title, subtitle, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-3xl border border-brand-line bg-surface-card p-4 transition hover:border-brand-green/50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green/15 text-brand-green">
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-brand-ink">{title}</span>
              <span className="block text-xs text-brand-ink/60">{subtitle}</span>
            </span>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-brand-ink/40" />
          </Link>
        ))}
      </div>
    </div>
  );
}
