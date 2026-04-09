/**
 * MSG91 WhatsApp Webhook — CrewHive
 * GET  /api/whatsapp/webhook  — Verification handshake
 * POST /api/whatsapp/webhook  — Incoming message handler
 */

import { NextResponse } from 'next/server';
import { handleMessage } from '@/lib/conversation';
import { sendConversationMessage } from '@/lib/whatsapp';

// ─── GET: MSG91 verification ──────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: 'CrewHive WhatsApp Webhook active' });
}

// ─── POST: Incoming message ───────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();

    // MSG91 webhook payload structure:
    // { payload: { from: "919...", type: "text"|"interactive", payload: { ... } } }
    const payload = body?.payload;
    if (!payload) {
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const from = payload.from; // e.g. "919876543210"
    if (!from) {
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Extract message text from different types
    let messageText = '';
    const msgType = payload.type;
    const innerPayload = payload.payload;

    if (msgType === 'text') {
      messageText = innerPayload?.text || innerPayload?.payload || '';
    } else if (msgType === 'interactive') {
      // Button reply or list reply — use the id as the message
      const interactiveType = innerPayload?.type;
      if (interactiveType === 'button_reply') {
        messageText = innerPayload?.id || innerPayload?.title || '';
      } else if (interactiveType === 'list_reply') {
        messageText = innerPayload?.id || innerPayload?.title || '';
      } else {
        messageText = innerPayload?.id || String(innerPayload || '');
      }
    } else {
      // Unsupported type — re-prompt
      messageText = '';
    }

    if (!messageText) {
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Process through conversation engine
    const result = await handleMessage({ userId: from, message: messageText });

    // Send the response back via MSG91
    await sendConversationMessage(from, result);

    // Always return 200 to prevent MSG91 retries
    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    // Return 200 even on error — prevents infinite MSG91 retries
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}
