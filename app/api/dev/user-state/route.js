import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  const digits = String(phone).replace(/\D/g, '');
  const snap = await adminDb().collection('users').doc(digits).get();
  return NextResponse.json({ exists: snap.exists, data: snap.exists ? snap.data() : null });
}
