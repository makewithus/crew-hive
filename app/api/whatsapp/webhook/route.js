/**
 * MSG91 WhatsApp Webhook — CrewHive
 * GET  /api/whatsapp/webhook  — Verification handshake
 * POST /api/whatsapp/webhook  — Incoming message handler
 *
 * Returns 200 to MSG91 IMMEDIATELY via waitUntil() from @vercel/functions.
 * This works on ALL Vercel plans (Hobby included) and prevents MSG91 from
 * timing out + retrying, which previously caused dedup to block the welcome message.
 */

import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { handleMessage } from "@/lib/conversation";
import { sendConversationMessage } from "@/lib/whatsapp";
import logger from "@/lib/logger";

export const maxDuration = 60;

// ─── GET: verification ────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("hub.challenge");
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ status: "CrewHive WhatsApp Webhook active" });
}

// ─── POST: incoming message ───────────────────────────────────────────────────
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  logger.log("[Webhook] Received:", JSON.stringify(body));

  const payload = body?.payload;
  if (!payload) return NextResponse.json({ status: "ok" }, { status: 200 });

  const from =
    payload?.source ||
    payload?.from ||
    body?.from ||
    payload?.sender ||
    payload?.mobile ||
    payload?.phone ||
    null;

  if (!from) {
    logger.warn("[Webhook] No sender found in payload");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  // ── Ignore delivery receipts / status events (from = our own number) ──────
  const ownNumber = String(process.env.MSG91_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (ownNumber && String(from).replace(/\D/g, "") === ownNumber) {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  // ── Ignore explicit status/event types ───────────────────────────────────
  const eventType = body?.event || payload?.event || body?.type || "";
  if (/sent|delivered|read|failed|status/i.test(eventType)) {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  // ── Extract message text ──────────────────────────────────────────────────
  const msgType = payload.type || "text";
  let innerPayload = payload.payload;
  if (typeof innerPayload === "string") {
    try { innerPayload = JSON.parse(innerPayload); } catch (_) {}
  }

  logger.log("[Webhook] RAW:", JSON.stringify({ msgType, from, innerPayload }));

  const extractSelectionId = (obj) => {
    if (!obj || typeof obj !== "object") return "";
    const nested = obj.list_reply || obj.button_reply;
    if (nested?.id) return String(nested.id).trim();
    if (nested?.title) return String(nested.title).trim();
    if (obj.id) return String(obj.id).trim();
    if (obj.title) return String(obj.title).trim();
    if (obj.list?.id) return String(obj.list.id).trim();
    if (obj.button?.id) return String(obj.button.id).trim();
    return "";
  };

  const extractPlainText = (raw) => {
    if (!raw) return "";
    if (typeof raw === "object") {
      const sel = extractSelectionId(raw);
      if (sel) return sel;
      return String(raw.body || raw.text || raw.message || "").trim();
    }
    const str = String(raw).trim();
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === "object") {
        const sel = extractSelectionId(parsed);
        if (sel) return sel;
        return String(parsed.text || parsed.body || parsed.message || "").trim();
      }
      return String(parsed).trim();
    } catch {
      return str;
    }
  };

  let messageText = "";
  if (msgType === "interactive") {
    messageText = extractSelectionId(innerPayload);
    logger.log("[Webhook] interactive extracted:", messageText);
  }
  if (!messageText) {
    messageText =
      extractPlainText(innerPayload?.text) ||
      extractPlainText(innerPayload?.payload) ||
      extractPlainText(innerPayload) ||
      extractPlainText(payload?.text) ||
      extractPlainText(payload?.message) ||
      "";
  }

  logger.log("[Webhook] from:", from, "| type:", msgType, "| text:", JSON.stringify(messageText));

  if (!messageText) {
    logger.warn("[Webhook] Empty messageText — ignoring");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  // Capture for use inside after() closure
  const capturedFrom = from;
  const capturedText = messageText;
  const capturedBody = body;
  const capturedPayload = payload;

  // ── Return 200 to MSG91 IMMEDIATELY, then process in background ───────────
  // waitUntil() from @vercel/functions is supported on ALL Vercel plans.
  // after() from next/server was silently dropped on Hobby plan — that's why
  // welcome messages were never received.
  waitUntil((async () => {
    try {
      const { adminDb } = await import("@/lib/firebase-admin");

      // ── Message-ID dedup (suppress MSG91 webhook retries) ───────────────
      const msgId =
        capturedPayload?.id ||
        capturedPayload?.messageId ||
        capturedPayload?.message_id ||
        capturedBody?.id ||
        capturedBody?.messageId ||
        null;
      if (msgId) {
        const dedupRef = adminDb()
          .collection("dedup")
          .doc(`msg_${String(msgId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100)}`);
        try {
          await dedupRef.create({ ts: Date.now(), from: capturedFrom, msgId });
        } catch (err) {
          const code = err?.code ?? 0;
          const errMsg = err?.message ?? "";
          if (code === 6 || errMsg.includes("ALREADY_EXISTS") || errMsg.includes("already exists")) {
            logger.warn("[Webhook] MsgID dedup HIT — retry suppressed | msgId:", msgId, "| from:", capturedFrom);
            return;
          }
        }
      }

      // ── Process and send reply ────────────────────────────────────────────
      const result = await handleMessage({ userId: capturedFrom, message: capturedText });
      if (result === null) {
        logger.log("[Webhook] Duplicate suppressed for:", capturedFrom);
        return;
      }
      const messages = Array.isArray(result) ? result : [result];
      // Send all messages in PARALLEL — saves ~300-500ms per extra message
      await Promise.all(
        messages.filter(msg => msg?.text).map(msg => sendConversationMessage(capturedFrom, msg))
      );
      logger.log("[Webhook] Reply(s) sent to:", capturedFrom, "| count:", messages.length);
    } catch (err) {
      logger.error("[Webhook] Background processing error:", err);
      try {
        await sendConversationMessage(capturedFrom, {
          type: "text",
          text: "Something went wrong. Please type *Hi* to try again.",
        });
      } catch (_) {}
    }
  })());

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
