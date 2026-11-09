/**
 * /api/recruiter/shows
 * Recruiter Show Lists API (P1 — Crew for this show)
 *
 * GET: Lists shows for the recruiter, or a specific show with crew grouped by role
 * POST: Creates or updates a show
 * DELETE: Deletes a show
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
    const showId = searchParams.get("showId");

    if (!recruiterId) {
      return NextResponse.json(
        { success: false, error: "Recruiter identification required." },
        { status: 401 }
      );
    }

    const db = adminDb();
    const docSnap = await db.collection("organizers").doc(recruiterId).get();
    const recruiterData = docSnap.exists ? docSnap.data() : {};
    const access = checkFeatureAccess(FEATURES.SHOW_LISTS, recruiterData);

    const showsRef = db.collection("organizers").doc(recruiterId).collection("shows");

    if (showId) {
      const showSnap = await showsRef.doc(showId).get();
      if (!showSnap.exists) {
        return NextResponse.json({ success: false, error: "Show not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { id: showSnap.id, ...showSnap.data() },
        access,
      });
    }

    const snap = await showsRef.orderBy("createdAt", "desc").get();
    const shows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      success: true,
      data: shows,
      access,
    });
  } catch (err) {
    console.error("[/api/recruiter/shows] GET error:", err);
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
    const { id, title, location, date, roles = [], crewSlots = [] } = body;

    const recruiterId = auth?.docId || phoneToDocId(body.recruiterPhone);
    if (!recruiterId || !title) {
      return NextResponse.json(
        { success: false, error: "recruiter and title required." },
        { status: 400 }
      );
    }

    const db = adminDb();
    const ts = new Date().toISOString();
    const showsRef = db.collection("organizers").doc(recruiterId).collection("shows");

    const payload = {
      title,
      location: location || "",
      date: date || "",
      roles, // e.g. ["Lighting", "Sound", "Camera", "Stage"]
      crewSlots, // [{ crewId, name, role, status }]
      updatedAt: ts,
    };

    if (id) {
      await showsRef.doc(id).set(payload, { merge: true });
      return NextResponse.json({ success: true, id, message: "Show updated" });
    }

    payload.createdAt = ts;
    const newRef = await showsRef.add(payload);
    return NextResponse.json({ success: true, id: newRef.id, message: "Show created" });
  } catch (err) {
    console.error("[/api/recruiter/shows] POST error:", err);
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
    const showId = searchParams.get("showId");
    const recruiterId = auth?.docId || phoneToDocId(searchParams.get("phone"));

    if (!recruiterId || !showId) {
      return NextResponse.json(
        { success: false, error: "recruiter and showId required." },
        { status: 400 }
      );
    }

    const db = adminDb();
    await db
      .collection("organizers")
      .doc(recruiterId)
      .collection("shows")
      .doc(showId)
      .delete();

    return NextResponse.json({ success: true, message: "Show deleted" });
  } catch (err) {
    console.error("[/api/recruiter/shows] DELETE error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

