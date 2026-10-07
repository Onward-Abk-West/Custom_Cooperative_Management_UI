import { redirect } from "next/navigation";

/**
 * This page's flow has moved into the unified /login entry point, which
 * now asks for just an email or phone number and routes a member with an
 * approved PIN-reset code — or one still awaiting approval — to the
 * right step automatically (see src/lib/api/account-identify.ts and
 * src/app/login/page.tsx). Redirecting rather than deleting this route
 * keeps any already-distributed /forgot-pin links working.
 */
export default function ForgotPinRedirect() {
  redirect("/login");
}
