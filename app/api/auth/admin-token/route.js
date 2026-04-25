/**
 * POST /api/auth/admin-token
 * Issues a Firebase custom token for the super admin — bypasses SMS OTP + reCAPTCHA.
 * Body: { phone: "+918265940243", pin: "xxxx" }
 * Returns: { token } — client calls signInWithCustomToken(auth, token)
 */

import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

const getAdminPhones = () => {
  const raw = process.env.ADMIN_PHONES || '';
  return raw.split(',').map((p) => p.trim()).filter(Boolean).map(phoneToDocId);
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    if (!phone || !pin) {
      return NextResponse.json({ error: 'Phone and PIN required' }, { status: 400 });
    }

    const id = phoneToDocId(phone);
    const adminIds = getAdminPhones();

    // Verify this is an admin phone
    if (!adminIds.includes(id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate PIN
    const correctPin = process.env.ADMIN_PIN || '';
    if (!correctPin || pin !== correctPin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Create / ensure the Firestore doc has super_admin role
    const ts = new Date().toISOString();
    const ref = adminDb().collection('users').doc(id);
    await ref.set(
      { phone: `+${id}`, role: 'super_admin', approved: true, updatedAt: ts },
      { merge: true }
    );

    // Issue a Firebase custom token (no reCAPTCHA, no SMS)
    const auth = adminAuth();
    const token = await auth.createCustomToken(`admin_${id}`, {
      role: 'super_admin',
      phone: `+${id}`,
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('[admin-token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
