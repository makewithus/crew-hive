/** ./requests/list — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) { return proxy(request, { method: "GET", path: "/requests", map: (d) => ({ success: true, data: d.items, aggregate: d.aggregate }) }); }
