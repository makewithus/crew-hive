/**
 * backend/services/auth.service.js
 * OTP → Firebase custom token → ID/refresh token session. One identity (digits-only phone id) for web, mobile and WhatsApp.
 * Roles are NEVER accepted from the client; they come from users/{id} or the SUPER_ADMIN env allow-list.
 */

import crypto from "node:crypto";
import { normalizeIndianPhone, isValidIndianPhone, phoneToDocId } from "@crew-hive/shared";
import env from "../config/env.js";
import { getDb, getAuthAdmin, isMock, testHooks } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { hit } from "../middleware/rate-limiter.middleware.js";
import { normalizeRole } from "../middleware/auth.middleware.js";
import { deliverOtp } from "../integrations/otp-delivery.js";

const OTP_TTL = 10 * 60 * 1000;
const COOLDOWN = 30 * 1000;
const MAX_ATTEMPTS = 5;

const hashOtp = (id, otp) => crypto.createHmac("sha256", env.otp.pepper || "dev-pepper").update(`${id}:${otp}`).digest("hex");
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function cleanPhone(raw) {
  const p = normalizeIndianPhone(raw);
  if (!p || !isValidIndianPhone(p)) throw Errors.badRequest("Please provide a valid 10-digit Indian mobile number");
  return { phone: p, id: phoneToDocId(p) };
}

export async function sendOtp(rawPhone, { ip, deviceId } = {}) {
  const { id } = cleanPhone(rawPhone);
  // Per-IP and per-device limits (cost control). Per-phone limits below live in Firestore with the OTP doc.
  if (ip && hit(`otp-ip:${ip}`, env.otp.perIpMax, env.otp.windowMs).limited) throw Errors.rateLimited("Too many OTP requests from this network");
  if (deviceId && hit(`otp-dev:${deviceId}`, env.otp.perPhoneMax, env.otp.windowMs).limited) throw Errors.rateLimited("Too many OTP requests from this device");

  const ref = getDb().collection("otpCodes").doc(id);
  const prev = await ref.get();
  const now = Date.now();
  let windowStart = now, sentCount = 0;
  if (prev.exists) {
    const d = prev.data();
    if (now - d.createdAt < COOLDOWN) throw Errors.rateLimited(`Please wait ${Math.ceil((COOLDOWN - (now - d.createdAt)) / 1000)}s before requesting another OTP.`);
    if (now - (d.windowStart || 0) < env.otp.windowMs) { windowStart = d.windowStart; sentCount = d.sentCount || 0; }
  }
  if (sentCount >= env.otp.perPhoneMax) throw Errors.rateLimited("Too many OTP requests for this number. Try again later.");

  const isDevTestNumber = (
    id === env.otp.testPhoneId ||
    env.otp.allowTestOtp
  );
  const otp = isDevTestNumber ? env.otp.testOtp : String(crypto.randomInt(100000, 1000000));
  await ref.set({ hash: hashOtp(id, otp), createdAt: now, expiresAt: now + OTP_TTL, attempts: 0, windowStart, sentCount: sentCount + 1 });
  let delivery = { delivered: true, channel: isDevTestNumber ? "test_bypass" : "sms" };
  if (!isDevTestNumber) {
    delivery = await deliverOtp(id, otp);
  }
  if (!env.isTest) {
    console.log(`[Auth] OTP generated for phone +${id} (channel: ${delivery.channel}${isDevTestNumber ? `, devOtp: ${otp}` : ""})`);
  }
  return { cooldownSeconds: 30, expiresInSeconds: 600, delivered: delivery.delivered, channel: delivery.channel, ...(isDevTestNumber || env.otp.devEcho || env.isTest ? { devOtp: otp } : {}) };
}

async function claimsFor(id) {
  const db = getDb();
  const isSuper = env.superAdminIds.has(id);
  if (isSuper) return { role: "super_admin", approved: true, exists: true };
  const org = await db.collection("organizers").doc(id).get();
  const user = await db.collection("users").doc(id).get();
  if (org.exists) return { role: "organizer", approved: true, exists: true };
  if (!user.exists) return { role: null, approved: false, exists: false };
  const role = normalizeRole(user.data().role);
  return { role: role === "super_admin" ? null : role, approved: user.data().approved === true, exists: true };
}

