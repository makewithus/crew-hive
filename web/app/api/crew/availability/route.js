/** ./crew/availability — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) { return proxy(request, { method: "GET", path: "/crew/me/availability" }); }
export async function POST(request) {
  const b = await readJson(request);
  if (b.withdrawConsent) return proxy(request, { method: "POST", path: "/crew/me/location-consent/withdraw", map: () => ({ success: true, consentWithdrawn: true, message: "Location consent withdrawn." }) });
  return proxy(request, { method: "PUT", path: "/crew/me/availability", body: { available: b.available === true, coarseCity: b.coarseCity, coarseCoords: b.coarseCoords, consentGranted: b.consentGranted },
    map: (d) => ({ success: true, ...d, message: d.available ? "Availability switched ON. Active for 7 days unless reconfirmed." : "Availability switched OFF." }) });
}
