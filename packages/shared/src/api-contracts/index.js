/**
 * CrewHive Shared API Contracts
 * Canonical request/response contracts and error payload interfaces.
 */

export const ApiErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
};

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function createSuccessResponse(data, message = "Success") {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(errorCode, message, details = null) {
  return {
    success: false,
    error: {
      code: errorCode,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

export const API_ENDPOINTS = {
  AUTH: {
    SEND_OTP: "/api/auth/send-otp",
    VERIFY_OTP: "/api/auth/verify-otp",
    SIGNUP: "/api/auth/signup",
  },
  CREW: {
    PROFILE: "/api/crew/profile",
    AVAILABILITY: "/api/crew/availability",
    REQUESTS: "/api/crew/requests",
    SEARCH: "/api/crew/search",
  },
  RECRUITER: {
    REQUESTS_CREATE: "/api/requests/create",
    REQUESTS_RESPOND: "/api/requests/respond",
    SHORTLIST: "/api/recruiter/shortlist",
    SHOWS: "/api/recruiter/shows",
  },
  ADMIN: {
    STATS: "/api/admin/stats",
    USERS: "/api/admin/users",
    ASSOCIATIONS: "/api/admin/associations",
    METRICS: "/api/admin/metrics",
  },
  WEBHOOK: {
    WHATSAPP: "/api/whatsapp/webhook",
  },
};

export default {
  ApiErrorCode,
  HttpStatus,
  createSuccessResponse,
  createErrorResponse,
  API_ENDPOINTS,
};

