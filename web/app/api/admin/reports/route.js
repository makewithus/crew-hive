/** ./admin/reports — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const status = new URL(request.url).searchParams.get("status") || "all";
  return proxy(request, { method: "GET", path: "/admin/reports", query: { status }, map: (d) => ({ success: true, data: d.items }) });
}
export async function POST(request) {
  const b = await readJson(request);
  if (!b.action || b.action === "submit") // any signed-in user may report; identity comes from the token, not the body
    return proxy(request, { method: "POST", path: "/reports", body: { reportedProfileId: b.reportedProfileId, reason: b.reason, details: b.details }, map: (d) => ({ success: true, reportId: d.reportId, message: "Report submitted successfully. CrewHive moderation will review." }) });
  if (!b.reportId) return NextResponse.json({ success: false, error: "reportId is required." }, { status: 400 });
  return proxy(request, { method: "POST", path: `/admin/reports/${encodeURIComponent(b.reportId)}/resolve`, body: { moderationAction: b.moderationAction, moderationNotes: b.moderationNotes }, map: (d) => ({ success: true, status: d.status, message: `Report marked as ${d.status}.` }) });
}
