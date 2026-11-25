/** ./associations/verify-code — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { code } = await readJson(request);
  return proxy(request, { method: "POST", path: "/crew/me/association", body: { code }, map: (d) => ({ success: true, associationName: d.associationName, message: `Verified! Association badge "${d.associationName}" has been added to your profile.` }) });
}
