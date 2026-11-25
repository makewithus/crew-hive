/**
 * In-memory sliding-window limiter.
 * shortcut: per-process memory — fine for a single instance; move to Redis/Firestore counters before scaling out.
 */
import { Errors } from "./error.middleware.js";
import env from "../config/env.js";

const hits = new Map();

export function hit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => t > now - windowMs);
  if (arr.length >= max) { hits.set(key, arr); return { limited: true, retryAfter: Math.ceil((arr[0] + windowMs - now) / 1000) }; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 10000) for (const [k, v] of hits) if (!v.some((t) => t > now - windowMs)) hits.delete(k);
  return { limited: false };
}

export const clearRateLimits = () => hits.clear();

export const createRateLimiter = ({ max = 100, windowMs = 60_000, name = "g", key } = {}) => (req, res, next) => {
  const k = `${name}:${key ? key(req) : req.user?.id || req.ip}`;
  const r = hit(k, max, windowMs);
  if (r.limited) { res.setHeader("Retry-After", r.retryAfter); return next(Errors.rateLimited(`Too many requests. Retry in ${r.retryAfter}s.`)); }
  next();
};

export const generalApiLimiter = createRateLimiter({ name: "api", max: env.rateLimit.apiMax, windowMs: 60_000 });
export const authLimiter = createRateLimiter({ name: "auth", max: env.rateLimit.authMax, windowMs: 15 * 60_000 });
export default { createRateLimiter, generalApiLimiter, authLimiter, hit, clearRateLimits };
