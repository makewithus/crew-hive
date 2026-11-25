/** ./blocks — thin proxy to the shared Express backend. */
import { proxy, readJson, digits, NextResponse } from "../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return proxy(request, {
    method: "GET",
    path: "/blocks",
    map: (d) => ({ success: true, items: d.items || [] }),
  });
}

export async function POST(request) {
  const { targetId } = await readJson(request);
  const cleanId = digits(targetId);
  if (!cleanId) return NextResponse.json({ success: false, error: "targetId required." }, { status: 400 });

  return proxy(request, {
    method: "PUT",
    path: `/blocks/${cleanId}`,
    body: {},
    map: (d) => ({ success: true, ...d, message: "User blocked successfully." }),
  });
}

