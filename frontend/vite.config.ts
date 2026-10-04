import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Shown in Settings → App, so you can see which version you're running.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      // We show our own "Update available" prompt (components/pwa/UpdatePrompt.tsx).
      registerType: "prompt",
      injectRegister: false,
      // Icons and <head> links are generated from pwa-assets.config.ts.
      pwaAssets: { config: true, overrideManifestIcons: true, injectThemeColor: false },
      manifest: {
        name: "Discipline OS",
        short_name: "Discipline",
        description: "Know what to do now — and make finishing it satisfying.",
        id: "/",
        start_url: "/today",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#C2410C",
        theme_color: "#C2410C",
        lang: "en",
        categories: ["productivity", "health", "lifestyle"],
        shortcuts: [
          { name: "Today", url: "/today", description: "What to do now" },
          { name: "Habits", url: "/habits", description: "Log today's habits" },
          { name: "Workout", url: "/workout", description: "Start a workout" },
          { name: "Night review", url: "/reflection", description: "Close the day" },
        ],
      },
      workbox: {
        // Only the app shell (code, styles, icons) is cached. API data is never cached,
        // so the app never shows stale or invented numbers while offline.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
        cleanupOutdatedCaches: true,
        // Push notifications: show reminders and open the right page when tapped.
        importScripts: ["push-handler.js"],
      },
      devOptions: { enabled: false },
    }),
  ],
});
