/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP and returns a Firebase custom token + role.
 */

import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE
  ? phoneToDocId(process.env.SUPER_ADMIN_PHONE)
  : null;

export async function POST(request) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json({ error: 'phone and code required' }, { status: 400 });
    }

    const id = phoneToDocId(phone);
    const db = adminDb();

    // Super-admin shortcut (hardcoded test OTP still works for admin)
    const isSuperAdmin = SUPER_ADMIN_PHONE ? id === SUPER_ADMIN_PHONE : false;
    if (isSuperAdmin && String(code).trim() === '123456') {
      const customToken = await adminAuth().createCustomToken(id, {
        role: 'super_admin',
        approved: true,
        phone: `+${id}`,
      });
      return NextResponse.json({ success: true, customToken, role: 'super_admin', approved: true });
    }

    // Verify OTP from Firestore
    const otpRef = db.collection('otpCodes').doc(id);
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return NextResponse.json({ error: 'OTP expired or not found. Please request a new one.' }, { status: 401 });
    }

    const { otp, expiresAt } = otpSnap.data();

    if (Date.now() > expiresAt) {
      await otpRef.delete();
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 401 });
    }

    if (String(code).trim() !== String(otp)) {
      return NextResponse.json({ error: 'Incorrect OTP. Please check and try again.' }, { status: 401 });
    }

    // OTP correct — consume it
    await otpRef.delete();

    // Get user role
    const userSnap = await db.collection('users').doc(id).get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const rawRole = userData.role ?? null;
    const role = rawRole === 'employer' ? 'organizer' : rawRole;
    const approved = userData.approved ?? false;

    const additionalClaims = {};
    if (role) additionalClaims.role = role;
    if (approved) additionalClaims.approved = true;
    additionalClaims.phone = `+${id}`;

    const customToken = await adminAuth().createCustomToken(id, additionalClaims);
    return NextResponse.json({ success: true, customToken, role, approved });
  } catch (err) {
    console.error('[verify-otp] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
