import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

// Only use the explicit SUPER_ADMIN_PHONE env var for hardcoded super-admin.
// ADMIN_PHONES is for notifications only, NOT role assignment.
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE
  ? phoneToDocId(process.env.SUPER_ADMIN_PHONE)
  : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, checkOnly = false } = body;
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

    const id = phoneToDocId(phone);
    const db = adminDb();
    const userRef = db.collection('users').doc(id);
    const snap = await userRef.get();
    const exists = snap.exists;
    const userData = exists ? snap.data() : null;

    const firestoreRole = userData?.role || null;
    const normalizeRole = (r) => (r === 'employer' ? 'organizer' : r);

    // Treat as super-admin only if Firestore says so OR SUPER_ADMIN_PHONE explicitly matches
    const isSuperAdmin =
      firestoreRole === 'super_admin' ||
      (SUPER_ADMIN_PHONE !== null && id === SUPER_ADMIN_PHONE);

    if (isSuperAdmin) {
      if (!checkOnly) {
        const ts = new Date().toISOString();
        await userRef.set(
          { phone: `+${id}`, role: 'super_admin', approved: true, ...(exists ? { updatedAt: ts } : { createdAt: ts, updatedAt: ts }) },
          { merge: true },
        );
      }
      return NextResponse.json({ role: 'super_admin', approved: true, exists: true, isNew: !exists });
    }

    // checkOnly — just return what we know
    if (checkOnly) {
      if (!exists) return NextResponse.json({ role: null, approved: false, exists: false, isNew: true });
      return NextResponse.json({
        role: normalizeRole(firestoreRole),
        approved: userData.approved === true,
        exists: true,
        isNew: false,
      });
    }

    // Full initialize (called after OTP success)
    if (!exists) {
      await userRef.set({
        phone: `+${id}`,
        role: null,
        approved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ role: null, approved: false, exists: false, isNew: true });
    }

    return NextResponse.json({
      role: normalizeRole(firestoreRole),
      approved: userData.approved === true,
      exists: true,
      isNew: false,
    });

  } catch (error) {
    console.error('[auth/initialize] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
