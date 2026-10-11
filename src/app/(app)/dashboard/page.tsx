import { cookies } from "next/headers";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { SESSION_INFO_COOKIE_NAME, parseSessionInfoCookie } from "@/lib/session";

/**
 * Everyone sees the same dashboard. A Member on a phone additionally
 * gets the app-style pinned header (see MemberPageHeader), so the role
 * is read here from the session-info cookie, the same source
 * (app)/layout.tsx uses.
 */
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = parseSessionInfoCookie(cookieStore.get(SESSION_INFO_COOKIE_NAME)?.value);

  return <DashboardClient isMember={session?.role === "member"} />;
}
