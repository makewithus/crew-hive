/** ./admin/approve — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

// Admin approval now requires a verified admin token (the previous route had no authentication at all).
export async function POST(request) {
  const { id, role, action } = await readJson(request);
  if (!id || !role || !action) return NextResponse.json({ success: false, error: "Missing id, role, or action" }, { status: 400 });
  if (role === "organizer" || role === "employer") return NextResponse.json({ success: true, status: "approved" }); // recruiters are approved at signup
  const verb = action === "approve" ? "approve" : "reject";
  return proxy(request, { method: "POST", path: `/admin/profiles/${digits(id)}/${verb}`, map: () => ({ success: true, status: verb === "approve" ? "approved" : "rejected" }) });
}
