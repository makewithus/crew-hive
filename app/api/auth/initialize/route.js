import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

// Build the full set of super-admin doc IDs from env vars
// Supports both SUPER_ADMIN_PHONE and ADMIN_PHONES (comma-separated)
const buildSuperAdminIds = () => {
  const ids = new Set();
  if (process.env.SUPER_ADMIN_PHONE) {
    ids.add(phoneToDocId(process.env.SUPER_ADMIN_PHONE));
  }
  if (process.env.ADMIN_PHONES) {
    process.env.ADMIN_PHONES.split(",").forEach((p) => {
      const d = phoneToDocId(p.trim());
      if (d) ids.add(d);
    });
  }
  if (process.env.NEXT_PUBLIC_ADMIN_PHONES) {
    process.env.NEXT_PUBLIC_ADMIN_PHONES.split(",").forEach((p) => {
      const d = phoneToDocId(p.trim());
      if (d) ids.add(d);
    });
  }
  return ids;
};

const SUPER_ADMIN_IDS = buildSuperAdminIds();

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, checkOnly = false } = body;
    if (!phone)
      return NextResponse.json({ error: "Phone required" }, { status: 400 });

    const id = phoneToDocId(phone);
    const db = adminDb();

    // ── Super admin: any number listed in SUPER_ADMIN_PHONE or ADMIN_PHONES ──
    if (SUPER_ADMIN_IDS.has(id)) {
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
    // Normalize role. Guard against corrupted super_admin for non-super-admin phones.
    let role = rawRole === "employer" ? "organizer" : rawRole;
    if (role === "super_admin" && !SUPER_ADMIN_IDS.has(id)) {
      // Corrupted — this number is not a super admin phone. Treat as no role.
      role = null;
    }

    const approved = role === "organizer" ? true : userData.approved === true;

    // Full init: fix any corruption in the users doc
    if (!checkOnly && rawRole === "super_admin" && !SUPER_ADMIN_IDS.has(id)) {
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
