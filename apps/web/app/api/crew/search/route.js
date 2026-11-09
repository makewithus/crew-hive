/**
 * /api/crew/search
 * Server-side Crew Search API
 *
 * Implements Prompt 3 Sections 5, 6, 7:
 * - Parent role and specialisation matching using backend taxonomy
 * - City / district filtering
 * - Available Now filtering (enforces available:true, excludes busy & auto-expired)
 * - Excludes hidden profiles (admin moderation)
 * - Sanitizes public fields (strips coordinates, hides private day rates, removes moderation notes)
 * - Pagination / incremental loading
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { PARENT_ROLES, CITIES } from "@/utils/taxonomy";
import { checkFeatureAccess, FEATURES } from "@/lib/feature-access";

const normalizeStr = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Helper to resolve parent role and its specialisations
function getRoleMatches(roleQuery, taxonomyRoles) {
  if (!roleQuery) return null;
  const qNorm = normalizeStr(roleQuery);

  for (const pr of taxonomyRoles) {
    if (
      normalizeStr(pr.id) === qNorm ||
      normalizeStr(pr.nameEn) === qNorm ||
      (normalizeStr(pr.nameMl) && normalizeStr(pr.nameMl) === qNorm)
    ) {
      const specIds = (pr.specialisations || []).map((s) => normalizeStr(s.id));
      const specNamesEn = (pr.specialisations || []).map((s) => normalizeStr(s.nameEn));
      const specNamesMl = (pr.specialisations || []).map((s) => normalizeStr(s.nameMl));
      const rawIdentifiers = [
        normalizeStr(pr.id),
        normalizeStr(pr.nameEn),
        normalizeStr(pr.nameMl),
        ...specIds,
        ...specNamesEn,
        ...specNamesMl,
      ];
      return {
        parentRole: pr,
        allIdentifiers: rawIdentifiers.filter((id) => id && id.length >= 2),
      };
    }
  }

  return { parentRole: null, allIdentifiers: [qNorm].filter((id) => id && id.length >= 2) };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "";
    const specialisation = searchParams.get("specialisation") || "";
    const city = searchParams.get("city") || "";
    const available = searchParams.get("available") === "true" || searchParams.get("available") === "1";
    const language = searchParams.get("language") || "";
    const experience = searchParams.get("experience") || "";
    const minRate = searchParams.get("minRate") ? Number(searchParams.get("minRate")) : null;
    const maxRate = searchParams.get("maxRate") ? Number(searchParams.get("maxRate")) : null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const db = adminDb();

    // 1. Fetch live taxonomy roles from settings or fallback
    let taxonomyRoles = PARENT_ROLES;
    try {
      const snap = await db.collection("settings").doc("roles").get();
      if (snap.exists && Array.isArray(snap.data()?.roles)) {
        taxonomyRoles = snap.data().roles;
      }
    } catch (_) {}

    // 2. Fetch approved crew
    const crewSnap = await db
      .collection("crew")
      .where("status", "==", "approved")
      .get();

    const now = new Date();
    const roleMatchInfo = getRoleMatches(role, taxonomyRoles);
    const specNorm = normalizeStr(specialisation);
    const cityNorm = normalizeStr(city);

    let results = [];

    for (const doc of crewSnap.docs) {
      const data = doc.data();

      // Rule: Exclude hidden profiles (admin moderation)
      if (data.hidden === true) continue;

      // Available Now Enforcement
      if (available) {
        if (!data.available) continue;
        if (data.availabilityStatus === "expired" || data.availabilityStatus === "unavailable") {
          continue;
        }
        // Auto-expiration check (e.g. 7-day window)
        if (data.availableUntil) {
          const expDate = new Date(data.availableUntil);
          if (!isNaN(expDate.getTime()) && expDate < now) {
            continue;
          }
        }
      }

      // Role Filter (Parent role + specialisations)
      if (roleMatchInfo) {
        const crewRoleNorm = normalizeStr(data.role || data.crewRole);
        const crewRolesList = Array.isArray(data.roles)
          ? data.roles.map(normalizeStr)
          : [];
        const crewSpecsList = Array.isArray(data.specialisations)
          ? data.specialisations.map(normalizeStr)
          : [];

        const matchesRole =
          roleMatchInfo.allIdentifiers.some((id) =>
            crewRoleNorm.includes(id) || (crewRoleNorm.length >= 3 && id.includes(crewRoleNorm))
          ) ||
          roleMatchInfo.allIdentifiers.some((id) =>
            crewRolesList.some((r) => r.includes(id) || (r.length >= 3 && id.includes(r)))
          ) ||
          roleMatchInfo.allIdentifiers.some((id) =>
            crewSpecsList.some((s) => s.includes(id) || (s.length >= 3 && id.includes(s)))
          );

        if (!matchesRole) continue;
      }

      // Specialisation Filter
      if (specNorm) {
        const crewRoleNorm = normalizeStr(data.role || data.crewRole);
        const crewSpecs = Array.isArray(data.specialisations)
          ? data.specialisations.map(normalizeStr)
          : [normalizeStr(data.specialisation)];

        const matchesSpec =
          crewRoleNorm.includes(specNorm) ||
          crewSpecs.some((s) => s && (s.includes(specNorm) || specNorm.includes(s)));

        if (!matchesSpec) continue;
      }

      // City / District Filter
      if (cityNorm) {
        const crewCity = normalizeStr(data.city);
        const crewDistrict = normalizeStr(data.district);
        const travelRange = normalizeStr(data.travelRange);

        const matchesCity =
          crewCity.includes(cityNorm) ||
          cityNorm.includes(crewCity) ||
          crewDistrict.includes(cityNorm) ||
          travelRange === "kerala";

        if (!matchesCity) continue;
      }

      // Advanced Filter: Experience
      if (experience) {
        const expNorm = normalizeStr(experience);
        const crewExpNorm = normalizeStr(data.experience);
        if (!crewExpNorm.includes(expNorm) && !expNorm.includes(crewExpNorm)) {
          continue;
        }
      }

      // Advanced Filter: Language
      if (language) {
        const langNorm = normalizeStr(language);
        const crewLangs = Array.isArray(data.languages)
          ? data.languages.map(normalizeStr)
          : [normalizeStr(data.languages)];
        if (!crewLangs.some((l) => l.includes(langNorm) || langNorm.includes(l))) {
          continue;
        }
      }

      // Advanced Filter: Day Rate
      if (minRate !== null || maxRate !== null) {
        const rate = Number(data.ratePerDay);
        if (!rate || isNaN(rate)) continue;
        if (minRate !== null && rate < minRate) continue;
        if (maxRate !== null && rate > maxRate) continue;
      }

      // Sanitize fields for recruiter visibility
      const isRatePublic =
        data.showRate !== false &&
        data.rateVisibility !== "private" &&
        data.ratePerDay != null &&
        data.ratePerDay !== "";

      const sanitized = {
        id: doc.id,
        phone: data.phone || `+${doc.id}`,
        name: data.name || "Crew Member",
        role: data.role || data.crewRole || "Technician",
        specialisations: data.specialisations || (data.specialisation ? [data.specialisation] : []),
        city: data.city || "Kerala",
        district: data.district || data.city || "Kerala",
        experience: data.experience || null,
        bio: data.bio || null,
        profileImage: data.profileImage || null,
        available: Boolean(data.available),
        availableUntil: data.availableUntil || null,
        ratePerDay: isRatePublic ? Number(data.ratePerDay) : null,
        rateVisibility: isRatePublic ? "public" : "private",
        travelRange: data.travelRange || null,
        languages: data.languages || [],
        associationMember: Boolean(data.associationMember || data.isAssociationVerified),
        associationName: data.associationName || null,
        createdAt: data.createdAt || null,
      };

      results.push(sanitized);
    }

    // Sort: available crew first, then by completeness / recent update
    results.sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    const total = results.length;
    const startIndex = (page - 1) * limit;
    const paginated = results.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: startIndex + limit < total,
      },
    });
  } catch (err) {
    console.error("[/api/crew/search] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
