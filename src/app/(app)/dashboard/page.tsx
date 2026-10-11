import { cookies } from "next/headers";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { MemberHome } from "@/components/member/MemberHome";
import { SESSION_INFO_COOKIE_NAME, parseSessionInfoCookie } from "@/lib/session";

/**
 * A Member sees their own financial records (MemberHome); every other
 * role keeps the society-wide dashboard. The role comes from the
 * readable session-info cookie, the same source (app)/layout.tsx uses.
 */
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = parseSessionInfoCookie(cookieStore.get(SESSION_INFO_COOKIE_NAME)?.value);

  if (session?.role === "member") {
    return <MemberHome fallbackName={session.displayName} />;
  }
  return <DashboardClient />;
}
