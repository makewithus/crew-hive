/**
 * lib/feature-access.js — Centralized Feature Access and Subscription Configuration
 *
 * Implements Prompt 3 Section 14:
 * "Recruiters are free at launch. After a seven-day trial, advanced search,
 * shortlisting and pre-bookings are intended to become subscription features.
 * Implement the website integration with a single backend feature-access configuration.
 * Possible access tiers: Free, Trial, Paid."
 */

export const ACCESS_TIERS = {
  FREE: "free",
  TRIAL: "trial",
  PAID: "paid",
};

export const FEATURES = {
  BASIC_SEARCH: "basic_search",
  AVAILABILITY_REQUESTS: "availability_requests",
  CREW_CONTACT: "crew_contact",
  ADVANCED_FILTERS: "advanced_filters", // Languages, Experience, Rate range, Specialisation
  SHORTLISTS: "shortlists", // P1 Shortlisting
  SHOW_LISTS: "show_lists", // P1 Crew for this show
  PRE_BOOKINGS: "pre_bookings",
};

// Default platform launch policy
export const DEFAULT_FEATURE_CONFIG = {
  activeTier: ACCESS_TIERS.FREE, // Free at launch per specification
  trialDurationDays: 7,
  // Gating policy when TRIAL or PAID tier is activated
  gatedFeatures: [
    FEATURES.ADVANCED_FILTERS,
    FEATURES.SHORTLISTS,
    FEATURES.SHOW_LISTS,
    FEATURES.PRE_BOOKINGS,
  ],
  supportContact: "support@crewhive.in",
  inquiryWhatsapp: "+918139002826",
};

/**
 * Calculates trial days remaining given a user's registration or trial start date.
 */
export function calculateTrialDaysRemaining(createdAt, durationDays = 7) {
  if (!createdAt) return durationDays;
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, durationDays - diffDays);
}

/**
 * Checks whether a recruiter has access to a specific feature.
 *
 * @param {string} featureName - One of FEATURES.*
 * @param {object} recruiter - Recruiter user profile object
 * @param {object} customConfig - Optional override config
 * @returns {object} { allowed, tier, daysRemaining, reason }
 */
export function checkFeatureAccess(featureName, recruiter = {}, customConfig = {}) {
  const config = { ...DEFAULT_FEATURE_CONFIG, ...customConfig };
  const recruiterTier = recruiter?.subscriptionTier || config.activeTier;

  // 1. Paid users have access to everything
  if (recruiterTier === ACCESS_TIERS.PAID) {
    return {
      allowed: true,
      tier: ACCESS_TIERS.PAID,
      daysRemaining: null,
      reason: "Active subscription plan.",
    };
  }

  // 2. Free tier launch configuration:
  // If platform is in FREE launch mode, all features are operational without fake paywalls
  if (recruiterTier === ACCESS_TIERS.FREE) {
    const isGated = config.gatedFeatures.includes(featureName);
    // If config explicitly gates features during FREE mode:
    if (config.enforceGatingInFree && isGated) {
      return {
        allowed: false,
        tier: ACCESS_TIERS.FREE,
        daysRemaining: 0,
        reason: "This advanced feature requires a Pro subscription or active trial.",
      };
    }
    return {
      allowed: true,
      tier: ACCESS_TIERS.FREE,
      daysRemaining: null,
      reason: "Free launch access active.",
    };
  }

  // 3. Trial tier:
  if (recruiterTier === ACCESS_TIERS.TRIAL) {
    const trialStart = recruiter?.trialStartedAt || recruiter?.createdAt;
    const daysRemaining = calculateTrialDaysRemaining(trialStart, config.trialDurationDays);

    if (daysRemaining > 0) {
      return {
        allowed: true,
        tier: ACCESS_TIERS.TRIAL,
        daysRemaining,
        reason: `Active trial: ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining.`,
      };
    }

    // Trial has expired
    const isGated = config.gatedFeatures.includes(featureName);
    if (isGated) {
      return {
        allowed: false,
        tier: ACCESS_TIERS.TRIAL,
        daysRemaining: 0,
        reason: "Your 7-day trial has concluded. Inquire with CrewHive to upgrade.",
      };
    }

    return {
      allowed: true,
      tier: ACCESS_TIERS.TRIAL,
      daysRemaining: 0,
      reason: "Core search and requests remain accessible.",
    };
  }

  return {
    allowed: true,
    tier: ACCESS_TIERS.FREE,
    daysRemaining: null,
    reason: "Standard access.",
  };
}

