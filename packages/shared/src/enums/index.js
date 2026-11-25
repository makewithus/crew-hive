/**
 * CrewHive Shared Enums
 * Universal state definitions and enumerations across Web, Mobile, and API.
 */

export const UserRole = {
  CREW: "crew",
  RECRUITER: "recruiter",
  ORGANIZER: "organizer",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

export const AvailabilityStatus = {
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  PAUSED: "paused",
  BOOKED: "booked",
};

export const RequestStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
};

export const MembershipStatus = {
  NONE: "none",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

export const FeatureTier = {
  FREE: "free",
  STANDARD: "standard",
  PRO: "pro",
  ENTERPRISE: "enterprise",
};

export const Language = {
  EN: "en",
  ML: "ml",
};

export default {
  UserRole,
  AvailabilityStatus,
  RequestStatus,
  MembershipStatus,
  FeatureTier,
  Language,
};

