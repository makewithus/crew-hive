/** ./prebookings — thin proxy to the shared Express backend for Pre-bookings & Date Holds (I7 [P2]). */
import { proxy, readJson } from "@/lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return proxy(request, {
    method: "GET",
    path: "/prebookings",
    map: (d) => ({ success: true, items: d.items || [] }),
  });
}

export async function POST(request) {
  const body = await readJson(request);
  return proxy(request, {
    method: "POST",
    path: "/prebookings",
    body,
    map: (d) => ({ success: true, data: d, message: "Date hold requested successfully." }),
  });
}
