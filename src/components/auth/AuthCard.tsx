import type { ReactNode } from "react";
import { CooperativeMark } from "@/components/illustrations/CooperativeMark";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Shared shell for every unauthenticated screen (login, PIN reset,
 * whatever else joins them) — the green-to-gold "wave card" plus the
 * floating theme toggle, pulled out of login/page.tsx so forgot-pin
 * and future screens don't duplicate it. Only the colored panel's
 * copy and the form panel's content change per screen.
 */
export function AuthCard({
  panelTitle,
  panelSubtitle,
  panelFooter = "A society of societies",
  children,
}: {
  panelTitle: string;
  panelSubtitle: string;
  panelFooter?: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-cream px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-green/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-brand-gold/20 blur-3xl"
      />

      <ThemeToggle className="absolute right-5 top-5 z-10" />

      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-brand-cream shadow-2xl ring-1 ring-brand-line md:flex-row">
        <div className="relative flex w-full flex-col justify-between gap-10 rounded-b-[3rem] bg-gradient-to-br from-brand-green via-brand-green-dark to-brand-gold-dark p-8 text-brand-cream md:w-[42%] md:rounded-b-none md:rounded-tr-[55%_100%] md:rounded-br-[55%_100%] md:p-10">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md">
              <CooperativeMark className="h-9 w-9" />
            </div>
            <h2 className="font-heading mt-6 text-2xl font-bold">
              {panelTitle}
            </h2>
            <p className="mt-2 max-w-[220px] text-sm text-brand-cream/80">
              {panelSubtitle}
            </p>
          </div>
          <p className="text-xs tracking-wide text-brand-cream/60">
            {panelFooter}
          </p>
        </div>

        <div className="flex w-full flex-col justify-center p-8 md:w-[58%] md:p-12">
          {children}
        </div>
      </div>
    </main>
  );
}
