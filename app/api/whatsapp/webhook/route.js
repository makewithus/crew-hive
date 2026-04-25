/**
 * MSG91 WhatsApp Webhook — CrewHive
 * GET  /api/whatsapp/webhook  — Verification handshake
 * POST /api/whatsapp/webhook  — Incoming message handler
 *
 * Processes synchronously: send reply first, then return 200.
 * Dedup is handled entirely inside conversation.js (lastMsgNorm + atomicStepTransition).
 */

import { NextResponse } from "next/server";
import { handleMessage } from "@/lib/conversation";
import { sendConversationMessage } from "@/lib/whatsapp";
import logger from "@/lib/logger";

export const maxDuration = 30;

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
  const ownNumber = String(process.env.MSG91_WHATSAPP_NUMBER || "").replace(
    /\D/g,
    "",
  );
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
  // innerPayload may be an object OR a JSON string — normalise to object
  let innerPayload = payload.payload;
  if (typeof innerPayload === "string") {
    try {
      innerPayload = JSON.parse(innerPayload);
    } catch (_) {}
  }

  logger.log("[Webhook] RAW:", JSON.stringify({ msgType, from, innerPayload }));

  /**
   * Deeply extract a selection id from any payload shape MSG91 might send.
   * Priority: interactive nested id > direct id > title > text body
   */
  const extractSelectionId = (obj) => {
    if (!obj || typeof obj !== "object") return "";
    // list_reply / button_reply nested
    const nested = obj.list_reply || obj.button_reply;
    if (nested?.id) return String(nested.id).trim();
    if (nested?.title) return String(nested.title).trim();
    // direct id/title on obj
    if (obj.id) return String(obj.id).trim();
    if (obj.title) return String(obj.title).trim();
    // list object shape: {list: {id, title}}
    if (obj.list?.id) return String(obj.list.id).trim();
    if (obj.button?.id) return String(obj.button.id).trim();
    return "";
  };

  const extractPlainText = (raw) => {
    if (!raw) return "";
    if (typeof raw === "object") {
      // If it looks like a selection object, extract the id not the JSON
      const sel = extractSelectionId(raw);
      if (sel) return sel;
      return String(raw.body || raw.text || raw.message || "").trim();
    }
    const str = String(raw).trim();
    // If it's a JSON string that encodes a selection (MSG91 text fallback), extract id
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === "object") {
        const sel = extractSelectionId(parsed);
        if (sel) return sel;
        return String(
          parsed.text || parsed.body || parsed.message || "",
        ).trim();
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

  logger.log(
    "[Webhook] from:",
    from,
    "| type:",
    msgType,
    "| text:",
    JSON.stringify(messageText),
  );

  if (!messageText) {
    logger.warn("[Webhook] Empty messageText — ignoring");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  // ── Message-ID dedup (catches MSG91 webhook retries on Vercel cold starts) ──
  // MSG91 retries the webhook if no 200 arrives quickly. We use the message's
  // unique ID (if present) as a content-addressable dedup key with no time window.
  const { adminDb } = await import("@/lib/firebase-admin");
  const msgId =
    payload?.id ||
    payload?.messageId ||
    payload?.message_id ||
    body?.id ||
    body?.messageId ||
    null;
  if (msgId) {
    const dedupRef = adminDb().collection("dedup").doc(`msg_${String(msgId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100)}`);
    try {
      await dedupRef.create({ ts: Date.now(), from, msgId });
    } catch (err) {
      const code = err?.code ?? 0;
      const errMsg = err?.message ?? "";
      if (code === 6 || errMsg.includes("ALREADY_EXISTS") || errMsg.includes("already exists")) {
        logger.warn("[Webhook] MsgID dedup HIT — retry suppressed | msgId:", msgId, "| from:", from);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }
    }
  }

  // ── Process message and send reply ────────────────────────────────────────
  // Run synchronously so Vercel doesn't add after() scheduling overhead.
  // Dedup is handled in handleMessage (lastMsgNorm plain-get + atomicStepTransition).
  try {
    const result = await handleMessage({ userId: from, message: messageText });

    if (result === null) {
      // Duplicate — conversation.js already blocked it
      logger.log("[Webhook] Duplicate suppressed for:", from);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const messages = Array.isArray(result) ? result : [result];
    for (const msg of messages) {
      if (!msg?.text) continue;
      await sendConversationMessage(from, msg);
    }

    logger.log(
      "[Webhook] Reply(s) sent to:",
      from,
      "| count:",
      messages.length,
    );
  } catch (err) {
    logger.error("[Webhook] Processing error:", err);
    try {
      await sendConversationMessage(from, {
        type: "text",
        text: "Something went wrong. Please type Hi to restart.",
      });
    } catch (_) {}
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
