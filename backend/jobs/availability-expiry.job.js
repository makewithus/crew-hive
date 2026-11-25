import { getDb } from "../config/firebase.js";
/** Turns expired availability off (and clears coarse location). Single-instance timer; idempotent so multiple instances are safe. */
export async function expireStale() {
  const now = new Date().toISOString();
  const s = await getDb().collection("crew").where("available", "==", true).get();
  let n = 0;
  for (const d of s.docs) { const e = d.data().availableExpiresAt || d.data().availableUntil; if (e && e < now) { await d.ref.update({ available: false, autoExpired: true, coarseLocation: null, updatedAt: now }); n++; } }
  return n;
}
let h = null;
export function startAvailabilityExpiryWorker(ms = 10 * 60_000) {
  if (h) return;
  h = setInterval(() => expireStale().catch((e) => console.error("[expiry]", e.message)), ms);
  h.unref?.();
}
