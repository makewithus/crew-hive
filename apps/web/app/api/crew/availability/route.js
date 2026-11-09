/**
 * /api/crew/availability
 * Full availability lifecycle management:
 * - Available (with coarse location and 7-day expiry)
 * - Busy (switched off)
 * - Auto-expired (automatically checked and enforced by backend)
 * - Location consent recording & withdrawal
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

const phoneToDocId = (phone) => String(phone || "").replace(/\D/g, "");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const docId = phoneToDocId(phone);
    const db = adminDb();
    const snap = await db.collection("crew").doc(docId).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Crew profile not found" }, { status: 404 });
    }

    const data = snap.data();
    const now = Date.now();
    let isAvailable = data.available === true;
    let isAutoExpired = false;
    const expiresAt = data.availableExpiresAt ? new Date(data.availableExpiresAt).getTime() : 0;

    // Backend-enforced auto-expiry: if available but past expiresAt, expire it!
    if (isAvailable && expiresAt > 0 && now >= expiresAt) {
      isAvailable = false;
      isAutoExpired = true;
      // Persist auto-expiry to Firestore
      await db.collection("crew").doc(docId).update({
        available: false,
        autoExpired: true,
        coarseLocation: null, // stop live updates
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        available: isAvailable,
        autoExpired: isAutoExpired || data.autoExpired === true,
        availableAt: data.availableAt || null,
        availableExpiresAt: data.availableExpiresAt || null,
        coarseCity: data.coarseLocation?.city || data.city || null,
        locationConsent: data.locationConsent || null,
      },
    });
  } catch (err) {
    console.error("[/api/crew/availability GET] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      phone,
      available,
      coarseCity,
      coarseCoords,
      consentGranted = true,
      withdrawConsent = false,
    } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const docId = phoneToDocId(phone);
    const decoded = await verifyToken(req);

    // Ownership check
    if (decoded && !isDevBypass()) {
      const callerDigits = (decoded.phone_number || decoded.uid || "").replace(/\D/g, "");
      const isAdmin = decoded.role === "admin" || decoded.role === "super_admin";
      if (!isAdmin && callerDigits && callerDigits !== docId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const db = adminDb();
    const now = new Date();
    const isoNow = now.toISOString();

    // Handle Consent Withdrawal
    if (withdrawConsent) {
      await db.collection("crew").doc(docId).update({
        locationConsent: {
          granted: false,
          withdrawnAt: isoNow,
        },
        coarseLocation: null,
        updatedAt: isoNow,
      });
      return NextResponse.json({
        success: true,
        consentWithdrawn: true,
        message: "Location consent withdrawn. Exact and coarse tracking disabled.",
      });
    }

    // Switch Availability ON
    if (available === true) {
      const expiresAtDate = new Date(now.getTime() + SEVEN_DAYS_MS);
      const expiresAtIso = expiresAtDate.toISOString();

      // Enforce coarse location privacy: round coordinates to 2 decimal places (~1.1 km)
      let coarseLocationData = null;
      if (coarseCoords?.lat != null && coarseCoords?.lng != null) {
        coarseLocationData = {
          lat: Math.round(Number(coarseCoords.lat) * 100) / 100,
          lng: Math.round(Number(coarseCoords.lng) * 100) / 100,
          city: coarseCity || "Kerala",
          precision: "coarse_1km",
          updatedAt: isoNow,
        };
      } else if (coarseCity) {
        coarseLocationData = {
          city: coarseCity,
          precision: "manual_city",
          updatedAt: isoNow,
        };
      }

      const locationConsentRecord = {
        granted: Boolean(consentGranted),
        method: coarseCoords ? "gps_coarse" : "manual_city",
        consentedAt: isoNow,
        version: "1.0",
      };

      await db.collection("crew").doc(docId).update({
        available: true,
        autoExpired: false,
        availableAt: isoNow,
        availableExpiresAt: expiresAtIso,
        coarseLocation: coarseLocationData,
        locationConsent: locationConsentRecord,
        updatedAt: isoNow,
      });

      return NextResponse.json({
        success: true,
        available: true,
        availableExpiresAt: expiresAtIso,
        coarseLocation: coarseLocationData,
        message: "Availability switched ON. Active for 7 days unless reconfirmed.",
      });
    }

    // Switch Availability OFF (Busy)
    await db.collection("crew").doc(docId).update({
      available: false,
      autoExpired: false,
      coarseLocation: null, // Clear live location updates while busy
      updatedAt: isoNow,
    });

    return NextResponse.json({
      success: true,
      available: false,
      message: "Availability switched OFF. Profile hidden from available-only searches.",
    });
  } catch (err) {
    console.error("[/api/crew/availability POST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
