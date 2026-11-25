/** ./admin/associations — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) { return proxy(request, { method: "GET", path: "/admin/associations", map: (d) => ({ success: true, data: d.items.map((a) => ({ ...a, joinUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/join/${a.code || a.id}` })) }) }); }
export async function POST(request) { return proxy(request, { method: "POST", path: "/admin/associations", body: await readJson(request), map: (d) => ({ success: true, ...d }) }); }
