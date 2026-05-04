import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

/**
 * POST /api/crew/update-profile
 * Updates a crew member's document using the Admin SDK (bypasses Firestore rules).
 * Body: { phone: string, data: Record<string, any> }
 * Auth: Bearer <Firebase ID token>  (verified server-side)
 */
export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    let uid = null;
    let tokenPhone = null;

    if (idToken) {
      try {
        const decoded = await adminAuth().verifyIdToken(idToken);
        uid = decoded.uid;
        tokenPhone = decoded.phone_number || null;
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "development" || process.env.LOCAL_AUTH_BYPASS === "true") {
      // Allow in local dev without token
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, data } = await req.json();
    if (!phone || !data) {
      return NextResponse.json({ error: "phone and data are required" }, { status: 400 });
    }

    // Derive docId (digits only)
    const docId = String(phone).replace(/\D/g, "");

    // If token present, verify caller owns this doc
    if (uid !== null && tokenPhone !== null) {
      const expectedPhone = "+" + docId;
      if (tokenPhone !== expectedPhone) {
        // Also allow admins
        const adminPhones = (process.env.ADMIN_PHONES || "").split(",").map((p) => p.trim());
        if (!adminPhones.includes(tokenPhone)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    await adminDb().collection("crew").doc(docId).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[crew/update-profile]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
