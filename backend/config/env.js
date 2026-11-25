/**
 * backend/config/env.js
 * Central, validated environment configuration.
 *
 * APP_ENV      production | staging | development | test   (default: development)
 * FIREBASE_MODE live | emulator | mock                      (default: live; mock is ONLY legal when APP_ENV=test)
 *
 * No authentication bypass exists in any mode. Tests use a mock Firestore/Auth that they must request explicitly.
 */

import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ENV = process.env.APP_ENV || "development";

// Never load a .env file in test mode: tests must not be able to reach real credentials.
if (APP_ENV !== "test" && process.env.DOTENV_DISABLED !== "true") {
  const candidates = [path.resolve(__dirname, "../.env"), path.resolve(__dirname, "../../.env")];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) dotenv.config({ path: found });
}

const digits = (v) => String(v || "").replace(/\D/g, "");
const list = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

const firebaseMode = process.env.FIREBASE_MODE || "live";

export const env = {
  APP_ENV,
  isProduction: APP_ENV === "production" || process.env.NODE_ENV === "production",
  isTest: APP_ENV === "test",
  PORT: parseInt(process.env.PORT || "4000", 10),

  firebase: {
    mode: firebaseMode,
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    // Public web API key: used only server-side to exchange custom tokens / refresh sessions.
    webApiKey: process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  },

  otp: {
    pepper: process.env.OTP_PEPPER || "",
    // Configured test phone and fixed OTP for test team / QA review
    testPhone: process.env.FIREBASE_TEST_PHONE || "+919876543210",
    testPhoneId: digits(process.env.FIREBASE_TEST_PHONE || "919876543210"),
    testOtp: process.env.FIREBASE_TEST_OTP || "123456",
    allowTestOtp: process.env.ALLOW_TEST_OTP === "true" || process.env.LOCAL_AUTH_BYPASS === "true",
    // Allowed only outside production; returns the OTP in the API response for local development.
    devEcho: (process.env.OTP_DEV_ECHO === "true" || APP_ENV === "development") && APP_ENV !== "production",
    perPhoneMax: 5,
    perIpMax: 20,
    windowMs: 15 * 60 * 1000,
  },

  msg91: {
    authKey: process.env.MSG91_AUTH_KEY,
    senderId: process.env.MSG91_SENDER_ID || "CRWHIV",
    dltTemplateId: process.env.MSG91_DLT_TE_ID || "",
    whatsappNumber: process.env.MSG91_WHATSAPP_NUMBER,
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  },

  // Bootstrap super-admins (server-side only; never from client headers).
  superAdminIds: new Set([digits(process.env.SUPER_ADMIN_PHONE), ...list(process.env.ADMIN_PHONES).map(digits)].filter(Boolean)),

  rateLimit: { apiMax: parseInt(process.env.RATE_LIMIT_API_MAX || "300", 10), authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || "30", 10) },

  corsOrigins: list(process.env.CORS_ORIGINS),
  appUrl: process.env.APP_URL || "",
};

/** Throws on unsafe/incomplete configuration. Called once at startup (server.js and test bootstrap). */
export function validateEnv() {
  const problems = [];
  const f = env.firebase;
  if (!["live", "emulator", "mock"].includes(f.mode)) problems.push(`FIREBASE_MODE must be live|emulator|mock (got "${f.mode}")`);
  if (f.mode === "mock" && !env.isTest) problems.push("FIREBASE_MODE=mock is only permitted when APP_ENV=test");
  if (f.mode === "live") {
    if (!f.projectId) problems.push("FIREBASE_ADMIN_PROJECT_ID is required");
    if (!f.clientEmail) problems.push("FIREBASE_ADMIN_CLIENT_EMAIL is required");
    if (!f.privateKey.includes("BEGIN PRIVATE KEY")) problems.push("FIREBASE_ADMIN_PRIVATE_KEY is missing or invalid");
    if (!f.webApiKey) problems.push("FIREBASE_WEB_API_KEY is required (session exchange)");
  }
  if (f.mode === "emulator" && env.isProduction) problems.push("FIREBASE_MODE=emulator is not permitted in production");
  if (f.mode === "emulator" && !(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
    problems.push("FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST are required for emulator mode");
  }
  if (env.isProduction) {
    if (env.corsOrigins.length === 0) problems.push("CORS_ORIGINS must list the allowed web origins in production");
    if (env.otp.pepper.length < 16) problems.push("OTP_PEPPER (>=16 chars) is required in production");
    if (process.env.OTP_DEV_ECHO === "true") problems.push("OTP_DEV_ECHO must not be enabled in production");
    if (!env.msg91.authKey) problems.push("MSG91_AUTH_KEY is required in production (OTP delivery)");
    if (env.superAdminIds.size === 0) problems.push("SUPER_ADMIN_PHONE is required in production");
  }
  if (problems.length) {
    const err = new Error(`Invalid configuration:\n - ${problems.join("\n - ")}`);
    err.code = "INVALID_CONFIG";
    throw err;
  }
  if (!env.isTest) {
    console.log(`[Firebase Safeguard] Active mode: "${f.mode}" | Project: "${f.projectId || "none"}" | Environment: "${env.APP_ENV}"`);
  }
}

export default env;
