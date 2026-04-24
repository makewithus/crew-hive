/**
 * MSG91 WhatsApp Webhook — CrewHive
 * GET  /api/whatsapp/webhook  — Verification handshake
 * POST /api/whatsapp/webhook  — Incoming message handler
 *
 * Uses Next.js `after()` to return 200 instantly and process in background.
 * Firestore dedup prevents MSG91 retries from sending duplicate messages.
 */

import { NextResponse, after } from 'next/server';
import { handleMessage } from '@/lib/conversation';
import { sendConversationMessage } from '@/lib/whatsapp';
import { adminDb } from '@/lib/firebase-admin';
import logger from '@/lib/logger';

export const maxDuration = 30;

// ─── GET: verification ────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ status: 'CrewHive WhatsApp Webhook active' });
}

// ─── POST: incoming message ───────────────────────────────────────────────────
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  logger.log('[Webhook] Received:', JSON.stringify(body));

  const payload = body?.payload;
  if (!payload) return NextResponse.json({ status: 'ok' }, { status: 200 });

  const from =
    payload?.source ||
    payload?.from ||
    body?.from ||
    payload?.sender ||
    payload?.mobile ||
    payload?.phone ||
    null;

  if (!from) {
    logger.warn('[Webhook] No sender found in payload');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // ── Ignore delivery receipts / status events (from = our own number) ──────
  const ownNumber = String(process.env.MSG91_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  if (ownNumber && String(from).replace(/\D/g, '') === ownNumber) {
    logger.log('[Webhook] Ignoring outbound status event from own number:', from);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // ── Also ignore explicit status/event types ───────────────────────────────
  const eventType = body?.event || payload?.event || body?.type || '';
  if (/sent|delivered|read|failed|status/i.test(eventType)) {
    logger.log('[Webhook] Ignoring status event type:', eventType);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // ── Extract message text ──────────────────────────────────────────────────
  const msgType = payload.type || 'text';
  const innerPayload = payload.payload;

  const extractText = (raw) => {
    if (!raw) return '';
    if (typeof raw === 'object') return String(raw.body || raw.text || raw.payload || '').trim();
    const str = String(raw).trim();
    try {
      const parsed = JSON.parse(str);
      return typeof parsed === 'object'
        ? String(parsed.text || parsed.body || parsed.payload || str).trim()
        : String(parsed).trim();
    } catch {
      return str;
    }
  };

  let messageText = '';
  if (msgType === 'text') {
    messageText =
      extractText(innerPayload?.text) ||
      extractText(innerPayload?.payload) ||
      extractText(innerPayload) ||
      extractText(payload?.text) ||
      '';
  } else if (msgType === 'interactive') {
    const iType = innerPayload?.type;
    messageText =
      (iType === 'button_reply' || iType === 'list_reply')
        ? (innerPayload?.id || innerPayload?.title || '')
        : (innerPayload?.id || String(innerPayload || ''));
  }

  logger.log('[Webhook] from:', from, '| type:', msgType, '| text:', JSON.stringify(messageText));

  if (!messageText) {
    logger.warn('[Webhook] Empty messageText — ignoring');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // ── Dedup: atomic check-and-set prevents MSG91 retry duplicates ──────────
  // MSG91 fires the webhook 2-3x for the same message. We use two layers:
  //   1. msgId (when available) — exact identity check
  //   2. Atomic content fingerprint (userId + text, 5-second bucket) — catches
  //      retries when no msgId is supplied (interactive button taps)
  const msgId =
    body?.message_id ||
    body?.id ||
    payload?.id ||
    payload?.msgId ||
    null;

  try {
    const db = adminDb();

    // Layer 1: msgId
    if (msgId) {
      const msgIdRef = db.collection('_webhook_dedup').doc(`id_${msgId}`);
      const snap = await msgIdRef.get();
      if (snap.exists) {
        logger.log('[Webhook] Dup msgId — skip:', msgId);
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }
      msgIdRef.set({ ts: Date.now(), from }).catch(() => {});
    }

    // Layer 2: content fingerprint (atomic transaction — only one retry wins)
    // MSG91 retries webhooks for up to ~60s; 90-second bucket covers all retries
    const bucket = Math.floor(Date.now() / 90000); // 90-second window
    const fpKey = `fp_${String(from).replace(/\D/g, '')}_${Buffer.from(messageText).toString('base64').slice(0, 40)}_${bucket}`;
    const fpRef = db.collection('_webhook_dedup').doc(fpKey);
    const isDup = await db.runTransaction(async (tx) => {
      const snap = await tx.get(fpRef);
      if (snap.exists) return true;
      tx.set(fpRef, { ts: Date.now(), from, text: messageText });
      return false;
    });
    if (isDup) {
      logger.log('[Webhook] Dup fingerprint — skip | from:', from, '| text:', messageText);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }
  } catch (e) {
    logger.warn('[Webhook] Dedup error (continuing):', e.message);
  }

  // ── Return 200 immediately — process runs after response is sent ──────────
  after(async () => {
    try {
      logger.log('[Webhook] after() processing | from:', from, '| msg:', messageText);
      let result = await handleMessage({ userId: from, message: messageText });

      // null = duplicate detected by atomicStepTransition — first call already sent the reply
      if (result === null) {
        logger.log('[Webhook] Duplicate step transition suppressed for:', from);
        return;
      }

      if (!result) {
        result = { type: 'text', text: 'Something went wrong. Please type Hi to restart.' };
      }

      // handleMessage may return an array [msg1, msg2] or a single message
      const messages = Array.isArray(result) ? result : [result];
      for (const msg of messages) {
        if (!msg?.text) continue;
        await sendConversationMessage(from, msg);
      }

      logger.log('[Webhook] Reply(s) sent to:', from, '| count:', messages.length);
    } catch (err) {
      logger.error('[Webhook] after() error:', err);
      try {
        await sendConversationMessage(from, {
          type: 'text',
          text: 'Something went wrong. Please type Hi to restart.',
        });
      } catch (_) {}
    }
  });

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
