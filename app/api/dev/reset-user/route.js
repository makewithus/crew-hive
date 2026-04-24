/**
 * DEV ONLY — Reset a test user's WhatsApp conversation state + Firestore docs.
 * Wipes: users/{phone}, crew/{phone}, employers/{phone}, all _webhook_dedup docs for that number.
 *
 * Usage:
 *   curl -X POST https://crew-hive.vercel.app/api/dev/reset-user \
 *     -H "Content-Type: application/json" \
 *     -d '{"phone": "918265940243"}'
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'phone is required e.g. "918265940243"' }, { status: 400 });
    }

    const digits = String(phone).replace(/\D/g, '');
    const db = adminDb();
    const deleted = [];

    // Delete main user docs
    for (const col of ['users', 'crew', 'employers']) {
      try {
        const ref = db.collection(col).doc(digits);
        const snap = await ref.get();
        if (snap.exists) {
          await ref.delete();
          deleted.push(`${col}/${digits}`);
        }
      } catch (e) {
        deleted.push(`${col}/${digits} ERROR: ${e.message}`);
      }
    }

    // Delete all dedup docs that contain the user's digits
    try {
      const dedupSnap = await db.collection('_webhook_dedup').get();
      const batch = db.batch();
      let count = 0;
      for (const doc of dedupSnap.docs) {
        if (doc.id.includes(digits)) {
          batch.delete(doc.ref);
          deleted.push(`_webhook_dedup/${doc.id}`);
          count++;
        }
      }
      if (count > 0) await batch.commit();
    } catch (e) {
      deleted.push(`_webhook_dedup ERROR: ${e.message}`);
    }

    return NextResponse.json({ ok: true, message: `Reset complete for ${digits}`, deleted });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
