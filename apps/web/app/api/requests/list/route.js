/**
 * /api/requests/list
 * Returns availability requests for the authenticated recruiter
 *
 * Implements Prompt 3 Sections 4B, 10:
 * - Request details, crew contacted, pending/accepted/declined/no-response counts
 * - Automatically checks response window expiration and marks no_response
 * - Syncs live responses from linked bookings
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest, phoneToDocId } from "@/lib/server-auth";

export async function GET(request) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const phoneParam = searchParams.get("phone");
    const recruiterId = auth?.docId || (phoneParam ? phoneToDocId(phoneParam) : null);

    if (!recruiterId) {
      return NextResponse.json(
        { success: false, error: "Recruiter identification required." },
        { status: 401 }
      );
    }

    const db = adminDb();
    const now = new Date();

    // Query availability requests for this recruiter
    const snap = await db
      .collection("availability_requests")
      .where("recruiterId", "==", recruiterId)
      .get();

    let requests = [];
    let aggregate = {
      totalRequests: 0,
      pendingResponses: 0,
      acceptedResponses: 0,
      declinedResponses: 0,
      noResponses: 0,
    };

    for (const doc of snap.docs) {
      const data = doc.data();
      let crewPings = data.crewPings || [];
      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      const isExpired = expiresAt && !isNaN(expiresAt.getTime()) && expiresAt < now;
      let pingsModified = false;

      // Check linked bookings to sync any accepted / declined statuses from crew
      const bookingsSnap = await db
        .collection("bookings")
        .where("requestId", "==", doc.id)
        .get();

      const bookingStatusesByCrew = {};
      bookingsSnap.docs.forEach((bDoc) => {
        const b = bDoc.data();
        bookingStatusesByCrew[b.crewId] = b.status;
      });

      // Update ping statuses
      crewPings = crewPings.map((ping) => {
        const liveBookingStatus = bookingStatusesByCrew[ping.crewId];

        if (liveBookingStatus === "accepted") {
          return { ...ping, status: "accepted", respondedAt: ping.respondedAt || now.toISOString() };
        }
        if (liveBookingStatus === "rejected" || liveBookingStatus === "declined") {
          return { ...ping, status: "declined", respondedAt: ping.respondedAt || now.toISOString() };
        }
        // If still pending and past expiration window: mark as no_response
        if (ping.status === "pending" && isExpired) {
          pingsModified = true;
          return { ...ping, status: "no_response" };
        }
        return ping;
      });

      // Recalculate counts
      const acceptedCount = crewPings.filter((p) => p.status === "accepted").length;
      const declinedCount = crewPings.filter((p) => p.status === "declined").length;
      const noResponseCount = crewPings.filter((p) => p.status === "no_response").length;
      const pendingCount = crewPings.filter((p) => p.status === "pending").length;

      let overallStatus = data.status;
      if (acceptedCount > 0) {
        overallStatus = "accepted";
      } else if (pendingCount === 0 && noResponseCount > 0 && declinedCount === 0) {
        overallStatus = "no_response";
      } else if (pendingCount === 0 && declinedCount > 0) {
        overallStatus = "declined";
      }

      if (pingsModified || overallStatus !== data.status) {
        await db.collection("availability_requests").doc(doc.id).update({
          crewPings,
          status: overallStatus,
          acceptedCount,
          declinedCount,
          noResponseCount,
          updatedAt: now.toISOString(),
        });
      }

      aggregate.totalRequests += 1;
      aggregate.pendingResponses += pendingCount;
      aggregate.acceptedResponses += acceptedCount;
      aggregate.declinedResponses += declinedCount;
      aggregate.noResponses += noResponseCount;

      requests.push({
        id: doc.id,
        ...data,
        crewPings,
        status: overallStatus,
        acceptedCount,
        declinedCount,
        noResponseCount,
        pendingCount,
      });
    }

    // Also check direct bookings sent through /organizer/crew/[id]
    const directBookingsSnap = await db
      .collection("bookings")
      .where("organizerId", "==", recruiterId)
      .get();

    for (const bDoc of directBookingsSnap.docs) {
      const b = bDoc.data();
      // Only include bookings not already tracked in availability_requests
      if (!b.requestId) {
        aggregate.totalRequests += 1;
        if (b.status === "pending") aggregate.pendingResponses += 1;
        else if (b.status === "accepted") aggregate.acceptedResponses += 1;
        else if (b.status === "rejected" || b.status === "declined") aggregate.declinedResponses += 1;
        else if (b.status === "no_response") aggregate.noResponses += 1;
      }
    }

    // Sort requests by newest first
    requests.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({
      success: true,
      data: requests,
      aggregate,
    });
  } catch (err) {
    console.error("[/api/requests/list] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

