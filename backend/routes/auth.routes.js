import { Router } from "express";
import { schemas } from "@crew-hive/shared";
import * as auth from "../services/auth.service.js";
import { authenticateRequest } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rate-limiter.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();
const w = (fn) => (req, res, next) => fn(req, res).catch(next);

// Canonical paths; /send-otp and /verify-otp kept as aliases for the transition.
const send = [authLimiter, validate(schemas.sendOtp), w(async (req, res) =>
  res.ok(await auth.sendOtp(req.valid.phone, { ip: req.ip, deviceId: req.headers["x-device-id"] }), "OTP sent"))];
const verify = [authLimiter, validate(schemas.verifyOtp), w(async (req, res) =>
  res.ok(await auth.verifyOtp(req.valid.phone, req.valid.otp), "Verified"))];

router.post("/otp/send", ...send);
router.post("/send-otp", ...send);
router.post("/otp/verify", ...verify);
router.post("/verify-otp", ...verify);
router.post("/refresh", authLimiter, validate(schemas.refresh), w(async (req, res) => res.ok(await auth.refresh(req.valid.refreshToken))));
router.post("/logout", authenticateRequest, w(async (req, res) => { await auth.logout(req.user); res.ok({}, "Signed out"); }));
router.get("/me", authenticateRequest, w(async (req, res) => res.ok(await auth.me(req.user))));

export default router;
