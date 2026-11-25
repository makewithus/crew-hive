/**
 * apps/mobile/src/services/taxonomyService.js
 * Mobile API client for fetching live professional role taxonomy and Kerala geographic data
 * with offline-first fallback to @crew-hive/shared.
 */

import { api } from "./api.js";
import {
  PARENT_ROLES,
  LAUNCH_CITIES,
  KERALA_DISTRICTS,
  getParentRoleById,
  findRoleOrSpecialisation,
  getSpecialisationById,
} from "@crew-hive/shared";

/**
 * Normalizes a single role object so all UI components reliably have:
 * .id (clean string identifier)
 * .name (localized or English)
 * .nameEn (English name)
 * .nameMl (Malayalam name)
 * .specialisations (array)
 * .subroles (alias to specialisations)
 * .subroleCount (number of specialisations)
 */
export function normalizeRole(role, language = "en") {
  if (!role) return null;

  // Handle case where role is a plain string identifier (e.g. "lighting" or "sound")
  if (typeof role === "string") {
    const found = getParentRoleById(role) || findRoleOrSpecialisation(role, language);
    if (found) {
      const base = found.role || found;
      return normalizeRole(base, language);
    }
    return {
      id: role.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      name: role,
      nameEn: role,
      nameMl: role,
      specialisations: [],
      subroles: [],
      subroleCount: 0,
    };
  }

  // Handle object representation
  const rawId = role.id || role.roleId || role.slug || role.value || "";
  const found = getParentRoleById(rawId) || findRoleOrSpecialisation(rawId, language)?.role;

  const id = rawId || found?.id || "role";
  const nameEn = role.nameEn || role.name || found?.nameEn || found?.name || "Specialist";
  const nameMl = role.nameMl || found?.nameMl || nameEn;
  const localizedName = language === "ml" ? nameMl : nameEn;

  const rawSpecs =
    (Array.isArray(role.specialisations) && role.specialisations.length > 0
      ? role.specialisations
      : Array.isArray(role.subroles) && role.subroles.length > 0
      ? role.subroles
      : found?.specialisations) || [];

  const normalizedSpecs = rawSpecs.map((s) => {
    if (typeof s === "string") {
      const specFound = getSpecialisationById(s);
      return {
        id: s,
        parentRole: id,
        name: language === "ml" ? (specFound?.nameMl || s) : (specFound?.nameEn || s),
        nameEn: specFound?.nameEn || s,
        nameMl: specFound?.nameMl || s,
      };
    }
    return {
      ...s,
      parentRole: s.parentRole || id,
      name: language === "ml" ? (s.nameMl || s.name || s.nameEn) : (s.nameEn || s.name || s.nameMl),
      nameEn: s.nameEn || s.name,
      nameMl: s.nameMl || s.name || s.nameEn,
    };
  });

  return {
    ...role,
    id,
    name: localizedName,
    nameEn,
    nameMl,
    specialisations: normalizedSpecs,
    subroles: normalizedSpecs,
    subroleCount: normalizedSpecs.length,
  };
}

export function normalizeRoles(rolesList, language = "en") {
  const source = Array.isArray(rolesList) && rolesList.length > 0 ? rolesList : PARENT_ROLES;
  return source.map((r) => normalizeRole(r, language)).filter(Boolean);
}

export class TaxonomyService {
  async getRoles(language = "en") {
    try {
      const res = await api.get("/taxonomy/roles", { auth: false, cache: true });
      const rawRoles = res.items;
      if (Array.isArray(rawRoles) && rawRoles.length > 0) {
        return normalizeRoles(rawRoles, language);
      }
    } catch (err) {
      console.warn("[TaxonomyService] Failed to fetch live roles, using shared fallback:", err.message);
    }
    return normalizeRoles(PARENT_ROLES, language);
  }

  async getCities() {
    try {
      const res = await api.get("/taxonomy/cities", { auth: false, cache: true });
      const launch = res.launchCities;
      const districts = res.districts;
      return {
        launchCities: Array.isArray(launch) && launch.length > 0 ? launch : LAUNCH_CITIES,
        districts: Array.isArray(districts) && districts.length > 0 ? districts : KERALA_DISTRICTS,
      };
    } catch (err) {
      console.warn("[TaxonomyService] Failed to fetch live cities, using shared fallback:", err.message);
      return {
        launchCities: LAUNCH_CITIES,
        districts: KERALA_DISTRICTS,
      };
    }
  }
}

export const taxonomyService = new TaxonomyService();
export default taxonomyService;

