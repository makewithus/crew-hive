/**
 * POST /api/auth/dev-login
 * DEV ONLY — issues a Firebase custom token for any phone number
 * when the submitted OTP matches the dev test code (123456).
 * This route is disabled in production.
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const DEV_OTP = "123456";

export async function POST(request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { phone, code } = await request.json();

  if (!phone || !code) {
    return NextResponse.json(
      { error: "phone and code required" },
      { status: 400 },
    );
  }

  if (String(code).trim() !== DEV_OTP) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
  }

  // Derive a stable UID from digits only (matches rest of the app)
  const uid = phone.replace(/\D/g, "");

  try {
    // Look up role + approved from Firestore so claims are accurate
    const db = adminDb();
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const role =
      userData.role === "employer" ? "organizer" : (userData.role ?? null);
    const approved = userData.approved ?? false;

    const additionalClaims = {};
    if (role) additionalClaims.role = role;
    if (approved) additionalClaims.approved = true;
    additionalClaims.phone = `+${uid}`;

    const customToken = await adminAuth().createCustomToken(
      uid,
      additionalClaims,
    );
    return NextResponse.json({ success: true, customToken, role, approved });
  } catch (err) {
    console.error("[dev-login] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
