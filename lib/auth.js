/**
 * lib/auth.js — Firebase Phone Auth (OTP via Firebase, Blaze plan)
 *
 * Flow:
 *   sendOtp(phone)  → signInWithPhoneNumber (Firebase sends SMS directly)
 *   verifyOtp(code) → confirmationResult.confirm(code) → Firebase session
 *
 * No MSG91. No custom token. Pure Firebase Phone Auth.
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
const clearRecaptcha = () => {
  try {
    if (typeof window !== 'undefined' && window._recaptchaVerifier) {
      window._recaptchaVerifier.clear();
    }
  } catch (_) {}
  if (typeof window !== 'undefined') window._recaptchaVerifier = null;
};

const setupRecaptcha = (containerId = 'recaptcha-container') => {
  if (typeof window === 'undefined') return null;
  if (window._recaptchaVerifier) return window._recaptchaVerifier;
  try {
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      'expired-callback': clearRecaptcha,
    });
    window._recaptchaVerifier = verifier;
    return verifier;
  } catch {
    return null;
  }
};

// ─── Error mapping ────────────────────────────────────────────────────────────
const FIREBASE_ERRORS = {
  'auth/invalid-phone-number':      'Invalid phone number. Include country code (e.g. +91XXXXXXXXXX).',
  'auth/too-many-requests':         'Too many OTP requests. Please wait a few minutes and try again.',
  'auth/quota-exceeded':            'SMS quota exceeded. Please try again later.',
  'auth/captcha-check-failed':      'Verification failed. Please refresh and try again.',
  'auth/network-request-failed':    'Network error. Check your internet connection.',
  'auth/operation-not-allowed':     'Phone sign-in is not enabled in Firebase Console.',
  'auth/invalid-verification-code': 'Incorrect OTP. Please check and try again.',
  'auth/code-expired':              'OTP has expired. Please request a new one.',
  'auth/session-expired':           'Session expired. Please request a new OTP.',
  'auth/missing-verification-code': 'Please enter the OTP code.',
  'auth/billing-not-enabled':       'Firebase Blaze plan required for phone auth.',
  'auth/internal-error':            'Firebase error. Make sure this domain is in Authorized Domains.',
  'auth/missing-app-credential':    'reCAPTCHA setup error. Please refresh the page.',
  'auth/missing-client-identifier': 'reCAPTCHA setup error. Please refresh the page.',
  'auth/invalid-app-credential':    'Invalid reCAPTCHA. Please refresh the page.',
};

const friendlyError = (code) =>
  FIREBASE_ERRORS[code] || `Something went wrong (${code || 'unknown'}). Please refresh and try again.`;

// ─── Phone validation ─────────────────────────────────────────────────────────
export const isValidPhone = (phone) => /^\+[1-9]\d{6,14}$/.test(phone);

// ─── Debounce guard ───────────────────────────────────────────────────────────
let _lastOtpSentAt = 0;
const OTP_DEBOUNCE_MS = 30_000;

// ─── Send OTP (Firebase) ──────────────────────────────────────────────────────
export const sendOtp = async (fullPhone) => {
  if (!isValidPhone(fullPhone)) {
    return { success: false, error: 'Invalid phone number format.' };
  }

  const now = Date.now();
  if (now - _lastOtpSentAt < OTP_DEBOUNCE_MS) {
    const wait = Math.ceil((OTP_DEBOUNCE_MS - (now - _lastOtpSentAt)) / 1000);
    return { success: false, error: `Please wait ${wait}s before requesting another OTP.` };
  }

  clearRecaptcha();

  try {
    const verifier = setupRecaptcha('recaptcha-container');
    if (!verifier) {
      return { success: false, error: 'reCAPTCHA setup failed. Please refresh the page.' };
    }

    const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, verifier);
    _confirmationResult = confirmationResult;
    _lastOtpSentAt = Date.now();
    return { success: true };
  } catch (err) {
    clearRecaptcha();
    console.error('[sendOtp] Firebase error:', err.code, err.message);
    return { success: false, error: friendlyError(err.code), code: err.code };
  }
};

// ─── Verify OTP (Firebase) ────────────────────────────────────────────────────
export const verifyOtp = async (code) => {
  if (!code || String(code).trim().length < 6) {
    return { success: false, error: 'Please enter the 6-digit OTP.' };
  }
  if (!_confirmationResult) {
    return { success: false, error: 'Session expired. Please request a new OTP.', code: 'auth/session-expired' };
  }
  try {
    const credential = await _confirmationResult.confirm(String(code).trim());
    _confirmationResult = null;
    return { success: true, user: credential.user, phone: credential.user.phoneNumber };
  } catch (err) {
    console.error('[verifyOtp] Firebase error:', err.code, err.message);
    return { success: false, error: friendlyError(err.code), code: err.code };
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
  _confirmationResult = null;
  _lastOtpSentAt = 0;
  clearRecaptcha();
  await signOut(auth);
};
