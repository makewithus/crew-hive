/**
 * /api/requests/create
 * Creates an Availability Request to matching available crew
 *
 * Implements Prompt 3 Sections 9, 11:
 * - Validates role, work date, work location, type of work
 * - Maximum 10 crew pings per request
 * - Daily spam limits per crew member (max 3 pings/24h)
 * - Duplicate request prevention
 * - Syncs notifications to crew via WhatsApp conversation state machine & bookings
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest, phoneToDocId } from "@/lib/server-auth";
import { sendBookingNotificationToCrew } from "@/lib/booking-notify";

const MAX_CREW_PINGS = 10;
const MAX_DAILY_PINGS_PER_CREW = 3;
const DEFAULT_RESPONSE_WINDOW_MINUTES = 120; // 2 hours

export async function POST(request) {
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();

    const {
      role,
      specialisation = "",
      date,
      location,
      workType,
      notes = "",
      targetCrewIds = [],
      responseWindowMinutes = DEFAULT_RESPONSE_WINDOW_MINUTES,
    } = body;

    // 1. Validate required fields
    if (!role || !date || !location || !workType) {
      return NextResponse.json(
        {
          success: false,
          error: "Required fields missing: role, date, location, and workType are required.",
        },
        { status: 400 }
      );
    }

    const recruiterId = auth?.docId || phoneToDocId(body.recruiterPhone) || "guest_recruiter";
    const recruiterPhone = auth?.phone || body.recruiterPhone || `+${recruiterId}`;
    const recruiterName = body.recruiterName || "Recruiter";

    const db = adminDb();
    const now = new Date();
    const ts = now.toISOString();

    // 2. Duplicate Request Prevention: check last 2 minutes
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
    const recentRequestsSnap = await db
      .collection("availability_requests")
      .where("recruiterId", "==", recruiterId)
      .get();

    for (const doc of recentRequestsSnap.docs) {
      const d = doc.data();
      if (d.createdAt && d.createdAt < twoMinutesAgo) continue;
      if (
        d.role === role &&
        d.date === date &&
        String(d.location).toLowerCase().trim() === String(location).toLowerCase().trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Duplicate request detected. A matching request was sent less than 2 minutes ago.",
          },
          { status: 429 }
        );
      }
    }

    // 3. Find target crew members
    let candidateCrew = [];

    if (Array.isArray(targetCrewIds) && targetCrewIds.length > 0) {
      // Direct request to specific crew members
      const uniqueTargetIds = Array.from(new Set(targetCrewIds.map(phoneToDocId))).slice(0, MAX_CREW_PINGS);
      for (const cid of uniqueTargetIds) {
        const snap = await db.collection("crew").doc(cid).get();
        if (snap.exists) {
          candidateCrew.push({ id: snap.id, ...snap.data() });
        }
      }
    } else {
      // Match eligible available crew in the database
      const crewSnap = await db
        .collection("crew")
        .where("status", "==", "approved")
        .get();

      const roleNorm = String(role).toLowerCase().replace(/[^a-z0-9]/g, "");
      const cityNorm = String(location).toLowerCase().replace(/[^a-z0-9]/g, "");

      for (const doc of crewSnap.docs) {
        const data = doc.data();
        if (data.hidden) continue;
        if (!data.available) continue;

        // Auto-expiration check
        if (data.availableUntil) {
          const exp = new Date(data.availableUntil);
          if (!isNaN(exp.getTime()) && exp < now) continue;
        }

        const crewRoleNorm = String(data.role || data.crewRole || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const matchesRole = crewRoleNorm.includes(roleNorm) || (roleNorm.length >= 3 && roleNorm.includes(crewRoleNorm));
        if (!matchesRole) continue;

        candidateCrew.push({ id: doc.id, ...data });
        if (candidateCrew.length >= MAX_CREW_PINGS * 2) break; // gather a pool
      }
    }

    if (candidateCrew.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No available crew found matching the specified role and criteria.",
        },
        { status: 404 }
      );
    }

    // 4. Daily spam limit check per crew member (max 3 pings per 24 hours)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    let pastDayRequestsDocs = [];
    try {
      const pastDayRequests = await db
        .collection("availability_requests")
        .where("createdAt", ">=", twentyFourHoursAgo)
        .get();
      pastDayRequestsDocs = pastDayRequests.docs;
    } catch (_) {
      const recent = await db.collection("availability_requests").limit(100).get();
      pastDayRequestsDocs = recent.docs.filter(
        (d) => d.data()?.createdAt && d.data().createdAt >= twentyFourHoursAgo
      );
    }

    const crewPingCounts = {};
    for (const rDoc of pastDayRequestsDocs) {
      const pings = rDoc.data().crewPings || [];
      for (const p of pings) {
        crewPingCounts[p.crewId] = (crewPingCounts[p.crewId] || 0) + 1;
      }
    }

    const eligibleCrew = candidateCrew.filter(
      (c) => (crewPingCounts[c.id] || 0) < MAX_DAILY_PINGS_PER_CREW
    ).slice(0, MAX_CREW_PINGS);

    if (eligibleCrew.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Matching crew members have reached their daily request limit. Please try again tomorrow or broaden criteria.",
        },
        { status: 429 }
      );
    }

    // 5. Create request record
    const expiresAt = new Date(
      now.getTime() + responseWindowMinutes * 60 * 1000
    ).toISOString();

    const crewPings = eligibleCrew.map((c) => ({
      crewId: c.id,
      name: c.name || "Technician",
      phone: c.phone || `+${c.id}`,
      role: c.role || role,
      city: c.city || location,
      status: "pending",
      pingedAt: ts,
      respondedAt: null,
    }));

    const requestPayload = {
      recruiterId,
      recruiterPhone,
      recruiterName,
      role,
      specialisation,
      date,
      location,
      workType,
      notes,
      status: "pending",
      responseWindowMinutes,
      expiresAt,
      crewPings,
      totalPings: crewPings.length,
      acceptedCount: 0,
      declinedCount: 0,
      noResponseCount: 0,
      createdAt: ts,
      updatedAt: ts,
    };

    const requestRef = await db.collection("availability_requests").add(requestPayload);
    const requestId = requestRef.id;

    // 6. Dispatch notifications to crew members (parallel)
    const notificationPromises = eligibleCrew.map(async (crewMember) => {
      try {
        // Also create a linked booking record for each crew member so conversation state machine works
        const bookingRef = await db.collection("bookings").add({
          requestId,
          crewId: crewMember.id,
          organizerId: recruiterId,
          recruiterPhone,
          crewName: crewMember.name || "",
          date,
          location,
          workType,
          notes,
          status: "pending",
          createdAt: ts,
          updatedAt: ts,
        });

        // Trigger WhatsApp notification via conversation engine
        const jobDetails = `Date: ${date} | Location: ${location} | Type: ${workType}${notes ? ` | Notes: ${notes}` : ""}`;
        await sendBookingNotificationToCrew(
          crewMember.id,
          bookingRef.id,
          recruiterName,
          jobDetails
        );
      } catch (e) {
        console.error(`[RequestCreate] Notification error for crew ${crewMember.id}:`, e);
      }
    });

    await Promise.allSettled(notificationPromises);

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        id: requestId,
        ...requestPayload,
      },
      pingsSent: eligibleCrew.length,
    });
  } catch (err) {
    console.error("[/api/requests/create] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
