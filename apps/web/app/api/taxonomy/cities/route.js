/**
 * /api/taxonomy/cities
 * GET: Returns supported cities and districts with EN/ML names.
 * POST: Admin-only — updates supported cities/districts.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { CITIES } from "@/utils/taxonomy";
import { authenticateRequest } from "@/lib/server-auth";

export async function GET() {
  try {
    const db = adminDb();
    const docSnap = await db.collection("settings").doc("cities").get();

    if (docSnap.exists && Array.isArray(docSnap.data()?.cities)) {
      return NextResponse.json({
        success: true,
        data: docSnap.data().cities,
      });
    }

    return NextResponse.json({
      success: true,
      data: CITIES,
    });
  } catch (err) {
    console.error("[/api/taxonomy/cities] GET error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cities, city } = body;
    const db = adminDb();
    const ts = new Date().toISOString();

    if (Array.isArray(cities)) {
      await db.collection("settings").doc("cities").set({
        cities,
        updatedAt: ts,
        updatedBy: auth.phone || auth.uid,
      });
      return NextResponse.json({ success: true, data: cities });
    }

    if (city && city.id) {
      const currentSnap = await db.collection("settings").doc("cities").get();
      let currentCities = currentSnap.exists && Array.isArray(currentSnap.data()?.cities)
        ? [...currentSnap.data().cities]
        : [...CITIES];

      const existingIndex = currentCities.findIndex((c) => c.id === city.id);
      if (existingIndex >= 0) {
        currentCities[existingIndex] = { ...currentCities[existingIndex], ...city };
      } else {
        currentCities.push(city);
      }

      await db.collection("settings").doc("cities").set({
        cities: currentCities,
        updatedAt: ts,
        updatedBy: auth.phone || auth.uid,
      });

      return NextResponse.json({ success: true, data: currentCities });
    }

    return NextResponse.json(
      { success: false, error: "Invalid cities payload" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[/api/taxonomy/cities] POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

