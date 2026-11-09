/**
 * GET /api/features
 * Returns the current platform feature access tier and configuration.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_FEATURE_CONFIG, checkFeatureAccess, FEATURES } from "@/lib/feature-access";

export async function GET(request) {
  try {
    const db = adminDb();
    let config = { ...DEFAULT_FEATURE_CONFIG };

    // Check if platform settings in Firestore override defaults
    try {
      const snap = await db.collection("settings").doc("feature_access").get();
      if (snap.exists) {
        config = { ...config, ...snap.data() };
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      data: {
        activeTier: config.activeTier,
        trialDurationDays: config.trialDurationDays,
        gatedFeatures: config.gatedFeatures,
        supportContact: config.supportContact,
        inquiryWhatsapp: config.inquiryWhatsapp,
      },
    });
  } catch (err) {
    console.error("[/api/features] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

