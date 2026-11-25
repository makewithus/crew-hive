/** ./taxonomy/cities — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

const cities = (d) => d.cities || d.launchCities || [];
export async function GET(request) { return proxy(request, { method: "GET", path: "/taxonomy/cities", map: (d) => ({ success: true, data: cities(d) }) }); }
export async function POST(request) {
  const { cities: list, city } = await readJson(request);
  const cur = await callExpress(request, { path: "/taxonomy/cities" });
  const next = Array.isArray(list) ? list : [...cities(cur.body?.data || {}).filter((c) => (c.id || c.nameEn || c) !== (city?.id || city?.nameEn || city)), city].filter(Boolean);
  return proxy(request, { method: "PUT", path: "/admin/taxonomy/cities", body: { launchCities: next }, map: (d) => ({ success: true, data: cities(d) }) });
}
