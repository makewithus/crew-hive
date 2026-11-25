/** ./recruiter/shortlist — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) { return proxy(request, { method: "GET", path: "/recruiters/me/shortlist", map: (d) => ({ success: true, data: d.items, access: d.access }) }); }
export async function POST(request) {
  const { crewId } = await readJson(request);
  if (!digits(crewId)) return NextResponse.json({ success: false, error: "crewId required." }, { status: 400 });
  return proxy(request, { method: "PUT", path: `/recruiters/me/shortlist/${digits(crewId)}`, body: {}, map: (d) => ({ success: true, ...d, message: d.alreadySaved ? "Crew member is already in your shortlist." : "Added to shortlist." }) });
}
export async function DELETE(request) {
  const crewId = digits(new URL(request.url).searchParams.get("crewId"));
  if (!crewId) return NextResponse.json({ success: false, error: "crewId required." }, { status: 400 });
  return proxy(request, { method: "DELETE", path: `/recruiters/me/shortlist/${crewId}`, map: () => ({ success: true, message: "Removed from shortlist." }) });
}
