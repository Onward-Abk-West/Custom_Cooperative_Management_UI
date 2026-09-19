"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CooperativeMark } from "@/components/illustrations/CooperativeMark";

const SPLASH_DURATION_MS = 1800;

/**
 * Cold-start splash screen, shown at "/" before the app decides where
 * to send the visitor. For now that destination is always /login — once
 * real session handling exists, this is the natural place to branch to
 * /dashboard instead when a valid session cookie is already present.
 *
 * A visitor who already has a session skips this entirely: the proxy
 * (src/proxy.ts) redirects an authenticated request away from "/" to
 * /dashboard before this component ever renders.
 *
 * Visual language matches the login screen's colored panel — a green
 * -> gold gradient field with a badge mark and soft blob accents,
 * rather than the earlier landscape illustration.
 */
export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main
      onClick={() => router.replace("/login")}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-green via-brand-green-dark to-brand-gold-dark"
    >
      {/* soft blob accents — the same depth cue as the login panel,
          without a literal illustration behind it */}
      <div
        aria-hidden="true"
        className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-brand-gold/30 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg">
          <CooperativeMark className="h-16 w-16" />
        </div>

        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-cream sm:text-3xl">
            Onward Abeokuta-West
          </h1>
          <p className="mt-1 text-sm tracking-wide text-brand-cream/80">
            Cooperative Management System
          </p>
        </div>

        <div
          className="h-1.5 w-full max-w-52 overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-label="Loading"
          aria-busy="true"
        >
          <div className="h-full w-1/3 animate-[loadbar_1.6s_ease-in-out_infinite] rounded-full bg-white" />
        </div>

        <p className="text-xs text-brand-cream/60">Tap anywhere to continue</p>
      </div>

      <style>{`
        @keyframes loadbar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(340%); }
        }
      `}</style>
    </main>
  );
}
