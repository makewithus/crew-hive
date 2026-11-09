/**
 * /api/recruiter/shortlist
 * Recruiter Shortlist API (P1)
 *
 * GET: Lists saved crew profiles for the authenticated recruiter
 * POST: Adds a crew profile to the shortlist (prevents duplicates)
 * DELETE: Removes a crew profile from the shortlist
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest, phoneToDocId } from "@/lib/server-auth";
import { checkFeatureAccess, FEATURES } from "@/lib/feature-access";

export async function GET(request) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const recruiterId = auth?.docId || phoneToDocId(searchParams.get("phone"));

    if (!recruiterId) {
      return NextResponse.json(
        { success: false, error: "Recruiter identification required." },
        { status: 401 }
      );
    }

    const db = adminDb();
    const docSnap = await db.collection("organizers").doc(recruiterId).get();
    const recruiterData = docSnap.exists ? docSnap.data() : {};

    // Check feature access
    const access = checkFeatureAccess(FEATURES.SHORTLISTS, recruiterData);

    const shortlistSnap = await db
      .collection("organizers")
      .doc(recruiterId)
      .collection("shortlist")
      .orderBy("savedAt", "desc")
      .get();

    const items = [];
    for (const d of shortlistSnap.docs) {
      const data = d.data();
      // Hydrate with latest public profile details
      const crewSnap = await db.collection("crew").doc(d.id).get();
      const crewData = crewSnap.exists ? crewSnap.data() : {};

      items.push({
        id: d.id,
        savedAt: data.savedAt,
        name: crewData.name || data.name || "Technician",
        role: crewData.role || data.role || "Crew Member",
        city: crewData.city || data.city || "Kerala",
        experience: crewData.experience || null,
        available: Boolean(crewData.available),
        ratePerDay: crewData.showRate !== false ? crewData.ratePerDay : null,
        profileImage: crewData.profileImage || null,
      });
    }

    return NextResponse.json({
      success: true,
      data: items,
      access,
    });
  } catch (err) {
    console.error("[/api/recruiter/shortlist] GET error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();
    const { crewId, name, role, city } = body;

    const recruiterId = auth?.docId || phoneToDocId(body.recruiterPhone);
    if (!recruiterId || !crewId) {
      return NextResponse.json(
        { success: false, error: "recruiter and crewId required." },
        { status: 400 }
      );
    }

    const targetDocId = phoneToDocId(crewId);
    const db = adminDb();
    const ts = new Date().toISOString();

    const itemRef = db
      .collection("organizers")
      .doc(recruiterId)
      .collection("shortlist")
      .doc(targetDocId);

    const existing = await itemRef.get();
    if (existing.exists) {
      return NextResponse.json({
        success: true,
        alreadySaved: true,
        message: "Crew member is already in your shortlist.",
      });
    }

    await itemRef.set({
      crewId: targetDocId,
      name: name || "",
      role: role || "",
      city: city || "",
      savedAt: ts,
    });

    return NextResponse.json({
      success: true,
      saved: true,
      message: "Added to shortlist.",
    });
  } catch (err) {
    console.error("[/api/recruiter/shortlist] POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const crewId = searchParams.get("crewId");
    const recruiterId = auth?.docId || phoneToDocId(searchParams.get("phone"));

    if (!recruiterId || !crewId) {
      return NextResponse.json(
        { success: false, error: "recruiter and crewId required." },
        { status: 400 }
      );
    }

    const db = adminDb();
    await db
      .collection("organizers")
      .doc(recruiterId)
      .collection("shortlist")
      .doc(phoneToDocId(crewId))
      .delete();

    return NextResponse.json({
      success: true,
      message: "Removed from shortlist.",
    });
  } catch (err) {
    console.error("[/api/recruiter/shortlist] DELETE error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

