/**
 * /api/requests/[id]
 * GET: returns request details and status of contacted crew
 * PATCH: allows recruiter to confirm match or cancel request
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest, phoneToDocId } from "@/lib/server-auth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = adminDb();
    const docSnap = await db.collection("availability_requests").doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Availability request not found." },
        { status: 404 }
      );
    }

    const data = docSnap.data();
    return NextResponse.json({
      success: true,
      data: { id: docSnap.id, ...data },
    });
  } catch (err) {
    console.error("[/api/requests/[id]] GET error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request);
    const body = await request.json();
    const { action, confirmedCrewId } = body;

    const db = adminDb();
    const reqRef = db.collection("availability_requests").doc(id);
    const docSnap = await reqRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Request not found." },
        { status: 404 }
      );
    }

    const currentData = docSnap.data();
    const ts = new Date().toISOString();

    if (action === "confirm_match" && confirmedCrewId) {
      // Recruiter confirmed a match with an accepted crew member
      const updatedPings = (currentData.crewPings || []).map((p) => {
        if (p.crewId === phoneToDocId(confirmedCrewId)) {
          return { ...p, status: "confirmed_match" };
        }
        return p;
      });

      await reqRef.update({
        status: "confirmed_match",
        confirmedCrewId: phoneToDocId(confirmedCrewId),
        crewPings: updatedPings,
        updatedAt: ts,
      });

      // Update linked booking
      const bSnap = await db
        .collection("bookings")
        .where("requestId", "==", id)
        .where("crewId", "==", phoneToDocId(confirmedCrewId))
        .get();

      if (!bSnap.empty) {
        await bSnap.docs[0].ref.update({ status: "confirmed", updatedAt: ts });
      }

      return NextResponse.json({ success: true, status: "confirmed_match" });
    }

    if (action === "cancel") {
      await reqRef.update({
        status: "cancelled",
        updatedAt: ts,
      });
      return NextResponse.json({ success: true, status: "cancelled" });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[/api/requests/[id]] PATCH error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

