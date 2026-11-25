/** FeatureAccess: one config doc (settings/feature_access) drives free/trial/paid for web AND mobile. */
import { getDb } from "../config/firebase.js";

export const DEFAULT_CONFIG = {
  activeTier: "free", // free at launch; flip to "trial" without code changes
  trialDurationDays: 7,
  enforceGatingInFree: false,
  gatedFeatures: ["advanced_filters", "shortlists", "show_lists", "pre_bookings"],
  supportContact: "support@crewhive.in",
  inquiryWhatsapp: "+918139002826",
};

export async function getConfig() {
  const s = await getDb().collection("settings").doc("feature_access").get();
  return { ...DEFAULT_CONFIG, ...(s.exists ? s.data() : {}) };
}
export async function updateConfig(patch, actor) {
  const allowed = ["activeTier", "trialDurationDays", "enforceGatingInFree", "gatedFeatures", "supportContact", "inquiryWhatsapp"];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  if (clean.activeTier && !["free", "trial", "paid"].includes(clean.activeTier)) throw Object.assign(new Error("invalid tier"), { statusCode: 400, code: "VALIDATION_ERROR" });
  await getDb().collection("settings").doc("feature_access").set({ ...clean, updatedAt: new Date().toISOString(), updatedBy: actor }, { merge: true });
  return getConfig();
}
export function trialDaysRemaining(startedAt, days) {
  if (!startedAt) return days;
  return Math.max(0, days - Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000));
}
/** Enforced server-side; never auto-converts to paid (subscriptionTier is only set by an explicit admin/payment action). */
export async function checkAccess(feature, recruiter = {}) {
  const cfg = await getConfig();
  const tier = recruiter.subscriptionTier === "paid" ? "paid" : cfg.activeTier;
  if (tier === "paid") return { allowed: true, tier, daysRemaining: null };
  const gated = cfg.gatedFeatures.includes(feature);
  if (tier === "free") return gated && cfg.enforceGatingInFree ? { allowed: false, tier, reason: "This feature requires a trial or subscription.", contact: cfg.inquiryWhatsapp } : { allowed: true, tier, daysRemaining: null };
  const left = trialDaysRemaining(recruiter.trialStartedAt, cfg.trialDurationDays);
  return left > 0 || !gated ? { allowed: true, tier, daysRemaining: left } : { allowed: false, tier, daysRemaining: 0, reason: "Your free trial has ended. Subscribe or contact us for access.", contact: cfg.inquiryWhatsapp };
}

export async function gate(user, feature) {
  const o = (await getDb().collection("organizers").doc(user.id).get()).data() || {};
  const a = await checkAccess(feature, o);
  if (!a.allowed) throw Object.assign(new Error(a.reason || "Feature not available on your plan"), { statusCode: 403, code: "FORBIDDEN" });
  return a;
}
