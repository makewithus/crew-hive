/**
 * GET /api/admin/stats
 * Returns aggregate stats using admin SDK (bypasses Firestore security rules).
 * Only callable by authenticated super admin users.
 */

import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export const maxDuration = 30;

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = await adminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const isSuperAdmin =
      decoded.role === 'super_admin' ||
      decoded.phone === '+1234567890' ||
      (process.env.ADMIN_PHONES || '')
        .split(',')
        .map((p) => p.replace(/\D/g, '').trim())
        .includes(String(decoded.uid).replace(/\D/g, ''));

    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const db = adminDb();
    const [usersSnap, crewSnap, organizersSnap, bookingsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('crew').get(),
      db.collection('organizers').get(),
      db.collection('bookings').get(),
    ]);

    const users = usersSnap.docs.map((d) => d.data());
    const crew = crewSnap.docs.map((d) => d.data());

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: users.length,
        pendingApproval: users.filter((u) => u.approved === false).length,
        approvedUsers: users.filter((u) => u.approved === true).length,
        totalCrew: crew.length,
        approvedCrew: crew.filter((c) => c.status === 'approved').length,
        pendingCrew: crew.filter((c) => c.status === 'pending').length,
        organizers: organizersSnap.size,
        totalBookings: bookingsSnap.size,
      },
    });
  } catch (error) {
    console.error('[/api/admin/stats] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
