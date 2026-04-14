/**
 * MSG91 WhatsApp Webhook — CrewHive
 * GET  /api/whatsapp/webhook  — Verification handshake
 * POST /api/whatsapp/webhook  — Incoming message handler
 */

import { NextResponse } from 'next/server';
import { handleMessage } from '@/lib/conversation';
import { sendConversationMessage } from '@/lib/whatsapp';
import logger from '@/lib/logger';

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

// POST: Incoming message
export async function POST(request) {
  logger.log('WEBHOOK HIT');

  let body;
  try {
    body = await request.json();
  } catch (parseErr) {
    logger.error('[Webhook] Failed to parse JSON body:', parseErr.message);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  logger.log('Incoming payload:', JSON.stringify(body, null, 2));

  try {
    const payload = body?.payload;
    if (!payload) {
      logger.warn('[Webhook] No payload in body - ignoring');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // MSG91 sends sender phone in payload.source
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
      logger.warn('[Webhook] No "from" found anywhere in payload - ignoring. Full body:', JSON.stringify(body));
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    logger.log('[Webhook] Message from:', from, '| type:', payload.type);

    let messageText = '';
    const msgType = payload.type;
    const innerPayload = payload.payload;

    // Helper: MSG91 sometimes double-encodes text as a JSON string e.g. '{"text":"Hi"}'
    const extractText = (raw) => {
      if (!raw) return '';
      if (typeof raw === 'object') return raw.body || raw.text || raw.payload || '';
      const str = String(raw);
      try {
        const parsed = JSON.parse(str);
        if (typeof parsed === 'object') return parsed.text || parsed.body || parsed.payload || str;
        return String(parsed);
      } catch (_) {
        return str;
      }
    };

    if (msgType === 'text') {
      messageText = extractText(innerPayload?.text) || extractText(innerPayload?.payload) || extractText(innerPayload) || '';
    } else if (msgType === 'interactive') {
      const interactiveType = innerPayload?.type;
      if (interactiveType === 'button_reply') {
        messageText = innerPayload?.id || innerPayload?.title || '';
      } else if (interactiveType === 'list_reply') {
        messageText = innerPayload?.id || innerPayload?.title || '';
      } else {
        messageText = innerPayload?.id || String(innerPayload || '');
      }
    } else {
      logger.log('[Webhook] Unsupported message type:', msgType, '- sending fallback');
    }

    logger.log('[Webhook] Extracted messageText:', JSON.stringify(messageText));

    if (!messageText) {
      logger.log('[Webhook] Empty messageText - sending re-prompt to', from);
      await sendConversationMessage(from, {
        type: 'text',
        text: "Sorry, I didn't understand that. Type Hi to get started!",
      });
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    logger.log('[Webhook] Routing to conversation engine | userId:', from);
    let result = await handleMessage({ userId: from, message: messageText });

    logger.log('Conversation result:', JSON.stringify(result, null, 2));

    if (!result || !result.text) {
      logger.warn('[Webhook] Conversation result missing text - using fallback');
      result = { type: 'text', text: 'Something went wrong. Please try again.' };
    }

    await sendConversationMessage(from, result);
    logger.log('Reply sent to:', from);

    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    logger.error('[Webhook] Unhandled error:', error);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}
