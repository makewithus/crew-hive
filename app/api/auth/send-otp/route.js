/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP, stores it in Firestore with 10-min expiry,
 * and sends it to the user via MSG91 SMS.
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendTextMessage } from '@/lib/whatsapp';

const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

/**
 * Try SMS first via MSG91 transactional route.
 * Returns true if sent, false if failed (so caller can fallback to WhatsApp).
 */
async function trySmsOtp(mobileWithCountryCode, otp) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || 'CRWHIV';
  if (!authKey) return false;

  const mobile = mobileWithCountryCode.replace(/\D/g, '');
  const message = encodeURIComponent(
    `${otp} is your CrewHive verification code. Valid for 10 minutes. Do not share this with anyone. - CrewHive`,
  );

  const url =
    `https://api.msg91.com/api/sendhttp.php` +
    `?authkey=${encodeURIComponent(authKey)}` +
    `&mobiles=${mobile}` +
    `&message=${message}` +
    `&sender=${senderId}` +
    `&route=4` +
    `&country=0`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('[send-otp] MSG91 SMS response:', text);
    if (!res.ok || text.toLowerCase().startsWith('error')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fallback: send OTP via WhatsApp message.
 */
async function sendWhatsAppOtp(phone, otp) {
  const fullPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
  await sendTextMessage(
    fullPhone,
    `🔐 *CrewHive Verification Code*\n\nYour OTP is: *${otp}*\n\nValid for 10 minutes. Do not share this with anyone.`,
  );
}

export async function POST(request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const id = phoneToDocId(phone);

    // Rate-limit: max 1 OTP per 30 seconds
    const db = adminDb();
    const otpRef = db.collection('otpCodes').doc(id);
    const existing = await otpRef.get();
    if (existing.exists) {
      const { createdAt } = existing.data();
      const elapsed = Date.now() - createdAt;
      if (elapsed < 30_000) {
        const wait = Math.ceil((30_000 - elapsed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${wait}s before requesting another OTP.` },
          { status: 429 },
        );
      }
    }

    // For super-admin test phone, skip SMS and use fixed dev OTP
    const superAdminPhone = process.env.SUPER_ADMIN_PHONE
      ? process.env.SUPER_ADMIN_PHONE.replace(/\D/g, '')
      : null;
    const isDevPhone = superAdminPhone && id === superAdminPhone;
    const otp = isDevPhone ? '123456' : String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store securely server-side
    await otpRef.set({ otp, expiresAt, createdAt: Date.now() });

    if (!isDevPhone) {
      const fullPhone = phone.startsWith('+') ? phone : `+${id}`;
      // Try SMS first; fall back to WhatsApp if SMS is blocked (DLT not registered)
      const smsSent = await trySmsOtp(fullPhone, otp);
      if (!smsSent) {
        console.warn('[send-otp] SMS failed or DLT blocked — falling back to WhatsApp');
        await sendWhatsAppOtp(fullPhone, otp);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[send-otp] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
