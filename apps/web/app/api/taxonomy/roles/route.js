/**
 * /api/taxonomy/roles
 * GET: Returns role taxonomy (parent roles + specialisations with EN/ML labels).
 * POST: Admin-only — updates role taxonomy or adds/edits a role.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { PARENT_ROLES } from "@/utils/taxonomy";
import { authenticateRequest } from "@/lib/server-auth";

export async function GET() {
  try {
    const db = adminDb();
    const docSnap = await db.collection("settings").doc("roles").get();

    if (docSnap.exists && Array.isArray(docSnap.data()?.roles)) {
      return NextResponse.json({
        success: true,
        data: docSnap.data().roles,
      });
    }

    // Default to initial PARENT_ROLES from taxonomy
    return NextResponse.json({
      success: true,
      data: PARENT_ROLES,
    });
  } catch (err) {
    console.error("[/api/taxonomy/roles] GET error:", err);
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
    const { roles, role } = body;
    const db = adminDb();
    const ts = new Date().toISOString();

    if (Array.isArray(roles)) {
      // Overwrite/update entire role list
      await db.collection("settings").doc("roles").set({
        roles,
        updatedAt: ts,
        updatedBy: auth.phone || auth.uid,
      });
      return NextResponse.json({ success: true, data: roles });
    }

    if (role && role.id) {
      // Add or update single role
      const currentSnap = await db.collection("settings").doc("roles").get();
      let currentRoles = currentSnap.exists && Array.isArray(currentSnap.data()?.roles)
        ? [...currentSnap.data().roles]
        : [...PARENT_ROLES];

      const existingIndex = currentRoles.findIndex((r) => r.id === role.id);
      if (existingIndex >= 0) {
        currentRoles[existingIndex] = { ...currentRoles[existingIndex], ...role };
      } else {
        currentRoles.push(role);
      }

      // Sort by sortOrder
      currentRoles.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

      await db.collection("settings").doc("roles").set({
        roles: currentRoles,
        updatedAt: ts,
        updatedBy: auth.phone || auth.uid,
      });

      return NextResponse.json({ success: true, data: currentRoles });
    }

    return NextResponse.json(
      { success: false, error: "Invalid role payload" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[/api/taxonomy/roles] POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

