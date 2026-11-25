/** All /api/v1 routes in one place (thin controllers → services). */
import { Router } from "express";
import { schemas } from "@crew-hive/shared";
import authRoutes from "./auth.routes.js";
import { authenticateRequest, optionalAuthenticate } from "../middleware/auth.middleware.js";
import { requireRole, requireAdmin, requireSuperAdmin } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createRateLimiter } from "../middleware/rate-limiter.middleware.js";
import { Errors } from "../middleware/error.middleware.js";
import * as crew from "../services/crew.service.js";
import * as rec from "../services/recruiter.service.js";
import * as reqs from "../services/request.service.js";
import * as admin from "../services/admin.service.js";
import * as reports from "../services/report.service.js";
import * as notif from "../services/notification.service.js";
import * as feature from "../services/feature.service.js";
import * as account from "../services/account.service.js";
import * as prebooking from "../services/prebooking.service.js";
import { getDb } from "../config/firebase.js";
import { whatsappRouter } from "./whatsapp.routes.js";

const r = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const auth = authenticateRequest;
const CREW = requireRole("crew");
const RECRUITER = requireRole("organizer");
const contactLimiter = createRateLimiter({ name: "contact", max: 30, windowMs: 3600_000 });

r.use("/auth", authRoutes);

/* ---------------- crew ---------------- */
r.post("/crew/onboard", auth, validate(schemas.crewOnboard), w(async (q, s) => { const x = await crew.onboard(q.user, q.valid); s.ok(x, "Crew profile created", x.created ? 201 : 200); }));
r.get("/crew/me", auth, CREW, w(async (q, s) => s.ok(await crew.getMe(q.user))));
r.patch("/crew/me", auth, CREW, w(async (q, s) => s.ok(await crew.updateMe(q.user, q.body || {}), "Profile updated")));
r.get("/crew/me/availability", auth, CREW, w(async (q, s) => s.ok(await crew.getAvailability(q.user))));
r.put("/crew/me/availability", auth, CREW, validate(schemas.availability), w(async (q, s) => s.ok(await crew.setAvailability(q.user, q.valid))));
r.post("/crew/me/location-consent/withdraw", auth, CREW, w(async (q, s) => s.ok(await crew.withdrawLocationConsent(q.user), "Location consent withdrawn")));
r.get("/crew/me/requests", auth, CREW, w(async (q, s) => s.ok(await crew.listMyRequests(q.user))));
r.post("/crew/me/requests/:bookingId/respond", auth, CREW, validate(schemas.respond), w(async (q, s) =>
  s.ok(await crew.respond(q.user, q.params.bookingId, q.valid.response, String(q.headers["x-client"] || "app").slice(0, 10)), "Response recorded")));
r.post("/crew/me/association", auth, CREW, w(async (q, s) => s.ok(await admin.verifyJoinCode(q.user, q.body?.code), "Association verified")));
r.get("/crew", optionalAuthenticate, w(async (q, s) => {
  const n = (v) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
  const f = { role: q.query.role, specialisation: q.query.specialisation, city: q.query.city, language: q.query.language, experience: q.query.experience, available: ["true", "1"].includes(q.query.available), minRate: n(q.query.minRate), maxRate: n(q.query.maxRate), page: Math.max(1, parseInt(q.query.page || "1", 10) || 1), limit: Math.min(50, Math.max(1, parseInt(q.query.limit || "20", 10) || 20)) };
  s.ok(await crew.search(f, q.user));
}));
r.get("/crew/:id", optionalAuthenticate, w(async (q, s) => s.ok(await crew.getPublic(String(q.params.id).replace(/\D/g, ""), q.user))));
r.get("/crew/:id/contact", auth, RECRUITER, contactLimiter, w(async (q, s) => s.ok(await crew.contactInfo(q.user, String(q.params.id).replace(/\D/g, "")))));

/* ---------------- recruiters ---------------- */
r.post("/recruiters/onboard", auth, validate(schemas.recruiterOnboard), w(async (q, s) => s.ok(await rec.onboard(q.user, q.valid), "Recruiter profile created", 201)));
r.get("/recruiters/me", auth, RECRUITER, w(async (q, s) => s.ok(await rec.getMe(q.user))));
r.get("/recruiters/me/shortlist", auth, RECRUITER, w(async (q, s) => s.ok(await rec.listShortlist(q.user))));
r.put("/recruiters/me/shortlist/:crewId", auth, RECRUITER, w(async (q, s) => s.ok(await rec.addShortlist(q.user, q.params.crewId))));
r.delete("/recruiters/me/shortlist/:crewId", auth, RECRUITER, w(async (q, s) => { await rec.removeShortlist(q.user, q.params.crewId); s.ok({}, "Removed"); }));
r.get("/recruiters/me/shows", auth, RECRUITER, w(async (q, s) => s.ok(await rec.listShows(q.user, q.query.showId))));
r.post("/recruiters/me/shows", auth, RECRUITER, w(async (q, s) => s.ok(await rec.saveShow(q.user, q.body || {}), "Saved")));
r.delete("/recruiters/me/shows/:id", auth, RECRUITER, w(async (q, s) => { await rec.deleteShow(q.user, q.params.id); s.ok({}, "Deleted"); }));

/* ---------------- pre-bookings with date holds (F7 [P2]) ---------------- */
r.get("/prebookings", auth, w(async (q, s) => s.ok({ items: await prebooking.listDateHolds(q.user) })));
r.post("/prebookings", auth, RECRUITER, w(async (q, s) => s.ok(await prebooking.createDateHold(q.user, q.body || {}), "Hold created", 201)));
r.patch("/prebookings/:id/status", auth, w(async (q, s) => s.ok(await prebooking.updateDateHoldStatus(q.user, q.params.id, q.body?.status), "Status updated")));

