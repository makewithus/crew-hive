/** ./auth/send-otp — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { phone } = await readJson(request);
  return proxy(request, { method: "POST", path: "/auth/otp/send", body: { phone }, map: () => ({ success: true }) });
}
