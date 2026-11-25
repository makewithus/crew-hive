/** ./auth/initialize — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

// Role lookup. Requires a signed-in caller: the previous unauthenticated "does this phone exist?" probe was an
// account-enumeration oracle and was removed. Pre-OTP calls get a neutral answer; OTP verification reports isNewUser.
export async function POST(request) {
  if (!request.headers.get("authorization")) return NextResponse.json({ role: null, approved: false, exists: true, isNew: false });
  return proxy(request, { method: "GET", path: "/auth/me", map: (d) => ({ role: d.role, approved: d.approved, exists: d.exists, isNew: !d.exists }) });
}
