import { Errors } from "./error.middleware.js";

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(Errors.unauthorized());
  if (req.user.isSuperAdmin || roles.includes(req.user.role)) return next();
  next(Errors.forbidden());
};
export const requireAdmin = (req, res, next) =>
  !req.user ? next(Errors.unauthorized()) : req.user.isAdmin ? next() : next(Errors.forbidden("Admin privileges required"));
export const requireSuperAdmin = (req, res, next) =>
  !req.user ? next(Errors.unauthorized()) : req.user.isSuperAdmin ? next() : next(Errors.forbidden("Super-admin privileges required"));

/** Ownership guard: :param must equal the caller's id (admins bypass). */
export const requireOwnership = (param = "id") => (req, res, next) => {
  if (!req.user) return next(Errors.unauthorized());
  const target = String(req.params[param] || "").replace(/\D/g, "");
  if (req.user.isAdmin || target === req.user.id) return next();
  next(Errors.forbidden("You can only access your own records"));
};

export default { requireRole, requireAdmin, requireSuperAdmin, requireOwnership };
