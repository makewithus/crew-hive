/** ./crew/profile — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

// GET ?phone=: own profile when the token matches, otherwise the public (filtered) profile. POST: update own profile.
export async function GET(request) {
  const phone = digits(new URL(request.url).searchParams.get("phone"));
  const me = await callExpress(request, { path: "/auth/me" });
  const own = me.ok && me.body?.data?.id === phone;
  return proxy(request, { method: "GET", path: own ? "/crew/me" : `/crew/${phone}` });
}
export async function POST(request) {
  const { updates } = await readJson(request);
  return proxy(request, { method: "PATCH", path: "/crew/me", body: updates || {}, map: (d) => ({ success: true, message: "Profile updated successfully.", data: d }) });
}
