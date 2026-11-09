import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const BOOKING_RESPONSE = "booking_response";

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

function callerIds(decoded) {
  if (!decoded) return { raw: [], digits: [] };
  const raw = [decoded.uid, decoded.phone_number, decoded.phone].filter(Boolean);
  return {
    raw,
    digits: raw.map(phoneToDocId).filter(Boolean),
  };
}

export async function POST(req) {
  try {
    const { crewId, bookingId } = await req.json();
    const crewDocId = phoneToDocId(crewId);

    if (!crewDocId || !bookingId) {
      return NextResponse.json(
        { error: "crewId and bookingId are required" },
        { status: 400 },
      );
    }

    const decoded = await verifyToken(req);
    const allowDevBypass = isDevBypass();
    if (!decoded && !allowDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = adminDb();
    const bookingSnap = await db.collection("bookings").doc(bookingId).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data();
    if (phoneToDocId(booking.crewId) !== crewDocId) {
      return NextResponse.json(
        { error: "Booking does not belong to this crew member" },
        { status: 403 },
      );
    }

    const ids = callerIds(decoded);
    const ownerIds = [booking.organizerId, booking.employerId].filter(Boolean);
    const ownerDigitIds = ownerIds.map(phoneToDocId).filter(Boolean);
    const isAdmin =
      decoded?.role === "admin" || decoded?.role === "super_admin";
    const isBookingOwner =
      ownerIds.some((id) => ids.raw.includes(id)) ||
      ownerDigitIds.some((id) => ids.digits.includes(id));

    if (!allowDevBypass && !isAdmin && !isBookingOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ts = new Date().toISOString();
    const ref = db.collection("users").doc(crewDocId);
    const userSnap = await ref.get();
    const payload = {
      step: BOOKING_RESPONSE,
      pendingBookingId: bookingId,
      updatedAt: ts,
    };

    if (userSnap.exists) {
      await ref.update(payload);
    } else {
      await ref.set({
        phone: `+${crewDocId}`,
        whatsappPhone: `+${crewDocId}`,
        createdAt: ts,
        ...payload,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/bookings/notify]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
