/**
 * CrewHive Shared Constants
 * Core application constants, branding tokens, and operational thresholds.
 */

export const APP_NAME = "CrewHive";
export const APP_TAGLINE_EN = "Kerala's AV and events crew, in one place.";
export const APP_TAGLINE_ML = "കേരളത്തിലെ AV, ഇവന്റ് ക്രൂ ഒരു കുടക്കീഴിൽ.";

export const COLORS = {
  PRIMARY: "#F5A623",      // Tungsten Gold / Amber
  PRIMARY_HOVER: "#D9822B",
  SECONDARY: "#0D0D0D",    // Dark Titanium
  BACKGROUND: "#050505",   // Charcoal Black
  SURFACE: "#121212",      // Card Surface
  BORDER: "#27272A",       // Zinc 800
  TEXT: "#F4F4F5",         // Zinc 100
  MUTED: "#A1A1AA",        // Zinc 400
  SUCCESS: "#10B981",      // Emerald
  ERROR: "#EF4444",        // Rose Red
  WARNING: "#F59E0B",      // Amber
  INFO: "#3B82F6",         // Blue
  AVAILABLE: "#10B981",
  UNAVAILABLE: "#EF4444",
};

export const TIME_LIMITS = {
  OTP_EXPIRY_SECONDS: 600,             // 10 minutes
  OTP_RESEND_DEBOUNCE_SECONDS: 30,     // 30 seconds debounce
  AVAILABILITY_EXPIRY_DAYS: 7,         // 7 days auto-expiry
  REQUEST_EXPIRY_HOURS: 2,             // 2 hours response window
  MAX_DAILY_PINGS_PER_CREW: 3,         // Max 3 outreach pings per crew per 24h
};

export const PAGINATION = {
  BOOKING_PAGE_SIZE: 10,
  CREW_SEARCH_PAGE_SIZE: 20,
  ADMIN_REPORTS_PAGE_SIZE: 50,
};

export const EXPERIENCE_LEVELS = [
  "0–2 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
];

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "ml", label: "Malayalam", nativeName: "മലയാളം" },
];

export const CURRENT_CONSENT_VERSION = "1.0";

export const CONSENT_ITEMS = [
  {
    id: "terms",
    required: true,
    labelEn: "I agree to the Terms of Service and Platform Rules",
    labelMl: "സേവന നിബന്ധനകളും പ്ലാറ്റ്ഫോം നിയമങ്ങളും ഞാൻ അംഗീകരിക്കുന്നു",
  },
  {
    id: "privacy",
    required: true,
    labelEn: "I agree to the Privacy Policy and DPDP Act Data Processing",
    labelMl: "സ്വകാര്യതാ നയവും ഡിജിറ്റൽ വ്യക്തിഗത വിവര സംരക്ഷണ ചട്ടങ്ങളും ഞാൻ അംഗീകരിക്കുന്നു",
  },
  {
    id: "location",
    required: true,
    labelEn: "I consent to coarse location sharing when actively marked available",
    labelMl: "ലഭ്യത രേഖപ്പെടുത്തുമ്പോൾ ജില്ല/മേഖല പങ്കിടാൻ ഞാൻ സമ്മതിക്കുന്നു",
  },
  {
    id: "notifications",
    required: true,
    labelEn: "I agree to receive booking pings via WhatsApp and SMS",
    labelMl: "വാട്സാപ്പ്, എസ്.എം.എസ് വഴി ബുക്കിംഗ് സന്ദേശങ്ങൾ ലഭിക്കാൻ ഞാൻ സമ്മതിക്കുന്നു",
  },
];

export default {
  APP_NAME,
  APP_TAGLINE_EN,
  APP_TAGLINE_ML,
  COLORS,
  TIME_LIMITS,
  PAGINATION,
  EXPERIENCE_LEVELS,
  SUPPORTED_LANGUAGES,
  CURRENT_CONSENT_VERSION,
  CONSENT_ITEMS,
};

