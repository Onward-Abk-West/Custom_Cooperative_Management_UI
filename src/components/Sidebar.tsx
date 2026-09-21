"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSuperadmin, navItemsForRole, ROLE_LABELS, type Role } from "@/lib/roles";
import type { Society } from "@/lib/mock-session";
import { CooperativeMark } from "@/components/illustrations/CooperativeMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { navIconFor } from "@/components/NavIcons";

const COLLAPSE_KEY = "onward-sidebar-collapsed";
const COLLAPSE_EVENT = "onward-sidebar-collapsed-change";

/**
 * Collapsed/expanded is read the same way ThemeToggle reads the
 * theme — via useSyncExternalStore off localStorage — rather than
 * useState+useEffect, since the source of truth (what the visitor
 * chose last time) lives outside React. `storage` only fires in
 * *other* tabs, so setSidebarCollapsed also dispatches a same-tab
 * custom event any open Sidebar instance can subscribe to.
 */
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(COLLAPSE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getServerSnapshotCollapsed(): boolean {
  return false;
}

function setSidebarCollapsed(next: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  } catch {
    // Private browsing / blocked storage — collapse still works for
    // this page load, it just won't be remembered next visit.
  }
  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function MenuIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className={props.className} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className={props.className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon({ collapsed, className }: { collapsed: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${collapsed ? "rotate-180" : ""} ${className ?? ""}`}
      aria-hidden="true"
    >
      <path d="M14 5l-7 7 7 7" />
    </svg>
  );
}

/**
 * Collapsible app-shell sidebar — the primary nav, replacing the old
 * horizontal AppNav pills (src/components/AppNav.tsx, now unused —
 * same situation as src/app/(app)/page.tsx: flagged for deletion,
 * can't remove it myself). Two independent states: `collapsed`
 * (desktop icon-only rail, persisted) and `mobileOpen` (an ephemeral
 * off-canvas drawer below the lg breakpoint, controlled by
 * AppShell so the mobile header's hamburger button can open it too).
 */
export function Sidebar({
  role,
  societies,
  currentSocietyId,
  userName,
  mobileOpen,
  onCloseMobile,
}: {
  role: Role;
  societies: Society[];
  currentSocietyId: string;
  userName: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    getServerSnapshotCollapsed
  );
  const pathname = usePathname();
  const items = navItemsForRole(role);
  const [societyId, setSocietyId] = useState(currentSocietyId);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseMobile();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-brand-line bg-surface-card transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[76px]" : "lg:w-64"}`}
      >
        <div className="flex items-center gap-2 border-b border-brand-line px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-gold-dark">
            <CooperativeMark className="h-6 w-6" />
          </div>
          {!collapsed && (
            <span className="font-heading truncate text-sm font-bold text-brand-green">
              Onward Abeokuta-West
            </span>
          )}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto shrink-0 rounded-full p-1.5 text-brand-ink/60 transition hover:bg-brand-line/30 lg:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {isSuperadmin(role) && societies.length > 0 && !collapsed && (
          <div className="border-b border-brand-line px-3 py-3">
            <label htmlFor="sidebar-society" className="sr-only">
              Society
            </label>
            <select
              id="sidebar-society"
              value={societyId}
              onChange={(e) => setSocietyId(e.target.value)}
              className="w-full rounded-lg border border-brand-line bg-brand-line/25 px-2.5 py-2 text-xs font-medium text-brand-ink outline-none focus:border-brand-gold"
            >
              {societies.map((society) => (
                <option key={society.id} value={society.id}>
                  {society.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const ItemIcon = navIconFor(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-brand-green text-brand-cream"
                        : "text-brand-ink/70 hover:bg-brand-line/30 hover:text-brand-ink"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <ItemIcon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-brand-line p-3">
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-line/40 text-xs font-bold text-brand-ink">
              {initials(userName)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs font-semibold text-brand-ink">
                  {userName}
                </p>
                <p className="truncate text-[11px] text-brand-ink/50">
                  {ROLE_LABELS[role]}
                </p>
              </div>
            )}
            <ThemeToggle className="!h-8 !w-8 shrink-0" />
          </div>

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-pressed={collapsed}
            className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg border border-brand-line py-1.5 text-xs font-medium text-brand-ink/60 transition hover:bg-brand-line/30 hover:text-brand-ink lg:flex"
          >
            <ChevronIcon collapsed={collapsed} className="h-4 w-4" />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}

export { MenuIcon };
