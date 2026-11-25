/** Express application factory. Mounts the canonical /api/v1 API. */
import express from "express";
import http from "node:http";
import cors from "cors";
import helmet from "helmet";
import env from "./config/env.js";
import { initFirebase, getDb } from "./config/firebase.js";
import { envelope } from "./middleware/response.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";
import { generalApiLimiter } from "./middleware/rate-limiter.middleware.js";
import { requestLogger } from "./middleware/logger.middleware.js";
import routes from "./routes/index.js";

export const APP_VERSION = "2.0.0";
export const SERVICE_NAME = "CrewHive Shared Backend API";

export function createExpressApp() {
  initFirebase(); // fail fast on bad configuration (no silent mock fallback)
  const app = express();
  app.set("trust proxy", env.isProduction ? 1 : env.isTest);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // native apps / server-to-server send no Origin
      if (env.corsOrigins.includes(origin) || (!env.isProduction && env.corsOrigins.length === 0)) return cb(null, true);
      cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-Id", "X-Client"],
  }));
  // Keep the raw body for webhook signature verification.
  app.use(express.json({ limit: "256kb", verify: (req, res, buf) => { req.rawBody = buf.toString("utf8"); } }));
  app.use(envelope);
  app.use(requestLogger);
  app.use(generalApiLimiter);

  app.get("/", (req, res) => res.json({ status: "ok", service: SERVICE_NAME, version: APP_VERSION, api: "/api/v1", health: "/health" }));
  app.get("/health", (req, res) => res.json({ status: "ok", service: SERVICE_NAME, version: APP_VERSION, uptime: process.uptime() }));
  app.get("/ready", async (req, res) => {
    try { await getDb().collection("settings").doc("feature_access").get(); res.json({ status: "ready", firebase: env.firebase.mode }); }
    catch { res.status(503).json({ status: "unavailable" }); }
  });

  app.use("/api/v1", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export async function createServer() { return http.createServer(createExpressApp()); }
export default { createExpressApp, createServer, APP_VERSION, SERVICE_NAME };
