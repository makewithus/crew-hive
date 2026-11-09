/**
 * lib/server-auth.js — Server-side RBAC and Token Verification
 *
 * Enforces role-based access control across all API routes.
 */

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const phoneToDocId = (phone) => String(phone || "").replace(/\D/g, "");

export const buildSuperAdminIds = () => {
  const ids = new Set();
  if (process.env.SUPER_ADMIN_PHONE) {
    ids.add(phoneToDocId(process.env.SUPER_ADMIN_PHONE));
  }
  if (process.env.ADMIN_PHONES) {
    process.env.ADMIN_PHONES.split(",").forEach((p) => {
      const d = phoneToDocId(p.trim());
      if (d) ids.add(d);
    });
  }
  if (process.env.NEXT_PUBLIC_ADMIN_PHONES) {
    process.env.NEXT_PUBLIC_ADMIN_PHONES.split(",").forEach((p) => {
      const d = phoneToDocId(p.trim());
      if (d) ids.add(d);
    });
  }
  return ids;
};

export const isDevBypass = () => {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.LOCAL_AUTH_BYPASS === "true"
  );
};

/**
 * Extracts and verifies the bearer token from request headers.
 * Returns { user, decoded, isAdmin, isSuperAdmin, phone, docId } or null.
 */
export async function authenticateRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // If in dev bypass and no token provided, check x-dev-phone header if available
  if (!token && isDevBypass()) {
    const devPhone = request.headers.get("x-dev-phone") || request.headers.get("x-user-phone");
    if (devPhone) {
      const docId = phoneToDocId(devPhone);
      const superAdminIds = buildSuperAdminIds();
      const isSuperAdmin = superAdminIds.has(docId);
      return {
        uid: docId,
        phone: `+${docId}`,
        docId,
        role: isSuperAdmin ? "super_admin" : "organizer",
        isAdmin: isSuperAdmin,
        isSuperAdmin,
        isDev: true,
      };
    }
  }

  if (!token) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    const rawPhone = decoded.phone_number || decoded.phone || "";
    const docId = phoneToDocId(rawPhone || decoded.uid);
    const superAdminIds = buildSuperAdminIds();

    const isSuperAdmin =
      decoded.role === "super_admin" || (docId && superAdminIds.has(docId));
    const isAdmin = isSuperAdmin || decoded.role === "admin";

    return {
      uid: decoded.uid,
      decoded,
      phone: rawPhone || (docId ? `+${docId}` : null),
      docId,
      role: decoded.role || (isSuperAdmin ? "super_admin" : null),
      isAdmin,
      isSuperAdmin,
    };
  } catch (err) {
    // If dev bypass is active and token verification fails (e.g. mock token), check dev bypass
    if (isDevBypass()) {
      const fallbackPhone = request.headers.get("x-dev-phone") || "919876543210";
      const docId = phoneToDocId(fallbackPhone);
      return {
        uid: docId,
        phone: `+${docId}`,
        docId,
        role: "organizer",
        isAdmin: buildSuperAdminIds().has(docId),
        isSuperAdmin: buildSuperAdminIds().has(docId),
        isDev: true,
      };
    }
    return null;
  }
}

