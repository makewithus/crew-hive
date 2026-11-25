/** ./crew/search — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  return proxy(request, { method: "GET", path: "/crew", query: q, map: (d) => ({ success: true, data: d.items, pagination: d.pagination }) });
}
