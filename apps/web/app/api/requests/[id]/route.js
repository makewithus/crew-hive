/** ./requests/[id] — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) { const { id } = await params; return proxy(request, { method: "GET", path: `/requests/${encodeURIComponent(id)}` }); }
export async function PATCH(request, { params }) {
  const { id } = await params; const b = await readJson(request);
  return proxy(request, { method: "PATCH", path: `/requests/${encodeURIComponent(id)}`, body: { action: b.action, confirmedCrewId: b.confirmedCrewId }, map: (d) => ({ success: true, ...d }) });
}
