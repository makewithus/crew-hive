/** ./blocks/[id] — thin proxy to the shared Express backend. */
import { proxy, digits, NextResponse } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const p = await params;
  const cleanId = digits(p?.id);
  if (!cleanId) return NextResponse.json({ success: false, error: "id required." }, { status: 400 });

  return proxy(request, {
    method: "PUT",
    path: `/blocks/${cleanId}`,
    body: {},
    map: (d) => ({ success: true, ...d, message: "User blocked successfully." }),
  });
}

export async function DELETE(request, { params }) {
  const p = await params;
  const cleanId = digits(p?.id);
  if (!cleanId) return NextResponse.json({ success: false, error: "id required." }, { status: 400 });

  return proxy(request, {
    method: "DELETE",
    path: `/blocks/${cleanId}`,
    map: (d) => ({ success: true, ...d, message: "User unblocked successfully." }),
  });
}

