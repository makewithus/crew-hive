#!/usr/bin/env node
import { createServer, SERVICE_NAME, APP_VERSION } from "./app.js";
import env from "./config/env.js";
import { startAvailabilityExpiryWorker } from "./jobs/availability-expiry.job.js";

try {
  const server = await createServer(); // throws INVALID_CONFIG → process exits non-zero (fail closed)
  server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`\n========================================================`);
    console.log(`🚀 [CrewHive API] Server is running on port ${env.PORT}`);
    console.log(`   ➜ Local:        http://localhost:${env.PORT}`);
    console.log(`   ➜ API Endpoint: http://localhost:${env.PORT}/api/v1`);
    console.log(`   ➜ Healthcheck:  http://localhost:${env.PORT}/health`);
    console.log(`   ➜ Environment:  ${env.APP_ENV} | Firebase: ${env.firebase.mode}`);
    console.log(`========================================================\n`);
    startAvailabilityExpiryWorker();
  });
} catch (err) {
  console.error("[CrewHive API] Fatal startup error:", err.message);
  process.exit(1);
}
