/** ./auth/signup — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { role, crewData, organizerData, consent } = await readJson(request);
  if (role === "crew" && crewData) return proxy(request, { method: "POST", path: "/crew/onboard", body: { name: crewData.name, role: crewData.crewRole, city: crewData.city, consent }, map: () => ({ success: true, role: "crew", approved: false }) });
  if (role === "organizer" && organizerData) return proxy(request, { method: "POST", path: "/recruiters/onboard", body: { ...organizerData, consent }, map: () => ({ success: true, role: "organizer", approved: true }) });
  return NextResponse.json({ success: false, error: "Invalid role. Must be crew or organizer." }, { status: 400 });
}
