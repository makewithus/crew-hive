/** ./requests/create — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const b = await readJson(request);
  return proxy(request, { method: "POST", path: "/requests", body: { role: b.role, specialisation: b.specialisation, date: b.date, location: b.location, workType: b.workType, notes: b.notes, targetCrewIds: b.targetCrewIds, responseWindowMinutes: b.responseWindowMinutes },
    map: (d) => ({ success: true, requestId: d.id, data: d, pingsSent: d.pingsSent }) });
}
