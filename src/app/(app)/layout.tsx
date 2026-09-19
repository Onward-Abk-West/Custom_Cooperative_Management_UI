import { CooperativeMark } from "@/components/illustrations/CooperativeMark";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Shell for every authenticated route. The proxy already guarantees a
 * session cookie exists by the time a request reaches here — this
 * layout just renders the surrounding chrome.
 *
 * The real nav (role-aware menu, society context switcher) is a
 * separate task; this is a placeholder frame so pages built later have
 * somewhere consistent to sit while the app shell itself is fleshed out.
 *
 * Matches the login screen's palette (a plain brand-cream field, no
 * landscape illustration) so the authenticated app doesn't visually
 * contradict the sign-in screen it followed.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-line bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-gold-dark">
              <CooperativeMark className="h-6 w-6" />
            </div>
            <span className="font-heading text-sm font-bold text-brand-green">
              Onward Abeokuta-West
            </span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="text-sm text-brand-ink/40">
              {/* role-aware menu + society switcher — coming next */}
              Menu placeholder
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
