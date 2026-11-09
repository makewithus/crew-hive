/**
 * /api/admin/profiles
 * Admin Profile Management API
 *
 * Implements Prompt 3 Section 15A:
 * - View new, approved, and hidden profiles
 * - Approve or reject profiles
 * - Hide or unhide profiles
 * - Edit professional role classifications
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
    const filter = searchParams.get("filter") || "all"; // all, pending, approved, hidden
    const db = adminDb();

    const crewSnap = await db.collection("crew").orderBy("createdAt", "desc").get();
    let profiles = crewSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (filter === "pending") {
      profiles = profiles.filter((p) => p.status === "pending");
    } else if (filter === "approved") {
      profiles = profiles.filter((p) => p.status === "approved" && !p.hidden);
    } else if (filter === "hidden") {
      profiles = profiles.filter((p) => p.hidden === true);
    }

    return NextResponse.json({
      success: true,
      data: profiles,
    });
  } catch (err) {
    console.error("[/api/admin/profiles] GET error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, action, updates = {} } = body;
    const docId = phoneToDocId(id);

    if (!docId || !action) {
      return NextResponse.json(
        { success: false, error: "Profile id and action required." },
        { status: 400 }
      );
    }

    const db = adminDb();
    const ts = new Date().toISOString();
    const crewRef = db.collection("crew").doc(docId);
    const userRef = db.collection("users").doc(docId);

    // 1. Approve
    if (action === "approve") {
      await crewRef.update({ status: "approved", approved: true, updatedAt: ts });
      await userRef.update({ approved: true, step: "crew_complete", updatedAt: ts });

      // Record audit log
      await db.collection("audit_logs").add({
        action: "profile_approved",
        targetId: docId,
        performedBy: auth.phone || auth.uid,
        timestamp: ts,
      });

      return NextResponse.json({ success: true, message: "Profile approved." });
    }

    // 2. Reject
    if (action === "reject") {
      await crewRef.update({ status: "rejected", approved: false, updatedAt: ts });
      await userRef.update({ approved: false, updatedAt: ts });

      await db.collection("audit_logs").add({
        action: "profile_rejected",
        targetId: docId,
        performedBy: auth.phone || auth.uid,
        timestamp: ts,
      });

      return NextResponse.json({ success: true, message: "Profile rejected." });
    }

    // 3. Hide / Unhide profile
    if (action === "toggle_hide") {
      const snap = await crewRef.get();
      const currentHidden = Boolean(snap.exists && snap.data()?.hidden);
      const newHiddenState = !currentHidden;

      await crewRef.update({ hidden: newHiddenState, updatedAt: ts });

      await db.collection("audit_logs").add({
        action: newHiddenState ? "profile_hidden" : "profile_unhidden",
        targetId: docId,
        performedBy: auth.phone || auth.uid,
        timestamp: ts,
      });

      return NextResponse.json({
        success: true,
        hidden: newHiddenState,
        message: newHiddenState ? "Profile hidden from search." : "Profile unhidden.",
      });
    }

    // 4. Update classifications (role, specialisations, city, etc.)
    if (action === "update_classification") {
      const allowedUpdates = {};
      if (updates.role) allowedUpdates.role = updates.role;
      if (updates.specialisations) allowedUpdates.specialisations = updates.specialisations;
      if (updates.city) allowedUpdates.city = updates.city;
      if (updates.experience) allowedUpdates.experience = updates.experience;
      allowedUpdates.updatedAt = ts;

      await crewRef.update(allowedUpdates);

      await db.collection("audit_logs").add({
        action: "classification_updated",
        targetId: docId,
        changes: allowedUpdates,
        performedBy: auth.phone || auth.uid,
        timestamp: ts,
      });

      return NextResponse.json({
        success: true,
        message: "Profile classifications updated.",
        data: allowedUpdates,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error("[/api/admin/profiles] POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

