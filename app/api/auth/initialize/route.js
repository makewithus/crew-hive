/**
 * POST /api/auth/initialize
 * Called after Firebase OTP verification to determine role + admin status.
 * Body: { phone: "+919876543210", checkOnly?: boolean }
 *   checkOnly=true  → just check if user exists + role, do NOT create stub
 * Returns: { role, approved, exists, isNew }
 */

import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const isAdmin = !isSuperAdmin && adminIds.includes(id);

    const userRef = doc(db, 'users', id);
    const snap = await getDoc(userRef);
    const exists = snap.exists();
    const userData = exists ? snap.data() : null;

    // Super-admin
    if (isSuperAdmin) {
      if (!checkOnly) {
        const ts = new Date().toISOString();
        await setDoc(userRef, { phone: `+${id}`, role: 'super_admin', approved: true, ...(exists ? { updatedAt: ts } : { createdAt: ts, updatedAt: ts }) }, { merge: true });
      }
      return NextResponse.json({ role: 'super_admin', approved: true, exists: true, isNew: !exists });
    }

    // Admin
    if (isAdmin) {
      if (!checkOnly) {
        const ts = new Date().toISOString();
        await setDoc(userRef, { phone: `+${id}`, role: 'admin', approved: true, ...(exists ? { updatedAt: ts } : { createdAt: ts, updatedAt: ts }) }, { merge: true });
      }
      return NextResponse.json({ role: 'admin', approved: true, exists: true, isNew: !exists });
    }

    // checkOnly — just return what we know without creating anything
    if (checkOnly) {
      if (!exists) return NextResponse.json({ role: null, approved: false, exists: false, isNew: true });
      const role = userData.role || null;
      // Normalize employer -> organizer
      const normalizedRole = role === 'employer' ? 'organizer' : role;
      return NextResponse.json({ role: normalizedRole, approved: userData.approved === true, exists: true, isNew: false });
    }

    // Full initialize flow (called after OTP success)
    if (!exists) {
      await setDoc(userRef, {
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
