/** ./features — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return proxy(request, { method: "GET", path: "/features", map: (d) => ({ success: true, data: { activeTier: d.activeTier, trialDurationDays: d.trialDurationDays, gatedFeatures: d.gatedFeatures, supportContact: d.supportContact, inquiryWhatsapp: d.inquiryWhatsapp, access: d.access, trialDaysRemaining: d.trialDaysRemaining } }) });
}
