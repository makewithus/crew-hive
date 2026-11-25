/** Centralized error handler: canonical envelope, never leaks stack traces or internals. */
import env from "../config/env.js";

export class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  badRequest: (m, d) => new ApiError(400, "VALIDATION_ERROR", m, d),
  unauthorized: (m = "Authentication required") => new ApiError(401, "UNAUTHORIZED", m),
  forbidden: (m = "You do not have permission to perform this action") => new ApiError(403, "FORBIDDEN", m),
  notFound: (m = "Resource not found") => new ApiError(404, "NOT_FOUND", m),
  conflict: (m) => new ApiError(409, "CONFLICT", m),
  gone: (m) => new ApiError(410, "EXPIRED", m),
  unprocessable: (m, d) => new ApiError(422, "BUSINESS_RULE_VIOLATION", m, d),
  rateLimited: (m = "Too many requests") => new ApiError(429, "RATE_LIMITED", m),
};

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `Endpoint ${req.method} ${req.path} not found` } });
}

export function errorHandler(err, req, res, next) {
  if (err?.type === "entity.parse.failed") err = Errors.badRequest("Malformed JSON body");
  if (err?.type === "entity.too.large") err = new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body too large");
  const known = err instanceof ApiError;
  const status = known ? err.statusCode : 500;
  if (!env.isTest) {
    if (!known) {
      console.error(`[API ERROR 500] ${req.method} ${req.path}:`, env.isProduction ? err.message : err);
    } else if (status >= 400) {
      console.warn(`[API ${status} ${err.code}] ${req.method} ${req.path}: ${err.message}`);
    }
  }
  res.status(status).json({
    success: false,
    error: {
      code: known ? err.code : "INTERNAL_ERROR",
      message: known ? err.message : "An unexpected error occurred",
      details: known ? err.details || undefined : undefined,
    },
  });
}

export default { ApiError, Errors, notFoundHandler, errorHandler };
