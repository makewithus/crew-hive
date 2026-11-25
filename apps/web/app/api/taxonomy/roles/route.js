/** ./taxonomy/roles — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) { return proxy(request, { method: "GET", path: "/taxonomy/roles", map: (d) => ({ success: true, data: d.items }) }); }
export async function POST(request) {
  const { roles, role } = await readJson(request);
  const list = Array.isArray(roles) ? roles : role ? [role] : [];
  if (!list.length) return NextResponse.json({ success: false, error: "Invalid role payload" }, { status: 400 });
  let last;
  for (const r of list) { last = await callExpress(request, { method: "POST", path: "/admin/taxonomy/roles", body: { role: r } }); if (!last.ok) return legacyError(last); }
  return NextResponse.json({ success: true, data: last.body.data.items });
}
