/**
 * /api/crew/profile
 * Profile retrieval and update with backend security and rate visibility enforcement.
 */

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

const phoneToDocId = (phone) => String(phone || "").replace(/\D/g, "");

async function verifyToken(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

function isDevBypass() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.LOCAL_AUTH_BYPASS === "true"
  );
}

// URL validator for portfolio links
function isValidUrl(string) {
  if (!string || typeof string !== "string") return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const docId = phoneToDocId(phone);
    const db = adminDb();
    const snap = await db.collection("crew").doc(docId).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Crew profile not found" }, { status: 404 });
    }

    const data = snap.data();
    const decoded = await verifyToken(req);
    const callerDigits = (decoded?.phone_number || decoded?.uid || "").replace(/\D/g, "");
    const isOwner = callerDigits === docId || isDevBypass();
    const isAdmin = decoded?.role === "admin" || decoded?.role === "super_admin";

    // BACKEND RATE VISIBILITY ENFORCEMENT
    // If rate is private (rateVisible === false) and requester is not owner/admin, hide rate!
    const sanitized = { ...data };
    if (!isOwner && !isAdmin && data.rateVisible === false) {
      delete sanitized.ratePerDay;
      sanitized.rateIsPrivate = true;
    }

    return NextResponse.json({ success: true, data: sanitized });
  } catch (err) {
    console.error("[/api/crew/profile GET] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone, updates } = body;

    if (!phone || !updates) {
      return NextResponse.json({ error: "Phone and updates required" }, { status: 400 });
    }

    const docId = phoneToDocId(phone);
    const decoded = await verifyToken(req);

    // Enforce ownership
    if (decoded && !isDevBypass()) {
      const callerDigits = (decoded.phone_number || decoded.uid || "").replace(/\D/g, "");
      const isAdmin = decoded.role === "admin" || decoded.role === "super_admin";
      if (!isAdmin && callerDigits && callerDigits !== docId) {
        return NextResponse.json({ error: "Forbidden: You cannot modify another user's profile." }, { status: 403 });
      }
    }

    const db = adminDb();
    const crewRef = db.collection("crew").doc(docId);
    const snap = await crewRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Crew profile not found" }, { status: 404 });
    }

    const existing = snap.data();
    const now = new Date().toISOString();

    // Sanitize and validate updates
    const sanitizedUpdates = {};

    if (updates.name !== undefined) sanitizedUpdates.name = String(updates.name).trim();
    if (updates.city !== undefined) sanitizedUpdates.city = String(updates.city).trim();
    if (updates.role !== undefined) sanitizedUpdates.role = updates.role;
    if (updates.roles !== undefined && Array.isArray(updates.roles)) sanitizedUpdates.roles = updates.roles;
    if (updates.specialisations !== undefined && Array.isArray(updates.specialisations)) {
      sanitizedUpdates.specialisations = updates.specialisations;
    }

    if (updates.profileImage !== undefined) {
      sanitizedUpdates.profileImage = String(updates.profileImage).trim();
    }

    if (updates.experience !== undefined) sanitizedUpdates.experience = String(updates.experience);
    if (updates.languages !== undefined && Array.isArray(updates.languages)) {
      sanitizedUpdates.languages = updates.languages;
    }

    // Day Rate & Visibility
    if (updates.ratePerDay !== undefined) {
      const parsedRate = Number(updates.ratePerDay);
      sanitizedUpdates.ratePerDay = isNaN(parsedRate) || parsedRate < 0 ? 0 : parsedRate;
    }
    if (updates.rateVisible !== undefined) {
      sanitizedUpdates.rateVisible = Boolean(updates.rateVisible);
    }

    // Portfolio Links with URL validation
    if (updates.portfolioLinks !== undefined) {
      const links = updates.portfolioLinks || {};
      const validLinks = {};
      if (links.instagram && isValidUrl(links.instagram)) validLinks.instagram = links.instagram.trim();
      if (links.youtube && isValidUrl(links.youtube)) validLinks.youtube = links.youtube.trim();
      if (links.drive && isValidUrl(links.drive)) validLinks.drive = links.drive.trim();
      sanitizedUpdates.portfolioLinks = validLinks;
      // also keep legacy portfolio field for backwards compatibility
      sanitizedUpdates.portfolio = validLinks.instagram || validLinks.youtube || validLinks.drive || "";
    }

    // Past Credits
    if (updates.pastCredits !== undefined && Array.isArray(updates.pastCredits)) {
      sanitizedUpdates.pastCredits = updates.pastCredits
        .filter((c) => c && c.eventName && String(c.eventName).trim())
        .map((c) => ({
          eventName: String(c.eventName).trim(),
          role: String(c.role || "").trim(),
          year: String(c.year || "").trim(),
        }));
    }

    // Equipment Owned
    if (updates.equipmentOwned !== undefined && Array.isArray(updates.equipmentOwned)) {
      sanitizedUpdates.equipmentOwned = updates.equipmentOwned
        .filter((e) => e && (e.name || e.category))
        .map((e) => ({
          name: String(e.name || "").trim(),
          category: String(e.category || "other").trim(),
          model: String(e.model || "").trim(),
        }));
    }

    // Travel Willingness
    if (updates.travelWillingness !== undefined) {
      sanitizedUpdates.travelWillingness = updates.travelWillingness;
    }

    // Association Membership - PREVENT UNVERIFIED BADGES
    if (updates.associationMembership !== undefined) {
      const existingAssoc = existing.associationMembership || {};
      sanitizedUpdates.associationMembership = {
        name: String(updates.associationMembership.name || "").trim(),
        // verified flag CANNOT be self-set; must preserve existing verification status
        verified: existingAssoc.verified === true,
        verifiedAt: existingAssoc.verifiedAt || null,
      };
    }

    sanitizedUpdates.updatedAt = now;

    // Save to Firestore
    await crewRef.update(sanitizedUpdates);

    // Mirror basic name/city to users collection doc
    if (sanitizedUpdates.name) {
      await db.collection("users").doc(docId).set(
        {
          name: sanitizedUpdates.name,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      data: { ...existing, ...sanitizedUpdates },
    });
  } catch (err) {
    console.error("[/api/crew/profile POST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
