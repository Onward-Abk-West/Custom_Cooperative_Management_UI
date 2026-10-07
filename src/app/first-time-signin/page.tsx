import { redirect } from "next/navigation";

/**
 * This page's flow has moved into the unified /login entry point, which
 * now asks for just an email or phone number and routes a brand-new
 * member to the temporary-credential step automatically (see
 * src/lib/api/account-identify.ts and src/app/login/page.tsx — the
 * member never has to know in advance that this was "the first-time
 * sign-in page"). Redirecting rather than deleting this route keeps any
 * already-distributed /first-time-signin links working.
 */
export default function FirstTimeSignInRedirect() {
  redirect("/login");
}
