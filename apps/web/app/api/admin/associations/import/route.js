/**
 * /api/admin/associations/import
 * Association CSV Member Import API
 *
 * Implements Prompt 3 Section 16:
 * - CSV validation: required columns (Name, Phone, Role, City)
 * - Duplicate detection: against existing Firestore users/crew and internal CSV duplicates
 * - Two modes:
 *     1. action="preview": returns preview rows, validation status, error messages, and summary
 *     2. action="execute": safely imports valid rows into association_members (status="imported_pending")
 *        and optionally queues WhatsApp invites
 * - Does NOT expose imported members as confirmed users until they complete onboarding
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest, phoneToDocId } from "@/lib/server-auth";
import { sendTextMessage } from "@/lib/whatsapp";

const APP_URL = () =>
  process.env.NEXT_PUBLIC_APP_URL || "https://crewhive.app";

// Helper to normalize phone numbers
function normalizePhoneNumber(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

// Helper to parse CSV lines safely
function parseCsvRows(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV file must contain a header row and at least one data row.");
  }

  // Parse header
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  // Identify column indices
  const nameIdx = headers.findIndex((h) => h.includes("name"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("whatsapp"));
  const roleIdx = headers.findIndex((h) => h.includes("role") || h.includes("category") || h.includes("skill"));
  const cityIdx = headers.findIndex((h) => h.includes("city") || h.includes("district") || h.includes("location"));

  if (nameIdx === -1 || phoneIdx === -1) {
    throw new Error(
      `Missing required columns. CSV must contain at least "Name" and "Phone" (Found: ${headers.join(", ")})`
    );
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic comma split respecting quoted values
    const line = lines[i];
    const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) =>
      c.trim().replace(/^["']|["']$/g, "")
    );

    const name = cells[nameIdx] || "";
    const phone = cells[phoneIdx] || "";
    const role = roleIdx >= 0 ? cells[roleIdx] || "Technician" : "Technician";
    const city = cityIdx >= 0 ? cells[cityIdx] || "Kerala" : "Kerala";

    rows.push({
      rowNumber: i + 1,
      name,
      phone,
      role,
      city,
    });
  }

  return rows;
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
    const { associationId, csvText, rows: inputRows, action = "preview", sendInvites = false } = body;

    if (!associationId) {
      return NextResponse.json(
        { success: false, error: "associationId is required." },
        { status: 400 }
      );
    }

    const db = adminDb();
    const assocSnap = await db.collection("associations").doc(associationId).get();
    if (!assocSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Association not found." },
        { status: 404 }
      );
    }
    const assocData = assocSnap.data();

    // Parse CSV if raw text provided
    let rawRows = [];
    if (csvText) {
      rawRows = parseCsvRows(csvText);
    } else if (Array.isArray(inputRows)) {
      rawRows = inputRows;
    } else {
      return NextResponse.json(
        { success: false, error: "csvText or rows array required." },
        { status: 400 }
      );
    }

    // Load existing database users & members to check duplicates
    const [existingUsersSnap, existingMembersSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("association_members").where("associationId", "==", associationId).get(),
    ]);

    const existingUserDocIds = new Set(existingUsersSnap.docs.map((d) => d.id));
    const existingMemberDocIds = new Set(existingMembersSnap.docs.map((d) => d.id));

    // Process & Validate rows
    const seenPhonesInCsv = new Set();
    const previewRows = [];
    let validCount = 0;
    let duplicateDbCount = 0;
    let duplicateCsvCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = row.rowNumber || i + 2;
      const normalizedPhone = normalizePhoneNumber(row.phone);
      const docId = phoneToDocId(normalizedPhone);

      const errors = [];

      if (!row.name || !String(row.name).trim()) {
        errors.push("Missing name");
      }
      if (!normalizedPhone || docId.length < 10) {
        errors.push("Invalid phone number");
      }

      let status = "valid";
      let reason = null;

      if (errors.length > 0) {
        status = "invalid";
        reason = errors.join(", ");
        invalidCount++;
      } else if (seenPhonesInCsv.has(docId)) {
        status = "duplicate_csv";
        reason = "Duplicate phone number in this CSV";
        duplicateCsvCount++;
      } else if (existingMemberDocIds.has(docId)) {
        status = "already_member";
        reason = "Already an association member";
        duplicateDbCount++;
      } else if (existingUserDocIds.has(docId)) {
        status = "existing_user";
        reason = "User account already exists on CrewHive (will link association badge)";
        validCount++;
        seenPhonesInCsv.add(docId);
      } else {
        status = "valid";
        validCount++;
        seenPhonesInCsv.add(docId);
      }

      previewRows.push({
        rowNumber: rowNum,
        name: row.name,
        phone: row.phone,
        normalizedPhone,
        docId,
        role: row.role || "Technician",
        city: row.city || "Kerala",
        status,
        reason,
      });
    }

    const summary = {
      totalRows: rawRows.length,
      validRows: validCount,
      duplicateDbRows: duplicateDbCount,
      duplicateCsvRows: duplicateCsvCount,
      invalidRows: invalidCount,
    };

    // If PREVIEW action, return analyzed rows without writing
    if (action === "preview") {
      return NextResponse.json({
        success: true,
        action: "preview",
        summary,
        rows: previewRows,
      });
    }

    // EXECUTE IMPORT ACTION: write valid rows safely
    const ts = new Date().toISOString();
    const batch = db.batch();
    const importedRows = [];
    const eligibleForInvite = [];

    for (const r of previewRows) {
      if (r.status !== "valid" && r.status !== "existing_user") continue;

      const memberRef = db.collection("association_members").doc(r.docId);
      const memberPayload = {
        associationId,
        associationName: assocData.name,
        associationCode: assocData.code,
        docId: r.docId,
        name: r.name,
        phone: r.normalizedPhone,
        role: r.role,
        city: r.city,
        // Status: "imported_pending" until user verifies; if user already exists, badge can be granted
        status: r.status === "existing_user" ? "verified" : "imported_pending",
        inviteSent: false,
        inviteSentAt: null,
        importedAt: ts,
        importedBy: auth.phone || auth.uid,
      };

      batch.set(memberRef, memberPayload, { merge: true });

      // If user exists, attach association badge to their crew profile
      if (r.status === "existing_user") {
        const crewRef = db.collection("crew").doc(r.docId);
        batch.set(
          crewRef,
          {
            associationMember: true,
            isAssociationVerified: true,
            associationName: assocData.name,
            associationCode: assocData.code,
            updatedAt: ts,
          },
          { merge: true }
        );
      }

      importedRows.push(r);
      eligibleForInvite.push(r);
    }

    await batch.commit();

    // Record audit log
    await db.collection("audit_logs").add({
      action: "association_csv_import",
      associationId,
      associationName: assocData.name,
      importedCount: importedRows.length,
      performedBy: auth.phone || auth.uid,
      timestamp: ts,
    });

    // Optionally dispatch WhatsApp invitations if enabled
    let invitesSentCount = 0;
    if (sendInvites) {
      for (const member of eligibleForInvite) {
        try {
          const inviteUrl = `${APP_URL()}/join/${assocData.code}?phone=${encodeURIComponent(member.normalizedPhone)}`;
          const inviteMsg = `👋 Hi ${member.name}!\n\n${assocData.name} has added you to their verified crew roster on CrewHive.\n\nClaim your verified association badge and complete your profile in 30 seconds here:\n👉 ${inviteUrl}`;
          await sendTextMessage(member.docId, inviteMsg);

          await db.collection("association_members").doc(member.docId).update({
            inviteSent: true,
            inviteSentAt: new Date().toISOString(),
          });
          invitesSentCount++;
        } catch (e) {
          console.error(`Failed to send WhatsApp invite to ${member.docId}:`, e.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      action: "execute",
      importedCount: importedRows.length,
      invitesSentCount,
      summary,
      message: `Successfully imported ${importedRows.length} members.`,
    });
  } catch (err) {
    console.error("[/api/admin/associations/import] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

