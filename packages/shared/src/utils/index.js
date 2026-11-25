/**
 * CrewHive Shared Utility Functions
 * Pure business logic calculation and display formatting helpers.
 */

import { normalizeIndianPhone } from "../validation/index.js";

/**
 * Weighted Profile Completeness Calculation Engine
 * 50% for core 30-second onboarding fields, 50% for optional rich fields.
 */
export const PROFILE_COMPLETENESS_WEIGHTS = {
  name: 15,
  phone: 15,
  role: 10,
  city: 10,
  specialisations: 10,
  experience: 10,
  dayRate: 10,
  equipment: 10,
  portfolio: 10,
};

export function calculateProfileCompleteness(profile) {
  if (!profile) return 0;
  let score = 0;

  if (profile.name && profile.name.trim().length >= 2) score += PROFILE_COMPLETENESS_WEIGHTS.name;
  if (profile.phone && profile.phone.trim().length >= 10) score += PROFILE_COMPLETENESS_WEIGHTS.phone;
  if (profile.role || profile.primaryRole || (profile.roles && profile.roles.length > 0)) {
    score += PROFILE_COMPLETENESS_WEIGHTS.role;
  }
  if (profile.city && profile.city.trim().length >= 2) score += PROFILE_COMPLETENESS_WEIGHTS.city;

  if (profile.specialisations && profile.specialisations.length > 0) {
    score += PROFILE_COMPLETENESS_WEIGHTS.specialisations;
  }
  if (profile.experience && profile.experience.trim().length > 0) {
    score += PROFILE_COMPLETENESS_WEIGHTS.experience;
  }
  if ((profile.dayRate !== undefined && profile.dayRate !== null && profile.dayRate > 0) ||
      (profile.ratePerDay !== undefined && profile.ratePerDay !== null && profile.ratePerDay > 0)) {
    score += PROFILE_COMPLETENESS_WEIGHTS.dayRate;
  }
  if (profile.equipment && profile.equipment.length > 0) {
    score += PROFILE_COMPLETENESS_WEIGHTS.equipment;
  }
  if ((profile.portfolio && profile.portfolio.trim().length > 0) ||
      (profile.portfolioLinks && Object.values(profile.portfolioLinks).some((v) => !!v))) {
    score += PROFILE_COMPLETENESS_WEIGHTS.portfolio;
  }

  return Math.min(score, 100);
}

export const computeProfileCompleteness = calculateProfileCompleteness;

/**
 * Deterministically turns an E.164 phone number into a safe Firestore document ID.
 * Ensures Web and WhatsApp share the exact same user identity.
 */
export function phoneToDocId(phone) {
  // Canonical id = digits only (e.g. "919876543210"), identical to the existing web/production documents.
  const normalized = normalizeIndianPhone(phone);
  return String(normalized || phone || "").replace(/\D/g, "");
}

/**
 * Currency formatter for Day Rates (INR ₹).
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Clean phone number display formatter (+91 98460 12345).
 */
export function formatPhoneDisplay(phone) {
  const norm = normalizeIndianPhone(phone);
  if (norm.length === 13 && norm.startsWith("+91")) {
    return `+91 ${norm.slice(3, 8)} ${norm.slice(8)}`;
  }
  return phone || "";
}

export default {
  PROFILE_COMPLETENESS_WEIGHTS,
  calculateProfileCompleteness,
  phoneToDocId,
  formatCurrency,
  formatPhoneDisplay,
};

