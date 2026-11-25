/**
 * OTP delivery: MSG91 SMS first, then WhatsApp text fallback (same strategy as the legacy web route).
 * Never called with real providers in test/mock mode; returns {delivered:false} when no provider is configured.
 */
import env from "../config/env.js";

export async function deliverOtp(phoneDigits, otp) {
  if (env.isTest || env.firebase.mode === "mock") return { delivered: false, channel: "none", reason: "test-mode" };
  if (!env.msg91.authKey) return { delivered: false, channel: "none", reason: "no-provider" };
  try {
    const msg = encodeURIComponent(`${otp} is your CrewHive verification code. Valid for 10 minutes. Do not share this with anyone. - CrewHive`);
    let url = `https://api.msg91.com/api/sendhttp.php?authkey=${encodeURIComponent(env.msg91.authKey)}&mobiles=${phoneDigits}&message=${msg}&sender=${env.msg91.senderId}&route=4&country=0`;
    if (env.msg91.dltTemplateId) url += `&DLT_TE_ID=${encodeURIComponent(env.msg91.dltTemplateId)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    console.log(`[OTP Delivery] MSG91 SMS dispatch response for +${phoneDigits}:`, text.slice(0, 100));
    if (res.ok && !text.toLowerCase().startsWith("error")) return { delivered: true, channel: "sms" };
  } catch (err) {
    console.warn(`[OTP Delivery] MSG91 SMS error for +${phoneDigits}:`, err.message);
  }
  try {
    const { whatsAppAdapter } = await import("./whatsapp/adapter.js");
    const r = await whatsAppAdapter.sendText(`+${phoneDigits}`, `🔐 *CrewHive Verification Code*\n\nYour OTP is: *${otp}*\n\nValid for 10 minutes. Do not share this with anyone.`);
    return { delivered: !!r.success, channel: "whatsapp" };
  } catch { return { delivered: false, channel: "none", reason: "all-channels-failed" }; }
}
