/**
 * MSG91 WhatsApp Webhook — CrewHive
 * GET  /api/whatsapp/webhook  — Verification handshake
 * POST /api/whatsapp/webhook  — Incoming message handler
 *
 * Processes synchronously: send reply first, then return 200.
 * Dedup is handled entirely inside conversation.js (lastMsgNorm + atomicStepTransition).
 */

import { NextResponse } from 'next/server';
import { handleMessage } from '@/lib/conversation';
import { sendConversationMessage } from '@/lib/whatsapp';
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
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // ── Ignore explicit status/event types ───────────────────────────────────
  const eventType = body?.event || payload?.event || body?.type || '';
  if (/sent|delivered|read|failed|status/i.test(eventType)) {
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
    if (iType === 'list_reply') {
      // MSG91 nests list selection under innerPayload.list_reply
      messageText =
        innerPayload?.list_reply?.id ||
        innerPayload?.list_reply?.title ||
        innerPayload?.id ||
        innerPayload?.title ||
        '';
    } else if (iType === 'button_reply') {
      // MSG91 nests button tap under innerPayload.button_reply
      messageText =
        innerPayload?.button_reply?.id ||
        innerPayload?.button_reply?.title ||
        innerPayload?.id ||
        innerPayload?.title ||
        '';
    } else {
      messageText = innerPayload?.id || innerPayload?.title || String(innerPayload || '');
    }
    logger.log('[Webhook] interactive iType:', iType, '| extracted messageText:', messageText, '| innerPayload:', JSON.stringify(innerPayload));
  }

  logger.log('[Webhook] from:', from, '| type:', msgType, '| text:', JSON.stringify(messageText));

  if (!messageText) {
    logger.warn('[Webhook] Empty messageText — ignoring');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // ── Process message and send reply ────────────────────────────────────────
  // Run synchronously so Vercel doesn't add after() scheduling overhead.
  // Dedup is handled in handleMessage (lastMsgNorm plain-get + atomicStepTransition).
  try {
    const result = await handleMessage({ userId: from, message: messageText });

    if (result === null) {
      // Duplicate — conversation.js already blocked it
      logger.log('[Webhook] Duplicate suppressed for:', from);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const messages = Array.isArray(result) ? result : [result];
    for (const msg of messages) {
      if (!msg?.text) continue;
      await sendConversationMessage(from, msg);
    }

    logger.log('[Webhook] Reply(s) sent to:', from, '| count:', messages.length);
  } catch (err) {
    logger.error('[Webhook] Processing error:', err);
    try {
      await sendConversationMessage(from, {
        type: 'text',
        text: 'Something went wrong. Please type Hi to restart.',
      });
    } catch (_) {}
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
