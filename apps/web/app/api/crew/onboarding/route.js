/**
 * POST /api/crew/onboarding
 * 30-second crew onboarding registration.
 * Creates both users and crew records with validated initial fields:
 * Phone, Name, Role(s), City, and Consent version.
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { CURRENT_CONSENT_VERSION } from "@/utils/taxonomy";

const phoneToDocId = (phone) => String(phone || "").replace(/\D/g, "");

async function verifyToken(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

function isDevBypass() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.LOCAL_AUTH_BYPASS === "true"
  );
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone, name, roles, role, specialisations = [], city, consent } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const docId = phoneToDocId(phone);
    if (docId.length < 7) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }

    // Verify token ownership if caller sent Authorization header
    const decoded = await verifyToken(req);
    if (decoded && !isDevBypass()) {
      const callerDigits = (decoded.phone_number || decoded.uid || "").replace(/\D/g, "");
      const isAdmin = decoded.role === "admin" || decoded.role === "super_admin";
      if (!isAdmin && callerDigits && callerDigits !== docId) {
        return NextResponse.json({ error: "Forbidden: Phone mismatch." }, { status: 403 });
      }
    }

    // Validate required initial fields
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    const selectedRoles = Array.isArray(roles) && roles.length > 0
      ? roles
      : role
      ? [role]
      : [];
    if (selectedRoles.length === 0) {
      return NextResponse.json({ error: "At least one professional role must be selected." }, { status: 400 });
    }

    if (!city || !String(city).trim()) {
      return NextResponse.json({ error: "City/District is required." }, { status: 400 });
    }

    // Validate consent
    if (
      !consent ||
      consent.termsAccepted !== true ||
      consent.privacyAccepted !== true ||
      consent.acceptableBehaviorAccepted !== true
    ) {
      return NextResponse.json(
        { error: "Consent to Terms, Privacy Policy, and Acceptable Behaviour is required." },
        { status: 400 }
      );
    }

    const db = adminDb();
    const now = new Date().toISOString();
    const fullPhone = phone.startsWith("+") ? phone : `+${docId}`;

    const consentRecord = {
      version: consent.version || CURRENT_CONSENT_VERSION,
      termsAccepted: true,
      privacyAccepted: true,
      acceptableBehaviorAccepted: true,
      recordedAt: now,
    };

    const primaryRole = selectedRoles[0];

    // Check if profile exists already (e.g. from WhatsApp)
    const existingSnap = await db.collection("crew").doc(docId).get();
    const existingCrew = existingSnap.exists ? existingSnap.data() : {};

    const batch = db.batch();

    // 1. users collection doc
    batch.set(
      db.collection("users").doc(docId),
      {
        phone: fullPhone,
        role: "crew",
        name: String(name).trim(),
        consent: consentRecord,
        approved: existingCrew.status === "approved" ? true : false,
        signupSource: existingCrew.signupSource || "web",
        updatedAt: now,
        ...(existingCrew.createdAt ? {} : { createdAt: now }),
      },
      { merge: true }
    );

    // 2. crew collection doc
    batch.set(
      db.collection("crew").doc(docId),
      {
        id: docId,
        phone: fullPhone,
        name: String(name).trim(),
        role: primaryRole,
        roles: selectedRoles,
        specialisations: Array.isArray(specialisations) ? specialisations : [],
        city: String(city).trim(),
        consent: consentRecord,
        status: existingCrew.status || "pending",
        available: existingCrew.available ?? false,
        availableExpiresAt: existingCrew.availableExpiresAt || null,
        signupSource: existingCrew.signupSource || "web",
        updatedAt: now,
        ...(existingCrew.createdAt ? {} : { createdAt: now }),
      },
      { merge: true }
    );

    await batch.commit();

    return NextResponse.json({
      success: true,
      crewId: docId,
      phone: fullPhone,
      status: existingCrew.status || "pending",
      message: "Crew profile created successfully.",
    });
  } catch (err) {
    console.error("[/api/crew/onboarding] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create crew profile." }, { status: 500 });
  }
}
