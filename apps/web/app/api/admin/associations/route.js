/**
 * /api/admin/associations
 * Association Administration API
 *
 * Implements Prompt 3 Section 16:
 * - List associations with member counts and join codes
 * - Create new association with unique join code and join link
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest } from "@/lib/server-auth";

const APP_URL = () =>
  process.env.NEXT_PUBLIC_APP_URL || "https://crewhive.app";

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
    const snap = await db.collection("associations").orderBy("createdAt", "desc").get();
    const associations = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      // Count imported members and verified members
      const membersSnap = await db
        .collection("association_members")
        .where("associationId", "==", doc.id)
        .get();

      const totalImported = membersSnap.size;
      const verifiedMembers = membersSnap.docs.filter(
        (m) => m.data().status === "verified"
      ).length;

      associations.push({
        id: doc.id,
        ...data,
        joinUrl: `${APP_URL()}/join/${data.code || doc.id}`,
        totalImported,
        verifiedMembers,
      });
    }

    return NextResponse.json({
      success: true,
      data: associations,
    });
  } catch (err) {
    console.error("[/api/admin/associations] GET error:", err);
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
    const { name, code, contactPerson, contactPhone, description = "" } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: "Association name and unique code are required." },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const db = adminDb();
    const ts = new Date().toISOString();

    // Check code uniqueness
    const existing = await db
      .collection("associations")
      .where("code", "==", cleanCode)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { success: false, error: `Join code "${cleanCode}" is already in use.` },
        { status: 409 }
      );
    }

    const payload = {
      name: name.trim(),
      code: cleanCode,
      contactPerson: contactPerson || "",
      contactPhone: contactPhone || "",
      description: description.trim(),
      badgeLabel: `${name.trim()} Member`,
      createdBy: auth.phone || auth.uid,
      createdAt: ts,
      updatedAt: ts,
    };

    const ref = await db.collection("associations").add(payload);

    return NextResponse.json({
      success: true,
      id: ref.id,
      data: {
        id: ref.id,
        ...payload,
        joinUrl: `${APP_URL()}/join/${cleanCode}`,
      },
    });
  } catch (err) {
    console.error("[/api/admin/associations] POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

