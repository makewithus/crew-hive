/** ./prebookings/[id]/status — thin proxy to update pre-booking/date-hold status. */
import { proxy, readJson } from "@/lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await readJson(request);
  return proxy(request, {
    method: "PATCH",
    path: `/prebookings/${encodeURIComponent(id)}/status`,
    body,
    map: (d) => ({ success: true, ...d }),
  });
}
