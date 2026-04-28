import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

// The ONLY super admin is defined by this env var.
// Any role stored in Firestore claiming super_admin for another number is treated as corruption.
const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_PHONE
  ? phoneToDocId(process.env.SUPER_ADMIN_PHONE)
  : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, checkOnly = false } = body;
    if (!phone)
      return NextResponse.json({ error: "Phone required" }, { status: 400 });

    const id = phoneToDocId(phone);
    const db = adminDb();

    // ── Super admin: ONLY if phone matches SUPER_ADMIN_PHONE env var ──────────
    if (SUPER_ADMIN_ID && id === SUPER_ADMIN_ID) {
      if (!checkOnly) {
        const ts = new Date().toISOString();
        await db
          .collection("users")
          .doc(id)
          .set(
            {
              phone: `+${id}`,
              role: "super_admin",
              approved: true,
              updatedAt: ts,
            },
            { merge: true },
          );
      }
      return NextResponse.json({
        role: "super_admin",
        approved: true,
        exists: true,
        isNew: false,
      });
    }

    // ── For everyone else: determine role from organizers → users collections ─
    // Check organizers collection first (WhatsApp bot creates docs here)
    const orgSnap = await db.collection("organizers").doc(id).get();
    if (orgSnap.exists) {
      // This is an organizer. Organizers are ALWAYS auto-approved per CTO spec.
      // Auto-fix users doc to have the correct role (heals corrupted data)
      if (!checkOnly) {
        await db
          .collection("users")
          .doc(id)
          .set(
            {
              phone: `+${id}`,
              role: "organizer",
              approved: true,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
      }
      return NextResponse.json({
        role: "organizer",
        approved: true,
        exists: true,
        isNew: false,
      });
    }

    // Not an organizer — check users collection for crew/other roles
    const userRef = db.collection("users").doc(id);
    const userSnap = await userRef.get();
    const exists = userSnap.exists;
    const userData = exists ? userSnap.data() : null;

    if (!exists) {
      return NextResponse.json({
        role: null,
        approved: false,
        exists: false,
        isNew: true,
      });
    }

    const rawRole = userData.role ?? null;
    // Normalize role. Also guard against corrupted super_admin for non-super-admin phones.
    let role = rawRole === "employer" ? "organizer" : rawRole;
    if (role === "super_admin") {
      // Corrupted — this number is not the super admin phone. Treat as no role.
      role = null;
    }

    const approved = role === "organizer" ? true : userData.approved === true;

    // Full init: fix any corruption in the users doc
    if (!checkOnly && rawRole === "super_admin") {
      await userRef.set(
        { role: null, approved: false, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    }

    return NextResponse.json({ role, approved, exists: true, isNew: false });
  } catch (error) {
    console.error("[auth/initialize] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
