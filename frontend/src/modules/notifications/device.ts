import { isStandalone } from "../../services/pwa";

/**
 * "Chrome on Android", "Safari on iPhone (installed app)" — read from the browser's own
 * description of itself. Best effort only: no fingerprinting, nothing is stored from here.
 */
export function describeDevice(ua: string = navigator.userAgent): string {
  const browser = /SamsungBrowser/.test(ua)
    ? "Samsung Internet"
    : /Edg\//.test(ua)
      ? "Edge"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /Firefox\/|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS/.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Browser";

  const iPadOs = /Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  const system = /Android/.test(ua)
    ? "Android"
    : /iPhone/.test(ua)
      ? "iPhone"
      : /iPad/.test(ua) || iPadOs
        ? "iPad"
        : /CrOS/.test(ua)
          ? "ChromeOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Mac OS X|Macintosh/.test(ua)
              ? "Mac"
              : /Linux/.test(ua)
                ? "Linux"
                : null;

  const name = system ? `${browser} on ${system}` : browser;
  return typeof window !== "undefined" && isStandalone() ? `${name} (installed app)` : name;
}
