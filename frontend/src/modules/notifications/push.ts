/*
 * Browser side of Web Push: is it possible here, ask permission, subscribe/unsubscribe.
 * Push needs the service worker, which only runs in the built app (npm run pwa:alt
 * locally, or the deployed site) — not the dev server.
 */

import { isStandalone } from "../../services/pwa";

export type PushAvailability =
  | "ready" // can subscribe
  | "unsupported" // this browser can't do Web Push
  | "ios-install-first" // iPhone/iPad: only works from the home-screen app
  | "no-service-worker" // dev server, or the worker hasn't installed yet
  | "blocked"; // the user denied notifications for this site

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export async function pushAvailability(): Promise<PushAvailability> {
  if (isIos() && !isStandalone()) return "ios-install-first";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? "ready" : "no-service-worker";
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Asks for permission (if needed) and subscribes this browser. */
export async function subscribe(publicKey: string): Promise<PushSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications weren't allowed.");
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
}
