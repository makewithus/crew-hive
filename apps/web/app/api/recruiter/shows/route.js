/** ./recruiter/shows — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const showId = new URL(request.url).searchParams.get("showId");
  return proxy(request, { method: "GET", path: "/recruiters/me/shows", query: { showId }, map: (d) => ({ success: true, data: d.show || d.items, access: d.access }) });
}
export async function POST(request) {
  const b = await readJson(request);
  return proxy(request, { method: "POST", path: "/recruiters/me/shows", body: b, map: (d) => ({ success: true, id: d.id, message: b.id ? "Show updated" : "Show created" }) });
}
export async function DELETE(request) {
  const showId = new URL(request.url).searchParams.get("showId");
  if (!showId) return NextResponse.json({ success: false, error: "showId required." }, { status: 400 });
  return proxy(request, { method: "DELETE", path: `/recruiters/me/shows/${encodeURIComponent(showId)}`, map: () => ({ success: true, message: "Show deleted" }) });
}
