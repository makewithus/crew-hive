/**
 * /api/crew/requests
 * Incoming availability requests management for crew.
 * - Lists pending, accepted, declined, expired requests
 * - Handles Accept ("Yes") & Decline ("No")
 * - Enforces single response (prevents duplicates)
 * - Records response timestamp & response channel ("web")
 * - Tracks missed/declined requests to prompt availability review
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const docId = phoneToDocId(phone);
    const decoded = await verifyToken(req);

    if (decoded && !isDevBypass()) {
      const callerDigits = (decoded.phone_number || decoded.uid || "").replace(/\D/g, "");
      const isAdmin = decoded.role === "admin" || decoded.role === "super_admin";
      if (!isAdmin && callerDigits && callerDigits !== docId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const db = adminDb();
    const snap = await db
      .collection("bookings")
      .where("crewId", "==", docId)
      .get();

    const now = Date.now();
    let missedOrDeclinedCount = 0;

    const requests = snap.docs.map((d) => {
      const item = { id: d.id, ...d.data() };
      const deadlinePassed = item.responseDeadline
        ? new Date(item.responseDeadline).getTime() < now
        : false;

      // Tag expired if status was still pending after deadline
      if (item.status === "pending" && deadlinePassed) {
        item.status = "expired";
      }

      if (item.status === "declined" || item.status === "expired") {
        missedOrDeclinedCount++;
      }

      return item;
    });

    // Sort newest first
    requests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return NextResponse.json({
      success: true,
      data: requests,
      missedOrDeclinedCount,
      shouldPromptAvailabilityReview: missedOrDeclinedCount >= 3,
    });
  } catch (err) {
    console.error("[/api/crew/requests GET] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { bookingId, response, phone } = body; // response = "accepted" | "declined"

    if (!bookingId || !response || !phone) {
      return NextResponse.json(
        { error: "bookingId, response ('accepted' | 'declined'), and phone are required." },
        { status: 400 }
      );
    }

    if (response !== "accepted" && response !== "declined") {
      return NextResponse.json(
        { error: "Invalid response action. Must be 'accepted' or 'declined'." },
        { status: 400 }
      );
    }

    const docId = phoneToDocId(phone);
    const decoded = await verifyToken(req);

    // Enforce ownership
    if (decoded && !isDevBypass()) {
      const callerDigits = (decoded.phone_number || decoded.uid || "").replace(/\D/g, "");
      const isAdmin = decoded.role === "admin" || decoded.role === "super_admin";
      if (!isAdmin && callerDigits && callerDigits !== docId) {
        return NextResponse.json({ error: "Forbidden: Caller mismatch." }, { status: 403 });
      }
    }

    const db = adminDb();
    const bookingRef = db.collection("bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const booking = snap.data();

    // Verify booking belongs to this crew member
    if (phoneToDocId(booking.crewId) !== docId) {
      return NextResponse.json(
        { error: "Forbidden: This request does not belong to you." },
        { status: 403 }
      );
    }

    // DUPLICATE RESPONSE PREVENTION
    if (booking.status !== "pending") {
      return NextResponse.json(
        {
          error: `This request was already ${booking.status}. Duplicate responses are not allowed.`,
          currentStatus: booking.status,
        },
        { status: 409 }
      );
    }

    // EXPIRED REQUEST HANDLING
    const now = Date.now();
    if (booking.responseDeadline && new Date(booking.responseDeadline).getTime() < now) {
      await bookingRef.update({
        status: "expired",
        expiredAt: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "This request has expired and can no longer be answered.", status: "expired" },
        { status: 410 }
      );
    }

    const isoNow = new Date().toISOString();
    const updatePayload = {
      status: response,
      respondedAt: isoNow,
      responseChannel: "web",
      updatedAt: isoNow,
    };

    const batch = db.batch();
    batch.update(bookingRef, updatePayload);

    // If crew accepts, mark them as busy/booked
    if (response === "accepted") {
      batch.update(db.collection("crew").doc(docId), {
        available: false,
        lastAcceptedBookingId: bookingId,
        updatedAt: isoNow,
      });
    } else if (response === "declined") {
      // Track decline history count on crew profile
      const crewSnap = await db.collection("crew").doc(docId).get();
      const currentDeclines = crewSnap.exists ? crewSnap.data().declinedCount || 0 : 0;
      batch.update(db.collection("crew").doc(docId), {
        declinedCount: currentDeclines + 1,
        lastDeclinedAt: isoNow,
        updatedAt: isoNow,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      status: response,
      respondedAt: isoNow,
      responseChannel: "web",
      message: response === "accepted" ? "Request accepted." : "Request declined.",
    });
  } catch (err) {
    console.error("[/api/crew/requests POST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
