/**
 * /api/db — Universal Firestore proxy via Admin SDK
 *
 * Bypasses client-side Firestore security rules entirely.
 * All operations are performed server-side with Admin credentials.
 *
 * Auth: Bearer <Firebase ID token>  (verified for write operations)
 *       Skipped for reads in dev / LOCAL_AUTH_BYPASS mode
 *
 * Body (POST):
 *   { op, collection, docId?, data?, filters?, merge? }
 *
 * Supported ops:
 *   get       — getDoc(collection/docId)
 *   set       — setDoc(collection/docId, data, { merge })
 *   update    — updateDoc(collection/docId, data)
 *   add       — addDoc(collection, data)  → returns { id }
 *   query     — getDocs with where clauses: filters=[{field,op,value}]
 *   multiWrite— writes: [{op:'set'|'update', collection, docId, data}]
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ISO = () => new Date().toISOString();

// Collections where ownership must be verified (docId == phone digits)
const OWNED_COLLECTIONS = new Set(["users", "crew", "employers", "organizers"]);

async function verifyToken(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

function isDevBypass() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.LOCAL_AUTH_BYPASS === "true"
  );
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { op, collection: col, docId, data, filters, merge, writes } = body;

    if (!op || !col) {
      return NextResponse.json({ error: "op and collection are required" }, { status: 400 });
    }

    const db = adminDb();
    const decoded = await verifyToken(req);

    // For write ops on owned collections, verify caller owns the doc
    const isWrite = ["set", "update", "add", "multiWrite"].includes(op);
    if (isWrite && !isDevBypass()) {
      if (!decoded) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Check ownership for single-doc writes on owned collections
      if (op !== "multiWrite" && docId && OWNED_COLLECTIONS.has(col)) {
        const adminPhones = (process.env.ADMIN_PHONES || "")
          .split(",")
          .map((p) => p.trim().replace(/\D/g, ""));
        const callerDigits = (decoded.phone_number || decoded.uid || "").replace(/\D/g, "");
        const isAdmin =
          decoded.role === "admin" ||
          decoded.role === "super_admin" ||
          adminPhones.includes(callerDigits);
        if (!isAdmin && callerDigits !== docId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // ── GET ──────────────────────────────────────────────────────────────────
    if (op === "get") {
      const snap = await db.collection(col).doc(docId).get();
      if (!snap.exists) return NextResponse.json({ exists: false });
      return NextResponse.json({ exists: true, data: { id: snap.id, ...snap.data() } });
    }

    // ── SET ──────────────────────────────────────────────────────────────────
    if (op === "set") {
      const payload = { ...data, updatedAt: ISO() };
      if (merge) {
        await db.collection(col).doc(docId).set(payload, { merge: true });
      } else {
        if (!data.createdAt) payload.createdAt = ISO();
        await db.collection(col).doc(docId).set(payload);
      }
      return NextResponse.json({ success: true });
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────
    if (op === "update") {
      await db.collection(col).doc(docId).update({ ...data, updatedAt: ISO() });
      return NextResponse.json({ success: true });
    }

    // ── ADD (auto-ID) ─────────────────────────────────────────────────────────
    if (op === "add") {
      const ref = await db.collection(col).add({ ...data, createdAt: ISO() });
      return NextResponse.json({ success: true, id: ref.id });
    }

    // ── QUERY ─────────────────────────────────────────────────────────────────
    if (op === "query") {
      let q = db.collection(col);
      if (Array.isArray(filters)) {
        for (const f of filters) {
          q = q.where(f.field, f.op, f.value);
        }
      }
      const snap = await q.get();
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ success: true, data: docs });
    }

    // ── MULTI-WRITE (batch) ───────────────────────────────────────────────────
    if (op === "multiWrite") {
      const batch = db.batch();
      for (const w of writes) {
        const ref = db.collection(w.collection).doc(w.docId);
        const payload = { ...w.data, updatedAt: ISO() };
        if (w.op === "set") {
          batch.set(ref, payload, { merge: w.merge ?? true });
        } else {
          batch.update(ref, payload);
        }
      }
      await batch.commit();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
  } catch (err) {
    console.error("[/api/db]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
