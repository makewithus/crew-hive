/**
 * MSG91 WhatsApp Webhook — CrewHive
 * GET  /api/whatsapp/webhook  — Verification handshake
 * POST /api/whatsapp/webhook  — Incoming message handler
 *
 * IMPORTANT: Returns 200 IMMEDIATELY to prevent MSG91 retries (which cause
 * duplicate messages). All processing happens in the background.
 */

import { NextResponse } from 'next/server';
import { handleMessage } from '@/lib/conversation';
import { sendConversationMessage } from '@/lib/whatsapp';
import { adminDb } from '@/lib/firebase-admin';
import logger from '@/lib/logger';

// Keep function alive for background processing after 200 is sent
export const maxDuration = 30;

// GET: MSG91 verification
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  logger.log('[Webhook] GET verify hit | challenge:', challenge);
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: 'CrewHive WhatsApp Webhook active' });
}

// ─── Background processor ─────────────────────────────────────────────────────
async function processMessage(from, messageText) {
  try {
    logger.log('[Webhook] Processing | from:', from, '| message:', messageText);

    let result = await handleMessage({ userId: from, message: messageText });

    if (!result || !result.text) {
      logger.warn('[Webhook] Conversation result missing text - using fallback');
      result = { type: 'text', text: 'Something went wrong. Please try again.' };
    }

    await sendConversationMessage(from, result);
    logger.log('[Webhook] Reply sent to:', from);
  } catch (error) {
    logger.error('[Webhook] processMessage error:', error);
    try {
      await sendConversationMessage(from, { type: 'text', text: 'Something went wrong. Please try again.' });
    } catch (_) {}
  }
}

// POST: Incoming message — return 200 immediately, process in background
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (parseErr) {
    logger.error('[Webhook] Failed to parse JSON body:', parseErr.message);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  logger.log('[Webhook] Payload:', JSON.stringify(body));

  const payload = body?.payload;
  if (!payload) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const from =
    payload?.source ||
    payload?.from ||
    body?.from ||
    payload?.sender ||
    payload?.data?.from ||
    payload?.mobile ||
    payload?.phone ||
    null;

  if (!from) {
    logger.warn('[Webhook] No "from" found - ignoring');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // ── Extract message text ──────────────────────────────────────────────────
  const msgType = payload.type || 'text';
  const innerPayload = payload.payload;

  const extractText = (raw) => {
    if (!raw) return '';
    if (typeof raw === 'object') return raw.text || raw.body || raw.payload || '';
    const str = String(raw).trim();
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === 'object') return parsed.text || parsed.body || parsed.payload || str;
      return String(parsed);
    } catch (_) {
      return str;
    }
  };

  let messageText = '';
  if (msgType === 'text') {
    messageText =
      extractText(innerPayload?.text) ||
      extractText(innerPayload?.payload) ||
      extractText(innerPayload) ||
      extractText(payload?.text) ||   // some MSG91 payloads put text directly here
      '';
  } else if (msgType === 'interactive') {
    const interactiveType = innerPayload?.type;
    if (interactiveType === 'button_reply') {
      messageText = innerPayload?.id || innerPayload?.title || '';
    } else if (interactiveType === 'list_reply') {
      messageText = innerPayload?.id || innerPayload?.title || '';
    } else {
      messageText = innerPayload?.id || String(innerPayload || '');
    }
  }

  // Last-resort: if still empty, try the raw payload as a string
  if (!messageText && typeof innerPayload === 'string') {
    messageText = innerPayload.trim();
  }

  logger.log('[Webhook] Extracted messageText:', JSON.stringify(messageText), '| type:', msgType);

  if (!messageText) {
    logger.log('[Webhook] Empty messageText - skipping');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // ── Deduplication: msgId only ────────────────────────────────────────────
  // Only deduplicate when MSG91 provides an explicit message ID.
  // Content-fingerprint dedup was blocking legitimate re-sends (e.g. "hi")
  // so it has been removed.
  const msgId =
    body?.message_id ||
    body?.id ||
    payload?.id ||
    payload?.msgId ||
    null;

  if (msgId) {
    try {
      const dedupRef = adminDb().collection('_webhook_dedup').doc(`id_${msgId}`);
      const snap = await dedupRef.get();
      if (snap.exists) {
        logger.log('[Webhook] Duplicate msgId, skipping:', msgId);
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }
      dedupRef.set({ processedAt: Date.now(), from }).catch(() => {});
    } catch (dedupErr) {
      logger.warn('[Webhook] Dedup check failed (continuing anyway):', dedupErr.message);
    }
  }

  // ── Return 200 IMMEDIATELY, process in background ─────────────────────────
  // This prevents MSG91 from retrying the webhook (which causes duplicate messages)
  processMessage(from, messageText);

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
