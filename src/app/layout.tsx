import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Classic serif for headings/wordmark — the "institutional ledger" feel,
// distinct from the sans body text used for forms and UI chrome.
const playfairDisplay = Playfair_Display({
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
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
