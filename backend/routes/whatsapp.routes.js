/**
 * backend/routes/whatsapp.routes.js
 * WhatsApp Webhook: GET verification handshake; POST handles incoming messages with signature check & idempotency.
 * Integrated with whatsapp-onboarding.service.js for conversational onboarding (C14 [P0]).
 */
import { Router } from "express";
import env from "../config/env.js";
import { whatsAppAdapter } from "../integrations/whatsapp/adapter.js";
import { getDb } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { handleIncomingMessage } from "../services/whatsapp-onboarding.service.js";

export const whatsappRouter = Router();

whatsappRouter.get("/webhook", (req, res) => {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
  if (mode === "subscribe" && env.msg91.verifyToken && token === env.msg91.verifyToken) {
    return res.status(200).send(String(challenge));
  }
  res.sendStatus(403);
});

whatsappRouter.post("/webhook", async (req, res, next) => {
  try {
    const sig = req.headers["x-signature"] || req.headers["x-hub-signature-256"];
    if (!whatsAppAdapter.verifySignature(req.rawBody || "", sig)) {
      throw Errors.unauthorized("Invalid webhook signature");
    }

    const id = req.body?.id || req.body?.messageId || req.body?.entry?.[0]?.id;
    if (id) {
      // Idempotency: prevent replay attacks and duplicate message processing
      const ref = getDb().collection("_webhook_dedup").doc(String(id).replace(/\//g, "_"));
      if ((await ref.get()).exists) {
        return res.json({ success: true, data: { duplicate: true }, message: "OK" });
      }
      await ref.set({ at: new Date().toISOString() });
    }

    // Extract sender and message body across MSG91 and standard formats
    let sender = req.body?.from || req.body?.sender || req.body?.mobile;
    let messageBody = req.body?.body || req.body?.text || req.body?.content;

    // Check Meta standard webhook payload shape
    if (!sender && req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const m = req.body.entry[0].changes[0].value.messages[0];
      sender = m.from;
      messageBody = m.text?.body || m.button?.payload || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title;
    }

    let onboardingResult = null;
    if (sender && messageBody) {
      onboardingResult = await handleIncomingMessage({
        from: sender,
        body: messageBody,
        messageId: id,
      });
    }

    // Record webhook delivery tracking
    await getDb().collection("whatsapp_deliveries").add({
      kind: "webhook",
      phone: sender || null,
      status: req.body?.status || (onboardingResult ? "processed" : "received"),
      onboardingResult: onboardingResult ? onboardingResult.status : null,
      at: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: onboardingResult || {},
      message: "OK",
    });
  } catch (e) {
    next(e);
  }
});
