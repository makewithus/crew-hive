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

  // ── Dedup: 3-second bucket per sender + content ───────────────────────────
  const bucket = Math.floor(Date.now() / 3000);
  const dedupKey = `${String(from).replace(/\D/g, '')}_${messageText}_${bucket}`;
  try {
    const dedupRef = adminDb().collection('_webhook_dedup').doc(dedupKey);
    const snap = await dedupRef.get();
    if (snap.exists) {
      logger.log('[Webhook] Duplicate — skipping:', dedupKey);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }
    dedupRef.set({ ts: Date.now(), from }).catch(() => {});
  } catch (e) {
    logger.warn('[Webhook] Dedup error (non-critical):', e.message);
  }

  // ── Return 200 immediately — process runs after response is sent ──────────
  after(async () => {
    try {
      logger.log('[Webhook] after() processing | from:', from, '| msg:', messageText);
      let result = await handleMessage({ userId: from, message: messageText });

      if (!result || !result.text) {
        result = { type: 'text', text: 'Something went wrong. Please type Hi to restart.' };
      }

      await sendConversationMessage(from, result);
      logger.log('[Webhook] Reply sent to:', from);
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
