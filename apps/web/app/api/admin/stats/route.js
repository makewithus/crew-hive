/** ./admin/stats — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return proxy(request, { method: "GET", path: "/admin/metrics", map: (m) => ({ success: true, data: { totalUsers: m.totals.users, pendingApproval: m.totals.pendingCrew, approvedUsers: m.totals.approvedCrew + m.totals.organizers, totalCrew: m.totals.crew, approvedCrew: m.totals.approvedCrew, pendingCrew: m.totals.pendingCrew, organizers: m.totals.organizers, totalBookings: m.totals.bookings } }) });
}
