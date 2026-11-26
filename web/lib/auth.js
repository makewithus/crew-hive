/**
 * lib/auth.js — Unified Backend OTP Authentication (zero client reCAPTCHA puzzles)
 *
 * Strategy:
 * - All OTP sending and verification goes through the Express backend (/api/auth/send-otp & /api/auth/verify-otp).
 * - On verification, the backend returns a Firebase customToken, and the client signs in with signInWithCustomToken(auth, customToken).
 * - Zero reCAPTCHA image puzzles or client-side verification popups.
 */

import { apiFetch } from "./api-client";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "./firebase";

// ─── Module-level state ───────────────────────────────────────────────────────
let _pendingPhone = null;
let _lastOtpSentAt = 0;
const OTP_DEBOUNCE_MS = 30_000;

// ─── DEV detection (kept for backward compatibility) ──────────────────────────
export const isLocalDev = () => {
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "production") {
    return false;
  }
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.");
  }
  return false;
};

// Kept as a no-op so existing page mounts calling prewarmRecaptcha() stay compatible
export const prewarmRecaptcha = () => {};

// ─── Phone validation ─────────────────────────────────────────────────────────
export const isValidPhone = (phone) => /^\+[1-9]\d{6,14}$/.test(phone);

export const isValidIndianPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
  if (digits.length === 12 && digits.startsWith("91")) return /^[6-9]\d{9}$/.test(digits.slice(2));
  return false;
};

// ─── Send OTP (via Express Backend) ───────────────────────────────────────────
export const sendOtp = async (fullPhone) => {
  if (!isValidPhone(fullPhone)) {
    return { success: false, error: "Invalid phone number format." };
  }

  if (fullPhone.startsWith("+91") && !isValidIndianPhone(fullPhone)) {
    return { success: false, error: "Please provide a valid 10-digit Indian mobile number" };
  }

  const now = Date.now();
  if (now - _lastOtpSentAt < OTP_DEBOUNCE_MS) {
    const wait = Math.ceil((OTP_DEBOUNCE_MS - (now - _lastOtpSentAt)) / 1000);
    return { success: false, error: `Please wait ${wait}s before requesting another OTP.` };
  }

  try {
    const res = await apiFetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to send OTP. Please try again." };
    }

    _lastOtpSentAt = Date.now();
    _pendingPhone = fullPhone;
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem("crewhive_pending_phone", fullPhone); } catch (_) {}
    }
    return { success: true };
  } catch (err) {
    console.error("[sendOtp] Error:", err?.message || err);
    return { success: false, error: "Network error. Please check your connection and try again." };
  }
};

// ─── Verify OTP (via Express Backend → Firebase customToken) ──────────────────
export const verifyOtp = async (code) => {
  if (!code || String(code).trim().length < 6) {
    return { success: false, error: "Please enter the 6-digit OTP." };
  }

  const phone = _pendingPhone || (typeof window !== "undefined" ? sessionStorage.getItem("crewhive_pending_phone") : null);
  if (!phone) {
    return { success: false, error: "Session expired. Please enter your number again.", code: "auth/session-expired" };
  }

  try {
    const res = await apiFetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: String(code).trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || "Incorrect OTP. Please check and try again." };
    }

    const credential = await signInWithCustomToken(auth, data.customToken);
    _pendingPhone = null;
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("crewhive_pending_phone"); } catch (_) {}
    }
    return { success: true, user: credential.user, phone, role: data.role, approved: data.approved };
  } catch (err) {
    console.error("[verifyOtp] Error:", err?.message || err);
    return { success: false, error: err?.message || "Verification failed. Please try again." };
  }
};

// ─── Fetch user role (post-login) ─────────────────────────────────────────────
export const fetchUserRole = async (phone) => {
  const res = await apiFetch("/api/auth/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, checkOnly: false }),
  });
  if (!res.ok) throw new Error("Failed to load user profile.");
  return res.json();
};

// ─── Sign out ─────────────────────────────────────────────────────────────────
export const signOutUser = async () => {
  _pendingPhone = null;
  _lastOtpSentAt = 0;
  if (typeof window !== "undefined") {
    try { sessionStorage.removeItem("crewhive_pending_phone"); } catch (_) {}
  }
  await signOut(auth);
};
