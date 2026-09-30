import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { getMockSession } from "@/lib/mock-session";
import { SESSION_INFO_COOKIE_NAME, parseSessionInfoCookie } from "@/lib/session";

/**
 * Shell for every authenticated route. The proxy already guarantees the
 * plain `onward_session` presence cookie exists by the time a request
 * reaches here — this layout's job is reading the real session-info
 * cookie (written by establishSession() at login and at first-time PIN
 * setup — see src/lib/session.ts) and handing it to AppShell, which
 * owns the actual chrome: the collapsible sidebar, its role-aware nav,
 * and the mobile drawer. This file stays a server component so it can
 * read the cookie directly via next/headers.
 *
 * Real societies for the superadmin society-switcher are NOT fetched
 * here: a server component has no access to the access token (kept in
 * client JS memory only — see api-client.ts's doc comment), so it can't
 * call the authenticated GET /api/v1/societies itself. Sidebar fetches
 * that list client-side instead for superadmin roles; everyone else
 * only ever belongs to one society, so no switcher renders for them at
 * all — see Sidebar's own comment on isSuperadmin(role).
 *
 * getMockSession() is now only a fallback for the (should be
 * unreachable in practice) case where the presence cookie exists but
 * the session-info cookie doesn't — e.g. a session established by a
 * future auth path that forgets to call establishSession().
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = parseSessionInfoCookie(
    cookieStore.get(SESSION_INFO_COOKIE_NAME)?.value
  );

  if (!session) {
    const mock = getMockSession();
    return (
      <AppShell
        role={mock.role}
        societies={mock.societies}
        currentSocietyId={mock.currentSocietyId}
        userName={mock.name}
      >
        {children}
      </AppShell>
    );
  }

  return (
    <AppShell
      role={session.role}
      societies={[]}
      currentSocietyId={session.societyId ?? ""}
      userName={session.displayName}
    >
      {children}
    </AppShell>
  );
}
