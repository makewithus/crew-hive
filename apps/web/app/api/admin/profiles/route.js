/** ./admin/profiles — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const filter = new URL(request.url).searchParams.get("filter") || "all";
  return proxy(request, { method: "GET", path: "/admin/profiles", query: { filter }, map: (d) => ({ success: true, data: d.items }) });
}
export async function POST(request) {
  const { id, action, updates } = await readJson(request);
  if (!id || !action) return NextResponse.json({ success: false, error: "Profile id and action required." }, { status: 400 });
  return proxy(request, { method: "POST", path: `/admin/profiles/${digits(id)}/${encodeURIComponent(action)}`, body: { updates }, map: (d) => ({ success: true, ...d }) });
}
