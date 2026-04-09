import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Guard against duplicate initialization (Next.js HMR + API routes)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Enable test mode only when NEXT_PUBLIC_FIREBASE_TESTING=true (never in production)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_TESTING === 'true') {
  auth.settings.appVerificationDisabledForTesting = true;
}

// Initialize Firestore
export const db = getFirestore(app);

// Setup reCAPTCHA verifier for phone auth
// Firebase v9 modular SDK: RecaptchaVerifier(auth, container, config)
export const setupRecaptchaVerifier = (containerId) => {
  if (typeof window === 'undefined') return null;

  try {
    // Clear any existing verifier on the container to avoid duplicate errors
    if (window._recaptchaVerifier) {
      try { window._recaptchaVerifier.clear(); } catch (_) {}
      window._recaptchaVerifier = null;
    }

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('[v0] reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.warn('[v0] reCAPTCHA expired — will retry on next submit');
        window._recaptchaVerifier = null;
      },
    });

    window._recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.error('[v0] Error setting up reCAPTCHA:', error);
    return null;
  }
};

// ─── In-memory confirmation result store ────────────────────────────────────
// ConfirmationResult is a class instance — JSON.stringify destroys its methods.
// Store it in a module-level variable so .confirm() is always available.
let _confirmationResult = null;

export const getStoredConfirmationResult = () => _confirmationResult;
export const clearStoredConfirmationResult = () => { _confirmationResult = null; };

// Human-readable messages for common Firebase phone auth errors
const PHONE_AUTH_ERRORS = {
  'auth/billing-not-enabled':
    'Phone sign-in requires Firebase Blaze plan or a test phone number. ' +
    'In Firebase Console → Authentication → Sign-in method → Phone → add a test number (e.g. +91 7000000000 / OTP: 123456).',
  'auth/invalid-phone-number': 'Invalid phone number. Please check the number and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/quota-exceeded': 'SMS quota exceeded for today. Please try again tomorrow.',
  'auth/captcha-check-failed': 'reCAPTCHA check failed. Please refresh the page and try again.',
  'auth/network-request-failed': 'Network error. Check your internet connection and try again.',
  'auth/operation-not-allowed': 'Phone sign-in is not enabled in Firebase Console. Enable it under Authentication → Sign-in method.',
};

// Sign in with phone number
export const signInWithPhone = async (phoneNumber, appVerifier) => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    // Store in memory so the OTP page can access the live instance
    _confirmationResult = confirmationResult;
    return { success: true };
  } catch (error) {
    console.error('[Firebase] Error signing in with phone:', error.code, error.message);
    const friendly = PHONE_AUTH_ERRORS[error.code];
    return { success: false, error: friendly || error.message, code: error.code };
  }
};

export default app;
