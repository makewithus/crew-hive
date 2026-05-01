/**
 * POST /api/auth/signup
 * Creates crew or organizer profile using the admin SDK (bypasses Firestore rules).
 * Called from the web signup modal after OTP verification.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, role, crewData, organizerData } = body;

    if (!phone || !role) {
      return NextResponse.json({ error: "phone and role are required" }, { status: 400 });
    }

    const id = phoneToDocId(phone);
    const db = adminDb();
    const now = new Date().toISOString();

    if (role === "crew") {
      if (!crewData) return NextResponse.json({ error: "crewData required" }, { status: 400 });

      const batch = db.batch();

      // users doc
      batch.set(
        db.collection("users").doc(id),
        {
          phone: `+${id}`,
          role: "crew",
          approved: false,
          name: crewData.name,
          signupSource: "web",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

      // crew doc
      batch.set(
        db.collection("crew").doc(id),
        {
          id,
          phone: `+${id}`,
          name: crewData.name,
          city: crewData.city,
          role: crewData.crewRole,
          experience: crewData.experience,
          status: "pending",
          available: false,
          signupSource: "web",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

      await batch.commit();

      return NextResponse.json({ success: true, role: "crew", approved: false });
    }

    if (role === "organizer") {
      if (!organizerData) return NextResponse.json({ error: "organizerData required" }, { status: 400 });

      const batch = db.batch();

      // organizers doc (authoritative for organizer role)
      batch.set(
        db.collection("organizers").doc(id),
        {
          id,
          phone: `+${id}`,
          name: organizerData.name,
          companyName: organizerData.companyName,
          city: organizerData.city,
          requirements: organizerData.requirements || "",
          signupSource: "web",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

      // users doc
      batch.set(
        db.collection("users").doc(id),
        {
          phone: `+${id}`,
          role: "organizer",
          approved: true,
          name: organizerData.name,
          signupSource: "web",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

      await batch.commit();

      return NextResponse.json({ success: true, role: "organizer", approved: true });
    }

    return NextResponse.json({ error: "Invalid role. Must be crew or organizer." }, { status: 400 });
  } catch (err) {
    console.error("[signup] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
