import { redirect } from "next/navigation";

/**
 * This page no longer exists — the app has no Passbook feature. The file
 * is kept only as a redirect until the folder is deleted.
 */
export default function RemovedPassbookPage() {
  redirect("/dashboard");
}
