/**
 * /api/admin/reports
 * Report Moderation Queue API
 *
 * Implements Prompt 3 Section 15B:
 * - List reports queue (Report ID, Reporter, Reported profile, Reason, Submission date, Status)
 * - Submit a new report (public/authenticated)
 * - Resolve, dismiss, or take moderation action (warn, hide profile)
 * - Preserves moderation history and audit log
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest, phoneToDocId } from "@/lib/server-auth";

export async function GET(request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "all";
    const db = adminDb();

    let query = db.collection("reports").orderBy("createdAt", "desc");
    const snap = await query.get();

    let reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (statusFilter !== "all") {
      reports = reports.filter((r) => r.status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (err) {
    console.error("[/api/admin/reports] GET error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const db = adminDb();
    const ts = new Date().toISOString();

    // 1. Submit report (by recruiter, crew, or user)
    if (!action || action === "submit") {
      const { reportedProfileId, reporterPhone, reporterName, reason, details = "" } = body;

      if (!reportedProfileId || !reason) {
        return NextResponse.json(
          { success: false, error: "reportedProfileId and reason are required." },
          { status: 400 }
        );
      }

      // Fetch reported profile name/role for context
      const targetDocId = phoneToDocId(reportedProfileId);
      const crewSnap = await db.collection("crew").doc(targetDocId).get();
      const crewData = crewSnap.exists ? crewSnap.data() : {};

      const reportPayload = {
        reportedProfileId: targetDocId,
        reportedName: crewData.name || "Technician",
        reportedRole: crewData.role || "Crew",
        reporterPhone: reporterPhone || "Anonymous",
        reporterName: reporterName || "User",
        reason,
        details,
        status: "pending", // pending, reviewing, resolved, dismissed
        moderationAction: null,
        moderationNotes: "",
        createdAt: ts,
        updatedAt: ts,
      };

      const ref = await db.collection("reports").add(reportPayload);

      return NextResponse.json({
        success: true,
        reportId: ref.id,
        message: "Report submitted successfully. CrewHive moderation will review.",
      });
    }

    // 2. Admin Moderation Actions (requires Admin)
    const auth = await authenticateRequest(request);
    if (!auth || !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { reportId, moderationAction, moderationNotes = "" } = body;
    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "reportId is required." },
        { status: 400 }
      );
    }

    const reportRef = db.collection("reports").doc(reportId);
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) {
      return NextResponse.json({ success: false, error: "Report not found." }, { status: 404 });
    }

    const reportData = reportSnap.data();
    const reportedId = reportData.reportedProfileId;

    // Apply moderation action if specified
    if (moderationAction === "hide_profile" && reportedId) {
      await db.collection("crew").doc(reportedId).update({ hidden: true, updatedAt: ts });
    }

    const resolvedStatus = moderationAction === "dismiss" ? "dismissed" : "resolved";

    await reportRef.update({
      status: resolvedStatus,
      moderationAction: moderationAction || "resolved",
      moderationNotes,
      resolvedAt: ts,
      resolvedBy: auth.phone || auth.uid,
      updatedAt: ts,
    });

    // Record in audit log
    await db.collection("audit_logs").add({
      action: "report_moderated",
      reportId,
      reportedProfileId: reportedId,
      moderationAction: moderationAction || "resolved",
      moderationNotes,
      performedBy: auth.phone || auth.uid,
      timestamp: ts,
    });

    return NextResponse.json({
      success: true,
      message: `Report marked as ${resolvedStatus}.`,
      status: resolvedStatus,
    });
  } catch (err) {
    console.error("[/api/admin/reports] POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

