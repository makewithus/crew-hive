/**
 * DEV-ONLY: Reset a test user's WhatsApp conversation state + Firestore docs
 * so you can re-test the onboarding flow from scratch without manual cleanup.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/reset-user \
 *     -H "Content-Type: application/json" \
 *     -d '{"phone": "918265940243"}'
 *
 * What it deletes:
 *   - users/{phone}
 *   - crew/{phone}
 *   - employers/{phone}
 *   - All _webhook_dedup docs whose ID starts with phone digits or "fp_{phone}"
 */

import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import '../../../../lib/firebase-admin.js';

export async function POST(req) {
  // Safety gate — only runs outside production
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_RESET) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { phone } = await req.json();
  if (!phone) {
    return NextResponse.json({ error: 'phone is required (e.g. "918265940243")' }, { status: 400 });
  }

  const digits = phone.replace(/\D/g, '');
  const db = getFirestore();
  const deleted = [];

  // Delete main collections
  for (const col of ['users', 'crew', 'employers']) {
    const ref = db.collection(col).doc(digits);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      deleted.push(`${col}/${digits}`);
    }
  }

  // Delete all dedup docs for this user (msgId-based and fingerprint-based)
  const dedupSnap = await db.collection('_webhook_dedup').get();
  const batch = db.batch();
  let batchCount = 0;
  for (const doc of dedupSnap.docs) {
    if (doc.id.startsWith(digits) || doc.id.startsWith(`fp_${digits}`)) {
      batch.delete(doc.ref);
      deleted.push(`_webhook_dedup/${doc.id}`);
      batchCount++;
    }
  }
  if (batchCount > 0) await batch.commit();

  return NextResponse.json({
    ok: true,
    message: `Reset complete for ${digits}`,
    deleted,
  });
}
