/**
 * MSG91 WhatsApp adapter. Never reports success unless the provider accepted the message.
 * Not configured (or test mode) → {success:false, reason}, so callers fall back to in-app/push and the gap is visible.
 * BLOCKED BY EXTERNAL DEPENDENCY: live use needs MSG91 credentials + Meta-approved templates.
 */
import crypto from "node:crypto";
import env from "../../config/env.js";
import { getDb } from "../../config/firebase.js";

const URL_OUT = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

async function post(payload) {
  const res = await fetch(URL_OUT, { method: "POST", headers: { "Content-Type": "application/json", authkey: env.msg91.authKey }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || `MSG91 HTTP ${res.status}`);
  return j;
}

async function log(entry) {
  try { await getDb().collection("whatsapp_deliveries").add({ ...entry, at: new Date().toISOString() }); } catch { /* best effort */ }
}

export class WhatsAppAdapter {
  configured() { return !!(env.msg91.authKey && env.msg91.whatsappNumber) && !env.isTest && env.firebase.mode !== "mock"; }

  async send(kind, to, name, body, attempt = 1) {
    if (!this.configured()) return { success: false, reason: "not_configured" };
    const phone = String(to).replace(/\D/g, "");
    const payload = kind === "template"
      ? { integrated_number: env.msg91.whatsappNumber, content_type: "template", payload: { to: phone, type: "template", template: { name, language: { code: "en" }, components: [{ type: "body", parameters: body.map((t) => ({ type: "text", text: String(t) })) }] } } }
      : { integrated_number: env.msg91.whatsappNumber, content_type: "text", payload: { to: phone, type: "text", text: { body } } };
    try {
      const r = await post(payload);
      await log({ kind, to: phone, template: name || null, status: "accepted", attempt });
      return { success: true, providerResponse: r };
    } catch (err) {
      if (attempt === 1) return this.send(kind, to, name, body, 2); // retry once
      await log({ kind, to: phone, template: name || null, status: "failed", error: err.message, attempt });
      return { success: false, reason: "provider_error", error: err.message, fallbackToInApp: true };
    }
  }
  sendText(to, text) { return this.send("text", to, null, text); }
  sendTemplate(to, template, params) { return this.send("template", to, template, params); }

  verifySignature(rawBody, signature) {
    if (!env.msg91.webhookSecret || !signature) return false;
    const mac = crypto.createHmac("sha256", env.msg91.webhookSecret).update(rawBody).digest("hex");
    const a = Buffer.from(mac), b = Buffer.from(String(signature).replace(/^sha256=/, ""));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}
export const whatsAppAdapter = new WhatsAppAdapter();
export default whatsAppAdapter;
