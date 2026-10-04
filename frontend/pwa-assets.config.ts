import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

/*
 * Generates every app icon from public/favicon.svg:
 * - transparent PNGs (64, 192, 512) for the manifest and browsers
 * - a maskable 512 icon (Android crops it into circles/squircles)
 * - apple-touch-icon 180 (iPhone home screen)
 * Maskable and Apple icons are padded with the brand orange, so the rounded
 * logo blends into a full-bleed tile.
 */
const BRAND = "#C2410C";

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BRAND } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: BRAND } },
  },
  images: ["public/favicon.svg"],
});
