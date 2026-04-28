/**
 * GET /api/organizer/profile?phone=+91...
 * Returns the organizer profile using admin SDK (bypasses Firestore rules).
 * Caller must be authenticated (any role).
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the caller is authenticated
    const token = authHeader.slice(7);
    try {
      await adminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    if (!phone) {
      return NextResponse.json(
        { error: "phone query param required" },
        { status: 400 },
      );
    }

    const id = phoneToDocId(phone);
    const db = adminDb();

    // Check organizers → employers (legacy) → users (WhatsApp onboarded)
    let snap = await db.collection("organizers").doc(id).get();
    if (!snap.exists) snap = await db.collection("employers").doc(id).get();
    if (!snap.exists) snap = await db.collection("users").doc(id).get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: snap.id, ...snap.data() },
    });
  } catch (err) {
    console.error("[/api/organizer/profile] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
