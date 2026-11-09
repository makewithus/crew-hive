/**
 * /api/admin/metrics
 * Genuine Platform Metrics API
 *
 * Implements Prompt 3 Section 15E:
 * - Signups by city
 * - Signups by role
 * - Active availability
 * - Requests sent
 * - Replies received (accepted, declined, no_response)
 * Backend-derived from real database records.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest } from "@/lib/server-auth";

export async function GET(request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const db = adminDb();

    // Fetch collections in parallel
    const [usersSnap, crewSnap, organizersSnap, bookingsSnap, requestsSnap] =
      await Promise.all([
        db.collection("users").get(),
        db.collection("crew").get(),
        db.collection("organizers").get(),
        db.collection("bookings").get(),
        db.collection("availability_requests").get(),
      ]);

    const users = usersSnap.docs.map((d) => d.data());
    const crew = crewSnap.docs.map((d) => d.data());
    const organizers = organizersSnap.docs.map((d) => d.data());
    const bookings = bookingsSnap.docs.map((d) => d.data());
    const requests = requestsSnap.docs.map((d) => d.data());

    // 1. Signups by City
    const cityCounts = {};
    for (const u of [...crew, ...organizers]) {
      const city = u.city?.trim() || "Unspecified";
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    }
    const signupsByCity = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    // 2. Signups by Role
    const roleCounts = {};
    for (const c of crew) {
      const role = c.role || c.crewRole || "Unassigned";
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    const signupsByRole = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Active Availability
    const now = new Date();
    let activeAvailabilityCount = 0;
    for (const c of crew) {
      if (c.status === "approved" && c.available && !c.hidden) {
        if (c.availableUntil) {
          const exp = new Date(c.availableUntil);
          if (!isNaN(exp.getTime()) && exp < now) continue;
        }
        activeAvailabilityCount += 1;
      }
    }

    // 4. Requests sent & Replies received
    let totalRequestsSent = requests.length;
    let acceptedReplies = 0;
    let declinedReplies = 0;
    let noResponseReplies = 0;
    let pendingReplies = 0;

    for (const req of requests) {
      const pings = req.crewPings || [];
      for (const p of pings) {
        if (p.status === "accepted") acceptedReplies += 1;
        else if (p.status === "declined" || p.status === "rejected") declinedReplies += 1;
        else if (p.status === "no_response") noResponseReplies += 1;
        else if (p.status === "pending") pendingReplies += 1;
      }
    }

    // Include direct bookings in reply counts
    for (const b of bookings) {
      if (!b.requestId) {
        totalRequestsSent += 1;
        if (b.status === "accepted") acceptedReplies += 1;
        else if (b.status === "declined" || b.status === "rejected") declinedReplies += 1;
        else if (b.status === "no_response") noResponseReplies += 1;
        else if (b.status === "pending") pendingReplies += 1;
      }
    }

    const totalRepliesReceived = acceptedReplies + declinedReplies + noResponseReplies;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalUsers: users.length,
          totalCrew: crew.length,
          totalOrganizers: organizers.length,
          approvedCrew: crew.filter((c) => c.status === "approved").length,
          pendingCrew: crew.filter((c) => c.status === "pending").length,
          activeAvailability: activeAvailabilityCount,
          totalRequestsSent,
          totalRepliesReceived,
          acceptedReplies,
          declinedReplies,
          noResponseReplies,
          pendingReplies,
        },
        signupsByCity,
        signupsByRole,
      },
    });
  } catch (err) {
    console.error("[/api/admin/metrics] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

