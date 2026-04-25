/**
 * lib/auth.js — Server-side OTP auth (no reCAPTCHA)
 *
 * Flow:
 *   1. sendOtp(phone)        → POST /api/auth/send-otp  (stores OTP in Firestore, sends SMS/WhatsApp)
 *   2. verifyOtp(phone,code) → POST /api/auth/verify-otp (validates OTP, returns Firebase custom token)
 *   3. signInWithCustomToken → Firebase session created client-side
 *
 * Works identically on localhost and Vercel — zero reCAPTCHA.
 */

import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './firebase';

// ─── Phone validation ─────────────────────────────────────────────────────────
export const isValidPhone = (phone) => /^\+[1-9]\d{6,14}$/.test(phone);

// ─── Debounce guard (client-side UX only) ────────────────────────────────────
let _lastOtpSentAt = 0;
const OTP_DEBOUNCE_MS = 30_000;
let _pendingPhone = null;

// ─── Send OTP ─────────────────────────────────────────────────────────────────
export const sendOtp = async (fullPhone) => {
  if (!isValidPhone(fullPhone)) {
    return { success: false, error: 'Invalid phone number format. Include country code (e.g. +91XXXXXXXXXX).' };
  }

  const now = Date.now();
  if (now - _lastOtpSentAt < OTP_DEBOUNCE_MS) {
    const wait = Math.ceil((OTP_DEBOUNCE_MS - (now - _lastOtpSentAt)) / 1000);
    return { success: false, error: `Please wait ${wait}s before requesting another OTP.` };
  }

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to send OTP. Please try again.' };
    _lastOtpSentAt = Date.now();
    _pendingPhone = fullPhone;
    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Please check your connection and try again.' };
  }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export const verifyOtp = async (code, phoneOverride) => {
  const phone = phoneOverride || _pendingPhone;
  if (!phone) {
    return { success: false, error: 'Session expired. Please request a new OTP.', code: 'auth/session-expired' };
  }
  if (!code || String(code).trim().length < 6) {
    return { success: false, error: 'Please enter the 6-digit OTP.' };
  }

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code: String(code).trim() }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Invalid OTP. Please try again.' };

    const credential = await signInWithCustomToken(auth, data.customToken);
    _pendingPhone = null;

    return {
      success: true,
      user: credential.user,
      phone,
      role: data.role,
      approved: data.approved,
    };
  } catch (err) {
    if (err?.code?.startsWith('auth/')) {
      return { success: false, error: 'Authentication failed. Please try again.', code: err.code };
    }
    return { success: false, error: 'Verification failed. Please try again.' };
  }
};

// ─── Fetch user role (post-login) ─────────────────────────────────────────────
export const fetchUserRole = async (phone) => {
  const res = await fetch('/api/auth/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, checkOnly: false }),
  });
  if (!res.ok) throw new Error('Failed to load user profile.');
  return res.json();
};

// ─── Sign out ─────────────────────────────────────────────────────────────────
export const signOutUser = async () => {
  _pendingPhone = null;
  _lastOtpSentAt = 0;
  await signOut(auth);
};
