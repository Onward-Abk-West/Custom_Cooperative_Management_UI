import { CooperativeMark } from "@/components/illustrations/CooperativeMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppNav } from "@/components/AppNav";
import { getMockSession } from "@/lib/mock-session";
import { ROLE_LABELS } from "@/lib/roles";

/**
 * Shell for every authenticated route. The proxy already guarantees a
 * session cookie exists by the time a request reaches here — this
 * layout renders the surrounding chrome: a role-aware nav and, for
 * either superadmin role, a society context switcher (society data is
 * isolated per the PRD, so only a superadmin ever needs to move
 * between societies).
 *
 * `getMockSession()` stands in for a real session read until auth
 * exists — see its doc comment. Swapping it for the real thing later
 * shouldn't require touching AppNav or the roles config, only this
 * one call site.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getMockSession();

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-line bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-gold-dark">
              <CooperativeMark className="h-6 w-6" />
            </div>
            <span className="font-heading hidden text-sm font-bold text-brand-green sm:inline">
              Onward Abeokuta-West
            </span>
          </div>

          <AppNav
            role={session.role}
            societies={session.societies}
            currentSocietyId={session.currentSocietyId}
          />

          <div className="flex shrink-0 items-center gap-3 border-l border-brand-line pl-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-brand-ink">
                {session.name}
              </p>
              <p className="text-xs text-brand-ink/50">
                {ROLE_LABELS[session.role]}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
