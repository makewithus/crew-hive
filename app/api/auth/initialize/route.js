/**
 * POST /api/auth/initialize
 * Called after Firebase OTP verification to determine role + admin status.
 * Body: { phone: "+919876543210" }
 * Returns: { role, approved, exists, isNew }
 */

import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

// Admin phones from server-side env var (never exposed to client)
const getAdminPhones = () => {
  const raw = process.env.ADMIN_PHONES || '';
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map(phoneToDocId);
};

export async function POST(request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const id = phoneToDocId(phone);
    const adminIds = getAdminPhones();
    const isAdmin = adminIds.includes(id);

    const userRef = doc(db, 'users', id);
    const snap = await getDoc(userRef);
    const exists = snap.exists();

    if (isAdmin) {
      // Ensure admin user doc exists and is up to date
      const ts = new Date().toISOString();
      await setDoc(
        userRef,
        {
          phone: `+${id}`,
          role: 'admin',
          approved: true,
          ...(exists ? { updatedAt: ts } : { createdAt: ts, updatedAt: ts }),
        },
        { merge: true }
      );
      return NextResponse.json({ role: 'admin', approved: true, exists: true, isNew: !exists });
    }

    if (!exists) {
      // Brand-new user — their WhatsApp onboarding may not be done yet
      // Create a stub user doc so we can track them
      await setDoc(userRef, {
        phone: `+${id}`,
        role: null,
        approved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ role: null, approved: false, exists: false, isNew: true });
    }

    const userData = snap.data();
    return NextResponse.json({
      role: userData.role || null,
      approved: userData.approved === true,
      exists: true,
      isNew: false,
    });

  } catch (error) {
    console.error('[auth/initialize] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
