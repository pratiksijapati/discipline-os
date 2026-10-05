/*
 * After a new deploy, a page that was opened earlier still points at the old build's
 * code files, which no longer exist. Loading one of them fails; reloading the page
 * fetches the new build. These helpers detect that case and reload — at most once
 * per 30 seconds, so a real outage can never cause a reload loop.
 */

const RELOAD_KEY = "dos.staleReloadAt";
const MIN_GAP_MS = 30_000;

/** True for "a code-split file of this app couldn't be loaded" errors (all major browsers). */
export function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|is not a valid JavaScript MIME type|Failed to fetch dynamically|Loading chunk|preload CSS/i.test(
    message,
  );
}

/** Reloads to pick up the new build. Returns false if we already tried very recently. */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < MIN_GAP_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked (private mode): still reload once; the browser keeps us from looping fast.
  }
  window.location.reload();
  return true;
}
