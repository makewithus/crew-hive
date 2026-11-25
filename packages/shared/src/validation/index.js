/**
 * CrewHive Shared Validation Logic
 * Universal validation schemas and sanitizers running across Web, Mobile, and API.
 */

import { isValidKeralaDistrict } from "../cities/index.js";
import { PARENT_ROLES, getAllSpecialisationIds } from "../role-taxonomy/index.js";

/**
 * Normalizes any Indian phone representation into strict E.164 format (+91XXXXXXXXXX).
 */
export function normalizeIndianPhone(input) {
  if (!input) return "";
  let digits = String(input).replace(/[^\d+]/g, "");

  if (digits.startsWith("+91")) {
    digits = "+91" + digits.slice(3).replace(/\D/g, "");
  } else if (digits.startsWith("91") && digits.length === 12) {
    digits = "+91" + digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = "+91" + digits.slice(1);
  } else if (digits.length === 10) {
    digits = "+91" + digits;
  }

  return digits;
}

/**
 * Validates whether a phone number matches Indian mobile format (+91 followed by 6-9 and 9 digits).
 */
export function isValidIndianPhone(phone) {
  const normalized = normalizeIndianPhone(phone);
  return /^\+91[6-9]\d{9}$/.test(normalized);
}

/**
 * Validates a 6-digit numeric OTP.
 */
export function isValidOtp(otp) {
  if (!otp) return false;
  return /^\d{6}$/.test(String(otp).trim());
}

/**
 * Validates a technician/user full name (2 to 80 chars, letters, spaces, dots).
 */
export function isValidName(name) {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 80;
}

/**
 * Validates selected roles/specialisations.
 */
export function isValidRoleSelection(roles) {
  if (!roles) return false;
  const list = Array.isArray(roles) ? roles : [roles];
  if (list.length === 0) return false;

  const validParentIds = PARENT_ROLES.map((r) => r.id);
  const validSpecIds = getAllSpecialisationIds();
  const allIds = new Set([...validParentIds, ...validSpecIds]);

  return list.every((item) => {
    const id = typeof item === "string" ? item : item?.id;
    return id && allIds.has(id.toLowerCase());
  });
}

/**
 * Validates city / district.
 */
export function isValidCity(city) {
  if (!city) return false;
  return isValidKeralaDistrict(city);
}

/**
 * Validates external portfolio/work URL.
 */
export function isValidPortfolioUrl(url) {
  if (!url) return true; // Optional field
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Comprehensive profile validator.
 */
export function validateProfile(data) {
  const errors = {};

  if (!data?.name || !isValidName(data.name)) {
    errors.name = "Full name is required (minimum 2 characters)";
  }

  if (!data?.phone || !isValidIndianPhone(data.phone)) {
    errors.phone = "Valid 10-digit Indian phone number is required";
  }

  if (!data?.primaryRole && (!data?.roles || data.roles.length === 0)) {
    errors.roles = "At least one professional role must be selected";
  }

  if (!data?.city || !isValidCity(data.city)) {
    errors.city = "Valid Kerala launch city or district is required";
  }

  if (data?.portfolio && !isValidPortfolioUrl(data.portfolio)) {
    errors.portfolio = "Portfolio must be a valid HTTP or HTTPS URL";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export default {
  normalizeIndianPhone,
  isValidIndianPhone,
  isValidOtp,
  isValidName,
  isValidRoleSelection,
  isValidCity,
  isValidPortfolioUrl,
  validateProfile,
};

