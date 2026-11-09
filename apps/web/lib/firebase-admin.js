/**
 * lib/firebase-admin.js — Firebase Admin SDK (server-side only)
 * Used by API routes / webhook to access Firestore without client auth.
 * Requires these env vars in Vercel (and .env.local for local dev):
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY   ← paste the private key including \n characters
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const getAdminApp = () => {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && "FIREBASE_ADMIN_PROJECT_ID",
      !clientEmail && "FIREBASE_ADMIN_CLIENT_EMAIL",
      !privateKey && "FIREBASE_ADMIN_PRIVATE_KEY",
    ].filter(Boolean).join(", ");
    throw new Error(`Missing Firebase Admin env vars: ${missing}`);
  }

  // Handle both formats:
  // 1. Vercel dashboard pastes real newlines → key already has \n chars → no-op
  // 2. .env file with literal \n escape sequences → need to replace
  if (!privateKey.includes("\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
};

export const adminDb = () => {
  const app = getAdminApp();
  return getFirestore(app);
};

export const adminAuth = () => {
  const app = getAdminApp();
  return getAuth(app);
};
