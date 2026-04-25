/**
 * GET /api/admin/users
 * Returns all users from Firestore using admin SDK (bypasses security rules).
 * Only callable by authenticated super admin users.
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export const maxDuration = 30;

export async function GET(request) {
  try {
    // Verify the caller is authenticated and is a super admin
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = await adminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    // Must have super_admin claim or be the admin phone
    const isSuperAdmin =
      decoded.role === "super_admin" ||
      decoded.phone === "+1234567890" ||
      (process.env.ADMIN_PHONES || "")
        .split(",")
        .map((p) => p.replace(/\D/g, "").trim())
        .includes(String(decoded.uid).replace(/\D/g, ""));

    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Fetch all users from Firestore admin SDK
    const snap = await adminDb().collection("users").orderBy("createdAt", "desc").get();
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("[API/admin/users] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
