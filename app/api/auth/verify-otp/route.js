/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP and returns a Firebase custom token + role.
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

// Same logic as initialize route — all env-listed numbers are super admins
const buildSuperAdminIds = () => {
  const ids = new Set();
  if (process.env.SUPER_ADMIN_PHONE) ids.add(phoneToDocId(process.env.SUPER_ADMIN_PHONE));
  if (process.env.ADMIN_PHONES) {
    process.env.ADMIN_PHONES.split(",").forEach((p) => { const d = phoneToDocId(p.trim()); if (d) ids.add(d); });
  }
  if (process.env.NEXT_PUBLIC_ADMIN_PHONES) {
    process.env.NEXT_PUBLIC_ADMIN_PHONES.split(",").forEach((p) => { const d = phoneToDocId(p.trim()); if (d) ids.add(d); });
  }
  return ids;
};
export async function POST(request) {
  const SUPER_ADMIN_IDS = buildSuperAdminIds();
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json(
        { error: "phone and code required" },
        { status: 400 },
      );
    }

    const id = phoneToDocId(phone);
    const db = adminDb();

    // ── DEV/LOCAL MODE SHORTCUT ──────────────────────────────────────────────
    // In development OR when LOCAL_AUTH_BYPASS=true, code 123456 bypasses Firebase SMS.
    if (
      (process.env.NODE_ENV === "development" || process.env.LOCAL_AUTH_BYPASS === "true") &&
      String(code).trim() === "123456"
    ) {
      // Super admin check first — any number in SUPER_ADMIN_IDS
      if (SUPER_ADMIN_IDS.has(id)) {
        const customToken = await adminAuth().createCustomToken(id, {
          role: "super_admin",
          approved: true,
          phone: `+${id}`,
        });
        return NextResponse.json({
          success: true,
          customToken,
          role: "super_admin",
          approved: true,
        });
      }

      // Check organizers collection first — it is the authoritative source for organizer role
      const orgSnap = await db.collection("organizers").doc(id).get();
      if (orgSnap.exists) {
        const customToken = await adminAuth().createCustomToken(id, {
          role: "organizer",
          approved: true,
          phone: `+${id}`,
        });
        // Heal users doc
        await db
          .collection("users")
          .doc(id)
          .set(
            {
              phone: `+${id}`,
              role: "organizer",
              approved: true,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        return NextResponse.json({
          success: true,
          customToken,
          role: "organizer",
          approved: true,
        });
      }

      // Crew / other — check users collection
      const userSnap = await db.collection("users").doc(id).get();
      if (!userSnap.exists) {
        return NextResponse.json(
          { error: "Number not found. Register via WhatsApp first." },
          { status: 404 },
        );
      }
      const userData = userSnap.data();
      const rawRole = userData.role ?? null;
      let role = rawRole === "employer" ? "organizer" : rawRole;
      if (role === "super_admin" && !SUPER_ADMIN_IDS.has(id)) role = null; // guard against corrupted data
      const approved = userData.approved === true;
      const claims = { phone: `+${id}` };
      if (role) claims.role = role;
      if (approved) claims.approved = true;
      const customToken = await adminAuth().createCustomToken(id, claims);
      return NextResponse.json({ success: true, customToken, role, approved });
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Verify OTP from Firestore (production)
    const otpRef = db.collection("otpCodes").doc(id);
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new one." },
        { status: 401 },
      );
    }

    const { otp, expiresAt } = otpSnap.data();

    if (Date.now() > expiresAt) {
      await otpRef.delete();
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 401 },
      );
    }

    if (String(code).trim() !== String(otp)) {
      return NextResponse.json(
        { error: "Incorrect OTP. Please check and try again." },
        { status: 401 },
      );
    }

    // OTP correct — consume it
    await otpRef.delete();

    // Get user role
    const userSnap = await db.collection("users").doc(id).get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const rawRole = userData.role ?? null;
    const role = rawRole === "employer" ? "organizer" : rawRole;
    const approved = userData.approved ?? false;

    const additionalClaims = {};
    if (role) additionalClaims.role = role;
    if (approved) additionalClaims.approved = true;
    additionalClaims.phone = `+${id}`;

    const customToken = await adminAuth().createCustomToken(
      id,
      additionalClaims,
    );
    return NextResponse.json({ success: true, customToken, role, approved });
  } catch (err) {
    console.error("[verify-otp] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
