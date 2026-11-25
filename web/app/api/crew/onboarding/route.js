/** ./crew/onboarding — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const b = await readJson(request);
  return proxy(request, { method: "POST", path: "/crew/onboard", body: { name: b.name, role: b.role || (b.roles || [])[0], roles: b.roles, specialisations: b.specialisations, city: b.city, consent: b.consent },
    map: (d) => ({ success: true, crewId: d.crew.id, phone: d.crew.phone, status: d.crew.status, message: "Crew profile created successfully." }) });
}
