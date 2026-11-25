/** ./admin/users — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) { return proxy(request, { method: "GET", path: "/admin/users", map: (d) => ({ success: true, data: d.items }) }); }

// Role changes are super-admin only (enforced by the backend). `super_admin` can never be granted this way.
export async function POST(request) {
  const { id, role } = await readJson(request);
  if (!id || !role) return NextResponse.json({ success: false, error: "id and role are required" }, { status: 400 });
  return proxy(request, { method: "PUT", path: `/admin/users/${digits(id)}/role`, body: { role }, map: (d) => ({ success: true, ...d }) });
}
