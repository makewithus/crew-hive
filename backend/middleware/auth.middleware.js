/**
 * backend/middleware/auth.middleware.js
 * The ONLY authentication path: a Firebase ID token in `Authorization: Bearer`.
 * Role/approval are read server-side from `users/{id}`; clients can never assert their own role.
 */

import { getAuthAdmin, getDb } from "../config/firebase.js";
import env from "../config/env.js";
import { Errors } from "./error.middleware.js";

const digits = (v) => String(v || "").replace(/\D/g, "");

export function normalizeRole(role) {
  if (role === "employer" || role === "recruiter") return "organizer";
  return role || null;
}

async function resolve(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
  if (!m) return null;
  let decoded;
  try {
    decoded = await getAuthAdmin().verifyIdToken(m[1].trim(), true); // checkRevoked → deleted/revoked users are rejected
  } catch {
    throw Errors.unauthorized("Invalid or expired session");
  }
  const id = digits(decoded.phone_number || decoded.phone || decoded.uid);
  if (!id) throw Errors.unauthorized("Invalid session");
  const snap = await getDb().collection("users").doc(id).get();
  const doc = snap.exists ? snap.data() : {};
  const isSuperAdmin = env.superAdminIds.has(id);
  let role = isSuperAdmin ? "super_admin" : normalizeRole(doc.role);
  if (role === "super_admin" && !isSuperAdmin) role = null; // stored super_admin without env backing is ignored
  const org = role === "organizer";
  return {
    uid: decoded.uid,
    id,
    phone: `+${id}`,
    role,
    approved: isSuperAdmin || org || doc.approved === true,
    isSuperAdmin,
    isAdmin: isSuperAdmin || role === "admin",
    exists: snap.exists,
  };
}

export async function authenticateRequest(req, res, next) {
  try {
    const user = await resolve(req);
    if (!user) throw Errors.unauthorized("Missing authentication token");
    req.user = user;
    next();
  } catch (err) { next(err); }
}

export async function optionalAuthenticate(req, res, next) {
  try { req.user = (await resolve(req)) || null; } catch { req.user = null; }
  next();
}

export default { authenticateRequest, optionalAuthenticate, normalizeRole };