/* ---------------- availability requests (recruiter-owned) ---------------- */
r.post("/requests", auth, RECRUITER, validate(schemas.createRequest), w(async (q, s) => s.ok(await reqs.createRequest(q.user, q.valid), "Request sent", 201)));
r.get("/requests", auth, RECRUITER, w(async (q, s) => s.ok(await reqs.listForRecruiter(q.user))));
r.get("/requests/:id", auth, RECRUITER, w(async (q, s) => s.ok(await reqs.getRequest(q.user, q.params.id))));
r.patch("/requests/:id", auth, RECRUITER, w(async (q, s) => s.ok(await reqs.updateRequest(q.user, q.params.id, q.body || {}))));

/* ---------------- notifications / devices ---------------- */
r.get("/notifications", auth, w(async (q, s) => s.ok(await notif.list(q.user))));
r.post("/notifications/:id/read", auth, w(async (q, s) => { await notif.markRead(q.user, q.params.id); s.ok({}, "Marked read"); }));
r.post("/devices", auth, w(async (q, s) => { if (!q.body?.deviceToken) throw Errors.badRequest("deviceToken is required"); await notif.registerDevice(q.user, q.body); s.ok({}, "Device registered"); }));
r.delete("/devices", auth, w(async (q, s) => { await notif.unregisterDevice(q.user, q.body?.deviceToken || ""); s.ok({}, "Device removed"); }));

/* ---------------- reports / blocks ---------------- */
r.post("/reports", auth, createRateLimiter({ name: "report", max: 10, windowMs: 3600_000 }), validate(schemas.report), w(async (q, s) => s.ok(await reports.submitReport(q.user, q.valid), "Report submitted", 201)));
r.get("/blocks", auth, w(async (q, s) => s.ok({ items: await reports.listBlocks(q.user) })));
r.put("/blocks/:id", auth, w(async (q, s) => s.ok(await reports.block(q.user, q.params.id))));
r.delete("/blocks/:id", auth, w(async (q, s) => { await reports.unblock(q.user, q.params.id); s.ok({}, "Unblocked"); }));

/* ---------------- account ---------------- */
r.delete("/account", auth, w(async (q, s) => s.ok(await account.deleteAccount(q.user), "Account deleted")));

/* ---------------- public config ---------------- */
r.get("/taxonomy/roles", w(async (q, s) => s.ok({ items: await admin.getRoles() })));
r.get("/taxonomy/cities", w(async (q, s) => s.ok(await admin.getCities())));
r.get("/features", optionalAuthenticate, w(async (q, s) => {
  const cfg = await feature.getConfig();
  const org = q.user?.role === "organizer" ? (await getDb().collection("organizers").doc(q.user.id).get()).data() || {} : {};
  const access = {}; for (const f of cfg.gatedFeatures) access[f] = await feature.checkAccess(f, org);
  s.ok({ activeTier: cfg.activeTier, trialDurationDays: cfg.trialDurationDays, gatedFeatures: cfg.gatedFeatures, supportContact: cfg.supportContact, inquiryWhatsapp: cfg.inquiryWhatsapp, access, trialDaysRemaining: cfg.activeTier === "trial" ? feature.trialDaysRemaining(org.trialStartedAt, cfg.trialDurationDays) : null });
}));

/* ---------------- admin ---------------- */
const A = [auth, requireAdmin];
r.get("/admin/profiles", ...A, w(async (q, s) => s.ok({ items: await admin.listProfiles(q.query.filter) })));
r.post("/admin/profiles/:id/:action", ...A, w(async (q, s) => s.ok(await admin.profileAction(q.user, q.params.id, q.params.action, q.body?.updates))));
r.get("/admin/metrics", ...A, w(async (q, s) => s.ok(await admin.metrics())));
r.get("/admin/reports", ...A, w(async (q, s) => s.ok({ items: await reports.listReports(q.query.status) })));
r.post("/admin/reports/:id/resolve", ...A, w(async (q, s) => s.ok(await reports.moderate(q.user, q.params.id, q.body || {}))));
r.post("/admin/taxonomy/roles", ...A, w(async (q, s) => s.ok({ items: await admin.saveRole(q.user, q.body?.role) })));
r.put("/admin/taxonomy/cities", ...A, w(async (q, s) => s.ok(await admin.saveCities(q.user, q.body || {}))));
r.get("/admin/associations", ...A, w(async (q, s) => s.ok({ items: await admin.listAssociations() })));
r.post("/admin/associations", ...A, w(async (q, s) => s.ok(await admin.createAssociation(q.user, q.body || {}), "Created", 201)));
r.post("/admin/associations/import", ...A, w(async (q, s) => s.ok(await admin.importMembers(q.user, q.body || {}))));
r.put("/admin/features", ...A, w(async (q, s) => s.ok(await feature.updateConfig(q.body || {}, q.user.id))));
// Super-admin only
r.get("/admin/users", auth, requireSuperAdmin, w(async (q, s) => s.ok({ items: await admin.listUsers() })));
r.put("/admin/users/:id/role", auth, requireSuperAdmin, w(async (q, s) => s.ok(await admin.setUserRole(q.user, q.params.id, q.body?.role))));

r.use("/whatsapp", whatsappRouter);
export default r;
