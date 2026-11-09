/**
 * POST /api/admin/approve
 * Body: { id: string, role: 'crew' | 'employer', action: 'approve' | 'reject' }
 *
 * 1. Updates the crew / employer Firestore document status
 * 2. Updates the users document (approved flag)
 * 3. Sends a WhatsApp notification to the user
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendConversationMessage } from "@/lib/whatsapp";
import { buildApprovalMessage } from "@/lib/conversation";
import logger from "@/lib/logger";

export async function POST(request) {
  try {
    const { id, role, action } = await request.json();

    if (!id || !role || !action) {
      return NextResponse.json(
        { error: "Missing id, role, or action" },
        { status: 400 },
      );
    }

    const approved = action === "approve";
    const status = approved ? "approved" : "rejected";
    const ts = new Date().toISOString();
    const db = adminDb();

    // ── 1. Update the role-specific collection ──────────────────────────────
    // Support both organizer (new) and employer (legacy) collection names
    const collection =
      role === "organizer" || role === "employer" ? "organizers" : "crew";
    await db
      .collection(collection)
      .doc(id)
      .update({ status, approved, updatedAt: ts })
      .catch(() =>
        // Fallback to legacy collection name if organizers doesn't exist yet
        db
          .collection("employers")
          .doc(id)
          .update({ status, approved, updatedAt: ts }),
      );

    // ── 2. Update the users collection ─────────────────────────────────────
    const isOrganizer = role === "organizer" || role === "employer";
    const approvedStep = isOrganizer ? "emp_complete" : "crew_complete";
    await db.collection("users").doc(id).update({
      approved,
      updatedAt: ts,
      ...(approved ? { step: approvedStep } : {}),
    });

    // ── 3. Send WhatsApp notification ───────────────────────────────────────
    if (approved) {
      // Fetch the phone number stored for OTP (may differ from WhatsApp number)
      const userSnap = await db.collection("users").doc(id).get();
      const userData = userSnap.data() || {};
      // Prefer the whatsappPhone for the notification (that's their active chat)
      const whatsappPhone = userData.whatsappPhone || `+${id}`;
      const msg = buildApprovalMessage(role);
      await sendConversationMessage(whatsappPhone, msg);
      logger.log(
        "[ApproveAPI] Approval notification sent | id:",
        id,
        "| role:",
        role,
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    logger.error("[ApproveAPI] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
