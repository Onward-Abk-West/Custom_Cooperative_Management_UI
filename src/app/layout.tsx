import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Body/UI face — a warmer, more characterful geometric sans than the
// previous Geist (deliberately picked to move off the "safe default"
// look: see brand v2 design notes in globals.css).
const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headings/wordmark — Fraunces, a soft-serif with ink-trap detailing.
// Replaces Playfair Display: still reads as "institutional ledger",
// but with more personality and less of the generic-elegant-serif
// look Playfair has become the default pick for everywhere.
const headingFont = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Onward Abeokuta-West Cooperative Management",
  description:
    "Cooperative record management for Onward Abeokuta-West and its societies",
};

// Runs before paint so switching to the night theme (or returning with
// it already chosen) doesn't flash the light palette first. Reads the
// visitor's saved choice; with nothing saved, globals.css already
// falls back to the OS preference on its own via prefers-color-scheme,
// so this script has nothing to do in that case.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("onward-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${geistMono.variable} ${headingFont.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
