/**
 * POST /api/auth/admin-token
 * Issues a Firebase custom token for the test/super-admin account.
 * Hardcoded test credentials — replace with dynamic logic later.
 * Body: { phone: "1234567890", otp: "123456" }
 * Returns: { token } — client calls signInWithCustomToken(auth, token)
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

const TEST_PHONE = "1234567890";
const TEST_OTP = "123456";

const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone and OTP required" },
        { status: 400 },
      );
    }

    const id = phoneToDocId(phone);

    if (id !== TEST_PHONE || otp !== TEST_OTP) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const ts = new Date().toISOString();
    await adminDb()
      .collection("users")
      .doc(id)
      .set(
        { phone: `+${id}`, role: "super_admin", approved: true, updatedAt: ts },
        { merge: true },
      );

    const token = await adminAuth().createCustomToken(`admin_${id}`, {
      role: "super_admin",
      phone: `+${id}`,
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("[admin-token] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
