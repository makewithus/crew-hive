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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = await adminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 },
      );
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
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const db = adminDb();

    // Fetch all three collections in parallel
    const [usersSnap, crewSnap, organizersSnap] = await Promise.all([
      db.collection("users").orderBy("createdAt", "desc").get(),
      db.collection("crew").get(),
      db.collection("organizers").get(),
    ]);

    // Build lookup maps keyed by doc id (digits-only phone)
    const crewMap = {};
    crewSnap.docs.forEach((d) => {
      crewMap[d.id] = d.data();
    });
    const orgMap = {};
    organizersSnap.docs.forEach((d) => {
      orgMap[d.id] = d.data();
    });

    // Merge profile details into each users doc
    // Filter out ghost/incomplete registrations (no role set)
    const users = usersSnap.docs
      .map((d) => {
        const base = { id: d.id, ...d.data() };
        const profile = crewMap[d.id] || orgMap[d.id] || {};
        return {
          ...base,
          name: profile.name || base.name || null,
          company: profile.company || base.company || null,
          city: profile.city || base.city || null,
          crewRole: profile.role || base.crewRole || null,
          experience: profile.experience || base.experience || null,
          ratePerDay: profile.ratePerDay || base.ratePerDay || null,
        };
      })
      .filter((u) => u.role && u.role !== ""); // drop ghost docs with no role

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("[API/admin/users] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
