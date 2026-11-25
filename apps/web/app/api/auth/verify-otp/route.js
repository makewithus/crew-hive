/** ./auth/verify-otp — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { phone, code } = await readJson(request);
  return proxy(request, { method: "POST", path: "/auth/otp/verify", body: { phone, otp: String(code || "") },
    map: (d) => ({ success: true, customToken: d.customToken, idToken: d.idToken, refreshToken: d.refreshToken, role: d.user.role, approved: d.user.approved, isNewUser: d.isNewUser }) });
}
