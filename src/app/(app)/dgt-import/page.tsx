import { redirect } from "next/navigation";

/** The importer moved to /import when the backend generalised "DGT
 * import" to "member import". This keeps old bookmarks working; the
 * file can be deleted once nobody has the old URL saved. */
export default function LegacyDgtImportRedirect() {
  redirect("/import");
}
