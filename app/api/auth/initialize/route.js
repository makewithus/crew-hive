import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

const getAdminPhones = () => {
  const raw = process.env.ADMIN_PHONES || '';
  return raw.split(',').map((p) => p.trim()).filter(Boolean).map(phoneToDocId);
};

const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE
  ? phoneToDocId(process.env.SUPER_ADMIN_PHONE)
  : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, checkOnly = false } = body;
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

    const id = phoneToDocId(phone);
    const adminIds = getAdminPhones();
    const isSuperAdmin = SUPER_ADMIN_PHONE ? id === SUPER_ADMIN_PHONE : adminIds[0] === id;

    const db = adminDb();
    const userRef = db.collection('users').doc(id);
    const snap = await userRef.get();
    const exists = snap.exists;
    const userData = exists ? snap.data() : null;

    // Super-admin — always allowed
    if (isSuperAdmin) {
      if (!checkOnly) {
        const ts = new Date().toISOString();
        await userRef.set({ phone: `+${id}`, role: 'super_admin', approved: true, ...(exists ? { updatedAt: ts } : { createdAt: ts, updatedAt: ts }) }, { merge: true });
      }
      return NextResponse.json({ role: 'super_admin', approved: true, exists: true, isNew: !exists });
    }

    // checkOnly — just return what we know
    if (checkOnly) {
      if (!exists) return NextResponse.json({ role: null, approved: false, exists: false, isNew: true });
      const role = userData.role || null;
      const normalizedRole = role === 'employer' ? 'organizer' : role;
      return NextResponse.json({ role: normalizedRole, approved: userData.approved === true, exists: true, isNew: false });
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

    const role = userData.role || null;
    const normalizedRole = role === 'employer' ? 'organizer' : role;
    return NextResponse.json({
      role: normalizedRole,
      approved: userData.approved === true,
      exists: true,
      isNew: false,
    });

  } catch (error) {
    console.error('[auth/initialize] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
