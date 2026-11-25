/** ./account — thin proxy to the shared Express backend. */
import { proxy, NextResponse } from "../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function DELETE(request) {
  return proxy(request, {
    method: "DELETE",
    path: "/account",
    map: (d) => ({ success: true, ...d, message: "Account permanently deleted." }),
  });
}

