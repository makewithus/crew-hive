/**
 * backend/middleware/logger.middleware.js
 * Comprehensive HTTP request/response logging for CrewHive Backend API.
 */

import env from "../config/env.js";

// ANSI color escape codes for high-visibility terminal logs
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

export function requestLogger(req, res, next) {
  // In automated test runs, avoid cluttering test reporter output
  if (env.isTest) {
    return next();
  }

  const start = process.hrtime.bigint();
  const timestamp = new Date().toLocaleTimeString("en-IN", { hour12: false });

  // Sanitize path and query for logging
  const originalUrl = req.originalUrl || req.url;

  // Intercept response finish
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = (Number(end - start) / 1_000_000).toFixed(1);
    const status = res.statusCode;

    // Status color coding
    let statusColor = colors.green;
    let symbol = "✓";
    if (status >= 500) {
      statusColor = colors.red;
      symbol = "✖";
    } else if (status >= 400) {
      statusColor = colors.yellow;
      symbol = "⚠";
    } else if (status >= 300) {
      statusColor = colors.cyan;
      symbol = "➜";
    }

    const methodColor = req.method === "GET"
      ? colors.cyan
      : req.method === "POST"
      ? colors.green
      : req.method === "DELETE"
      ? colors.red
      : colors.yellow;

    // Extract user info if authenticated
    const userTag = req.user?.id ? ` [User: ${req.user.id} (${req.user.role || "anon"})]` : "";
    const clientTag = req.headers["x-client"] ? ` [Client: ${req.headers["x-client"]}]` : "";

    console.log(
      `${colors.dim}[${timestamp}]${colors.reset} ${symbol} ${methodColor}${req.method}${colors.reset} ${originalUrl} ${statusColor}${status}${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}${userTag}${clientTag}`
    );
  });

  next();
}

export default requestLogger;

