/** ./admin/metrics — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return proxy(request, { method: "GET", path: "/admin/metrics", map: (m) => ({ success: true, data: {
    summary: { totalUsers: m.totals.users, totalCrew: m.totals.crew, totalOrganizers: m.totals.organizers, approvedCrew: m.totals.approvedCrew, pendingCrew: m.totals.pendingCrew, activeAvailability: m.activeAvailability,
      totalRequestsSent: m.requests.sent, totalRepliesReceived: m.requests.accepted + m.requests.declined + m.requests.noResponse, acceptedReplies: m.requests.accepted, declinedReplies: m.requests.declined, noResponseReplies: m.requests.noResponse, pendingReplies: m.requests.pending },
    signupsByCity: m.signupsByCity, signupsByRole: m.signupsByRole } }) });
}
