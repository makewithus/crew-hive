/**
 * backend/config/firebase.js
 * The single Firebase Admin initialisation for the whole platform.
 *
 * live      -> real project (credentials required, startup fails otherwise)
 * emulator  -> Firebase Emulator Suite (never in production)
 * mock      -> in-memory doubles, ONLY when APP_ENV=test
 * There is no silent fallback: an initialisation failure throws and the server refuses to start.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import env, { validateEnv } from "./env.js";
import { MockFirestore, MockAuth } from "./mock-firestore.js";

let db = null;
let auth = null;
let mockDb = null;
let mockAuth = null;

export function initFirebase() {
  if (db && auth) return { db, auth };
  validateEnv();
  const { mode, projectId, clientEmail, privateKey } = env.firebase;

  if (mode === "mock") {
    mockDb ||= new MockFirestore();
    mockAuth ||= new MockAuth();
    db = mockDb; auth = mockAuth;
    return { db, auth };
  }

  const app = getApps()[0] || (mode === "emulator"
    ? initializeApp({ projectId: projectId || "crewhive-emulator" })
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }));
  db = getFirestore(app);
  auth = getAuth(app);
  return { db, auth };
}

export const getDb = () => initFirebase().db;
export const getAuthAdmin = () => initFirebase().auth;
export const isMock = () => env.firebase.mode === "mock";

/** Test helpers (throw outside mock mode so they can never touch real data). */
export const testHooks = {
  reset() { if (!isMock()) throw new Error("testHooks only available in mock mode"); initFirebase(); mockDb.reset(); mockAuth.reset(); },
  auth() { if (!isMock()) throw new Error("testHooks only available in mock mode"); initFirebase(); return mockAuth; },
  db() { if (!isMock()) throw new Error("testHooks only available in mock mode"); return getDb(); },
};

export default { initFirebase, getDb, getAuthAdmin, isMock, testHooks };
