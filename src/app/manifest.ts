import type { MetadataRoute } from "next";

/**
 * Web app manifest — served by Next at /manifest.webmanifest and linked
 * from every page automatically. Together with the service worker in
 * public/sw.js and the PNG icons in public/icons, this is what lets
 * Chrome on Android offer "Install app" / "Add to Home screen" and open
 * the app in its own standalone window.
 *
 * Colors mirror globals.css: background_color is --brand-cream (shown on
 * the install splash), theme_color is --brand-green-dark (the status /
 * title bar of the installed window).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Onward Abeokuta-West Cooperative Management",
    short_name: "Onward",
    description:
      "Cooperative record management for Onward Abeokuta-West and its societies",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "en-NG",
    background_color: "#f7f2e8",
    theme_color: "#0f4f31",
    categories: ["finance", "business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
