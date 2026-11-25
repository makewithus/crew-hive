/** ./bookings/notify — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

// Deprecated: crew pings (in-app, push, WhatsApp) are now sent by the Express backend when a request is created.
export async function POST() { return NextResponse.json({ success: true, deprecated: true, message: "Notifications are sent by the backend when a request is created." }); }
