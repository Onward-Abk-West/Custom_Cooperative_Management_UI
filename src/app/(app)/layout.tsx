import { AppShell } from "@/components/AppShell";
import { getMockSession } from "@/lib/mock-session";

/**
 * Shell for every authenticated route. The proxy already guarantees a
 * session cookie exists by the time a request reaches here — this
 * layout's only job is reading the (mock, for now) session and
 * handing it to AppShell, which owns the actual chrome: the
 * collapsible sidebar, its role-aware nav and society switcher, and
 * the mobile drawer. This file stays a server component so it can
 * read the session directly; AppShell is the client component that
 * needs interactive state (the mobile drawer's open/closed flag).
 *
 * `getMockSession()` stands in for a real session read until auth
 * exists — see its doc comment. Swapping it for the real thing later
 * shouldn't require touching AppShell or Sidebar, only this call.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getMockSession();

  return (
    <AppShell
      role={session.role}
      societies={session.societies}
      currentSocietyId={session.currentSocietyId}
      userName={session.name}
    >
      {children}
    </AppShell>
  );
}
