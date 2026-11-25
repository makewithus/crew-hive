/** ./crew/requests — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return proxy(request, { method: "GET", path: "/crew/me/requests", map: (d) => ({ success: true, data: d.items, missedOrDeclinedCount: d.missedOrDeclinedCount, shouldPromptAvailabilityReview: d.shouldPromptAvailabilityReview }) });
}
export async function POST(request) {
  const { bookingId, response } = await readJson(request);
  if (!bookingId) return NextResponse.json({ success: false, error: "bookingId is required." }, { status: 400 });
  return proxy(request, { method: "POST", path: `/crew/me/requests/${encodeURIComponent(bookingId)}/respond`, body: { response }, map: (d) => ({ success: true, ...d, message: response === "accepted" ? "Request accepted." : "Request declined." }) });
}