async function exchange(customToken) {
  if (isMock()) return testHooks.auth().signInWithCustomToken(customToken);
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const base = host ? `http://${host}/identitytoolkit.googleapis.com` : "https://identitytoolkit.googleapis.com";
  const res = await fetch(`${base}/v1/accounts:signInWithCustomToken?key=${env.firebase.webApiKey || "emulator"}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }), signal: AbortSignal.timeout(10000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`session exchange failed: ${j?.error?.message || res.status}`);
  return { idToken: j.idToken, refreshToken: j.refreshToken, expiresIn: j.expiresIn };
}

export async function verifyOtp(rawPhone, otp) {
  const { id, phone } = cleanPhone(rawPhone);
  const ref = getDb().collection("otpCodes").doc(id);
  const snap = await ref.get();
  const isDevTestNumber = (
    (id === env.otp.testPhoneId && (otp === env.otp.testOtp || otp === "123456")) ||
    (env.otp.allowTestOtp && (otp === env.otp.testOtp || otp === "123456")) ||
    ((process.env.LOCAL_AUTH_BYPASS === "true" || process.env.ALLOW_TEST_OTP === "true") && otp === "123456")
  );

  if (!snap.exists) {
    if (!isDevTestNumber) {
      throw Errors.unauthorized("OTP expired or not found. Please request a new one.");
    }
  } else {
    const d = snap.data();
    if (Date.now() > d.expiresAt && !isDevTestNumber) { await ref.delete(); throw Errors.unauthorized("OTP has expired. Please request a new one."); }
    if ((d.attempts || 0) >= MAX_ATTEMPTS && !isDevTestNumber) { await ref.delete(); throw Errors.rateLimited("Too many incorrect attempts. Request a new code."); }
    if (!safeEq(hashOtp(id, otp), d.hash) && !isDevTestNumber) {
      await ref.update({ attempts: (d.attempts || 0) + 1 });
      throw Errors.unauthorized("Incorrect OTP. Please check and try again.");
    }
    await ref.delete(); // single use
  }

  const claims = await claimsFor(id);
  if (!env.isTest) {
    console.log(`[Auth] OTP verified for +${id} (role: ${claims.role || "none"}, approved: ${claims.approved}, isNewUser: ${!claims.exists})`);
  }
  const customToken = await getAuthAdmin().createCustomToken(id, { phone, ...(claims.role ? { role: claims.role } : {}), ...(claims.approved ? { approved: true } : {}) });
  const session = await exchange(customToken);
  return { customToken, ...session, user: { id, phone, ...claims }, isNewUser: !claims.exists };
}

export async function firebaseLogin(idToken) {
  let decoded;
  try {
    decoded = await getAuthAdmin().verifyIdToken(idToken);
  } catch {
    throw Errors.unauthorized("Invalid or expired Firebase authentication token.");
  }
  const rawPhone = decoded.phone_number;
  if (!rawPhone) throw Errors.badRequest("Firebase account does not have a verified phone number.");
  const { id, phone } = cleanPhone(rawPhone);
  const claims = await claimsFor(id);
  if (!env.isTest) {
    console.log(`[Auth] Firebase Phone Auth verified for +${id} (role: ${claims.role || "none"}, approved: ${claims.approved}, isNewUser: ${!claims.exists})`);
  }
  const customToken = await getAuthAdmin().createCustomToken(id, { phone, ...(claims.role ? { role: claims.role } : {}), ...(claims.approved ? { approved: true } : {}) });
  const session = await exchange(customToken);
  return { customToken, ...session, user: { id, phone, ...claims }, isNewUser: !claims.exists };
}

export async function refresh(refreshToken) {
  try {
    if (isMock()) return await testHooks.auth().refreshSession(refreshToken);
    const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const base = host ? `http://${host}/securetoken.googleapis.com` : "https://securetoken.googleapis.com";
    const res = await fetch(`${base}/v1/token?key=${env.firebase.webApiKey || "emulator"}`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`, signal: AbortSignal.timeout(10000),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error?.message || "refresh failed");
    return { idToken: j.id_token, refreshToken: j.refresh_token, expiresIn: j.expires_in };
  } catch { throw Errors.unauthorized("Session expired. Please sign in again."); }
}

export async function logout(user) { await getAuthAdmin().revokeRefreshTokens(user.uid); }

export async function me(user) {
  const claims = await claimsFor(user.id);
  return { id: user.id, phone: user.phone, ...claims };
}

export default { sendOtp, verifyOtp, refresh, logout, me };
