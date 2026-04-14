/**
 * lib/auth.js — OTP Authentication (Production)
 *
 * Exports:
 *   sendOtp(fullPhone)   → { success, error? }
 *   verifyOtp(code)      → { success, user?, error?, code? }
 *   signOutUser()        → void
 *
 * ConfirmationResult is stored in module scope (never serialised to state
 * or localStorage) so the live class instance is preserved for .confirm().
 */

import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

// ─── Confirmation result (module-level) ──────────────────────────────────────
let _confirmationResult = null;

// ─── reCAPTCHA lifecycle ──────────────────────────────────────────────────────

/** Tear down any existing verifier. Safe to call multiple times. */
const clearRecaptcha = () => {
  try {
    if (window._recaptchaVerifier) {
      window._recaptchaVerifier.clear();
    }
  } catch (_) {
    // ignore — already cleared
  } finally {
    window._recaptchaVerifier = null;
  }
};

/**
 * Set up an invisible reCAPTCHA verifier attached to `containerId`.
 * Returns null if not in browser or if set-up fails.
 */
const setupRecaptcha = (containerId = 'recaptcha-container') => {
  if (typeof window === 'undefined') return null;

  // Reuse if already rendered and valid
  if (window._recaptchaVerifier) return window._recaptchaVerifier;

  try {
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      'expired-callback': () => {
        // Silently clear so the next attempt re-creates it
        clearRecaptcha();
      },
    });
    window._recaptchaVerifier = verifier;
    return verifier;
  } catch (err) {
    return null;
  }
};

// ─── Error mapping ────────────────────────────────────────────────────────────
const FIREBASE_ERRORS = {
  'auth/billing-not-enabled':
    'Phone OTP requires Firebase Blaze plan. Add a test phone number in ' +
    'Firebase Console → Authentication → Sign-in method → Phone.',
  'auth/invalid-phone-number':
    'Invalid phone number. Please include country code (e.g. +91).',
  'auth/too-many-requests':
    'Too many attempts. Please wait a few minutes and try again.',
  'auth/quota-exceeded':
    'SMS quota exceeded for today. Please try again tomorrow.',
  'auth/captcha-check-failed':
    'reCAPTCHA verification failed. Please refresh and try again.',
  'auth/network-request-failed':
    'Network error. Check your internet connection.',
  'auth/operation-not-allowed':
    'Phone sign-in is not enabled. Enable it in Firebase Console → ' +
    'Authentication → Sign-in method.',
  'auth/invalid-verification-code':
    'Incorrect OTP. Please check and try again.',
  'auth/code-expired':
    'OTP has expired. Please request a new one.',
  'auth/session-expired':
    'Session expired. Please request a new OTP.',
  'auth/missing-verification-code':
    'Please enter the OTP code.',
};

const friendlyError = (code) =>
  FIREBASE_ERRORS[code] || 'Something went wrong. Please try again.';

// ─── Phone validation ─────────────────────────────────────────────────────────

/** Accepts "+919876543210" style. Returns true if plausibly valid E.164. */
export const isValidPhone = (phone) => /^\+[1-9]\d{6,14}$/.test(phone);

// ─── Debounce guard ───────────────────────────────────────────────────────────
let _lastOtpSentAt = 0;
const OTP_DEBOUNCE_MS = 30_000; // 30 s between sends

// ─── Send OTP ─────────────────────────────────────────────────────────────────

/**
 * Send OTP to a phone number.
 * @param {string} fullPhone — E.164 format e.g. "+919876543210"
 * @returns {{ success: boolean, error?: string }}
 */
export const sendOtp = async (fullPhone) => {
  // Basic validation
  if (!isValidPhone(fullPhone)) {
    return { success: false, error: 'Invalid phone number format.' };
  }

  // Debounce rapid taps
  const now = Date.now();
  if (now - _lastOtpSentAt < OTP_DEBOUNCE_MS) {
    const wait = Math.ceil((OTP_DEBOUNCE_MS - (now - _lastOtpSentAt)) / 1000);
    return {
      success: false,
      error: `Please wait ${wait}s before requesting another OTP.`,
    };
  }

  // Always reset reCAPTCHA before a new OTP request
  clearRecaptcha();

  try {
    const verifier = setupRecaptcha('recaptcha-container');
    if (!verifier) {
      return {
        success: false,
        error: 'reCAPTCHA setup failed. Please refresh the page.',
      };
    }

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      fullPhone,
      verifier,
    );

    _confirmationResult = confirmationResult;
    _lastOtpSentAt = Date.now();

    return { success: true };
  } catch (err) {
    // Clear broken verifier so next attempt is fresh
    clearRecaptcha();
    return {
      success: false,
      error: friendlyError(err.code),
      code: err.code,
    };
  }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────

/**
 * Confirm a 6-digit OTP code.
 * @param {string} code
 * @returns {{ success: boolean, user?: firebase.User, error?: string, code?: string }}
 */
export const verifyOtp = async (code) => {
  if (!code || code.trim().length < 6) {
    return { success: false, error: 'Please enter the 6-digit OTP.' };
  }

  if (!_confirmationResult) {
    return {
      success: false,
      error: 'Session expired. Please request a new OTP.',
      code: 'auth/session-expired',
    };
  }

  try {
    const credential = await _confirmationResult.confirm(code.trim());
    _confirmationResult = null; // consumed — clear immediately
    return { success: true, user: credential.user };
  } catch (err) {
    if (err.code === 'auth/code-expired' || err.code === 'auth/session-expired') {
      _confirmationResult = null;
    }
    return {
      success: false,
      error: friendlyError(err.code),
      code: err.code,
    };
  }
};

// ─── Sign out ─────────────────────────────────────────────────────────────────

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (_) {
    // ignore
  }
};

// ─── Get user role from API ───────────────────────────────────────────────────

/**
 * After OTP success, call the server to get the user's role + approval status.
 * @param {string} phone — E.164
 * @returns {{ role: string|null, approved: boolean, isNew: boolean }}
 */
export const fetchUserRole = async (phone) => {
  const res = await fetch('/api/auth/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  if (!res.ok) throw new Error('Failed to load user profile. Please try again.');

  return res.json();
};
