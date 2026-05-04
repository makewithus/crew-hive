/**
 * lib/auth.js — Firebase Phone Auth (zero visible reCAPTCHA, instant OTP)
 *
 * Strategy:
 * - RecaptchaVerifier(invisible) is PRE-RENDERED on page mount via prewarmRecaptcha()
 * - verifier.render() runs in background so the token is already solved
 *   by the time the user clicks "Send OTP" — zero extra wait, no puzzle shown
 * - After each send we immediately re-warm in background for the next request
 */

import {
  signInWithPhoneNumber,
  signInWithCustomToken,
  RecaptchaVerifier,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";

// ─── Module-level state ───────────────────────────────────────────────────────
let _confirmationResult = null;
let _pendingPhone = null;
let _lastOtpSentAt = 0;
const OTP_DEBOUNCE_MS = 30_000;

// ─── DEV detection ────────────────────────────────────────────────────────────
const isLocalDev = () => {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.");
  }
  return false;
};

// ─── reCAPTCHA helpers ────────────────────────────────────────────────────────
const destroyVerifier = () => {
  if (typeof window === "undefined") return;
  try { window._recaptchaVerifier?.clear(); } catch (_) {}
  window._recaptchaVerifier = null;
  // Replace the DOM node so Firebase has no stale reference
  const el = document.getElementById("recaptcha-container");
  if (el && el.parentNode) {
    const fresh = document.createElement("div");
    fresh.id = "recaptcha-container";
    fresh.style.cssText = "position:absolute;bottom:0;opacity:0;pointer-events:none";
    el.parentNode.replaceChild(fresh, el);
  }
  try { if (window.grecaptcha?.reset) window.grecaptcha.reset(); } catch (_) {}
};

const buildAndRender = () => {
  if (typeof window === "undefined" || isLocalDev()) return;
  destroyVerifier();
  try {
    const v = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        // Token expired silently — rebuild for next use
        setTimeout(() => buildAndRender(), 0);
      },
    });
    window._recaptchaVerifier = v;
    // render() pre-solves the invisible reCAPTCHA in the background
    v.render().catch(() => {});
  } catch (err) {
    console.error("[recaptcha] buildAndRender error:", err.message);
  }
};

// ─── Public: call once on login page mount ────────────────────────────────────
export const prewarmRecaptcha = () => buildAndRender();

// ─── Error mapping ────────────────────────────────────────────────────────────
const FIREBASE_ERRORS = {
  "auth/invalid-phone-number": "Invalid phone number. Include country code (e.g. +91XXXXXXXXXX).",
  "auth/too-many-requests": "Too many OTP requests. Please wait a few minutes and try again.",
  "auth/quota-exceeded": "SMS quota exceeded. Please try again later.",
  "auth/captcha-check-failed": "Verification failed. Please refresh and try again.",
  "auth/network-request-failed": "Network error. Check your internet connection.",
  "auth/operation-not-allowed": "Phone sign-in is not enabled in Firebase Console.",
  "auth/invalid-verification-code": "Incorrect OTP. Please check and try again.",
  "auth/code-expired": "OTP has expired. Please request a new one.",
  "auth/session-expired": "Session expired. Please request a new OTP.",
  "auth/missing-verification-code": "Please enter the OTP code.",
  "auth/billing-not-enabled": "Firebase Blaze plan required for phone auth.",
  "auth/internal-error": "Firebase error. Make sure this domain is in Authorized Domains.",
  "auth/missing-app-credential": "reCAPTCHA error. Please refresh the page.",
  "auth/missing-client-identifier": "reCAPTCHA error. Please refresh the page.",
  "auth/invalid-app-credential": "reCAPTCHA error. Please refresh the page.",
};

const friendlyError = (code) =>
  FIREBASE_ERRORS[code] || `Something went wrong (${code || "unknown"}). Please refresh and try again.`;

// ─── Phone validation ─────────────────────────────────────────────────────────
export const isValidPhone = (phone) => /^\+[1-9]\d{6,14}$/.test(phone);

// ─── Send OTP ─────────────────────────────────────────────────────────────────
export const sendOtp = async (fullPhone) => {
  if (!isValidPhone(fullPhone)) {
    return { success: false, error: "Invalid phone number format." };
  }

  // LOCAL MODE — bypass Firebase entirely, use server route with code 123456
  if (isLocalDev()) {
    _pendingPhone = fullPhone;
    return { success: true };
  }

  const now = Date.now();
  if (now - _lastOtpSentAt < OTP_DEBOUNCE_MS) {
    const wait = Math.ceil((OTP_DEBOUNCE_MS - (now - _lastOtpSentAt)) / 1000);
    return { success: false, error: `Please wait ${wait}s before requesting another OTP.` };
  }

  // Grab the pre-warmed verifier (already rendered = token ready = instant)
  // If missing for any reason, build one now
  let verifier = window._recaptchaVerifier || null;
  if (!verifier) {
    destroyVerifier();
    try {
      verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => setTimeout(() => buildAndRender(), 0),
      });
      window._recaptchaVerifier = verifier;
      await verifier.render();
    } catch (err) {
      return { success: false, error: "reCAPTCHA setup failed. Please refresh the page." };
    }
  }

  // Detach from global now so a re-warm can start without conflict
  window._recaptchaVerifier = null;

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, verifier);
    _confirmationResult = confirmationResult;
    _lastOtpSentAt = Date.now();
    _pendingPhone = fullPhone;
    // Re-warm immediately in background so resend / next send is also instant
    setTimeout(() => buildAndRender(), 0);
    return { success: true };
  } catch (err) {
    destroyVerifier();
    setTimeout(() => buildAndRender(), 500);
    console.error("[sendOtp] Firebase error:", err.code, err.message);
    return { success: false, error: friendlyError(err.code), code: err.code };
  }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export const verifyOtp = async (code) => {
  if (!code || String(code).trim().length < 6) {
    return { success: false, error: "Please enter the 6-digit OTP." };
  }

  // LOCAL MODE — validate via server route
  if (isLocalDev()) {
    const phone = _pendingPhone;
    if (!phone) {
      return { success: false, error: "Session expired. Please enter your number again.", code: "auth/session-expired" };
    }
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: String(code).trim() }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Invalid code." };
      const credential = await signInWithCustomToken(auth, data.customToken);
      _pendingPhone = null;
      return { success: true, user: credential.user, phone, role: data.role, approved: data.approved };
    } catch (err) {
      return { success: false, error: err.message || "Verification failed." };
    }
  }

  // PRODUCTION — Firebase confirm
  if (!_confirmationResult) {
    return { success: false, error: "Session expired. Please request a new OTP.", code: "auth/session-expired" };
  }
  try {
    const credential = await _confirmationResult.confirm(String(code).trim());
    _confirmationResult = null;
    _pendingPhone = null;
    return { success: true, user: credential.user, phone: credential.user.phoneNumber };
  } catch (err) {
    console.error("[verifyOtp] Firebase error:", err.code, err.message);
    return { success: false, error: friendlyError(err.code), code: err.code };
  }
};

// ─── Fetch user role (post-login) ─────────────────────────────────────────────
export const fetchUserRole = async (phone) => {
  const res = await fetch("/api/auth/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, checkOnly: false }),
  });
  if (!res.ok) throw new Error("Failed to load user profile.");
  return res.json();
};

// ─── Sign out ─────────────────────────────────────────────────────────────────
export const signOutUser = async () => {
  _confirmationResult = null;
  _lastOtpSentAt = 0;
  destroyVerifier();
  await signOut(auth);
};
