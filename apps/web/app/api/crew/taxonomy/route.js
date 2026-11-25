/** ./crew/taxonomy — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const [roles, cities] = await Promise.all([callExpress(request, { path: "/taxonomy/roles" }), callExpress(request, { path: "/taxonomy/cities" })]);
  if (!roles.ok) return legacyError(roles);
  return NextResponse.json({ success: true, data: { roles: roles.body.data.items, cities: cities.body?.data?.cities || cities.body?.data?.launchCities || [] } });
}
