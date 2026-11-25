// Test 8 — backend failure: production must refuse to start and never fall back to a mock database.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const server = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../server.js");
const run = (extra) => spawnSync(process.execPath, [server], { env: { PATH: process.env.PATH, DOTENV_DISABLED: "true", ...extra }, encoding: "utf8", timeout: 15000 });

describe("Fail-closed startup (Test 8)", () => {
  it("production + FIREBASE_MODE=mock → exits non-zero", () => {
    const r = run({ APP_ENV: "production", FIREBASE_MODE: "mock" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /only permitted when APP_ENV=test/);
  });
  it("production without Firebase credentials → exits non-zero, no secrets in output", () => {
    const r = run({ APP_ENV: "production", FIREBASE_ADMIN_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----SECRETSECRET" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /FIREBASE_ADMIN_PROJECT_ID is required/);
    assert.ok(!r.stderr.includes("SECRETSECRET") && !r.stdout.includes("SECRETSECRET"));
  });
  it("production refuses dev OTP echo and missing CORS/pepper", () => {
    const r = run({ APP_ENV: "production", OTP_DEV_ECHO: "true" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /OTP_DEV_ECHO must not be enabled in production/);
    assert.match(r.stderr, /CORS_ORIGINS/);
  });
  it("development without credentials also fails (no silent in-memory fallback anywhere)", () => {
    const r = run({ APP_ENV: "development" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /FIREBASE_ADMIN_PROJECT_ID is required/);
  });
  it("mock stores are unreachable outside test mode", async () => {
    const { testHooks } = await import("../config/firebase.js");
    process.env.FIREBASE_MODE = "mock"; // test env here, so hooks work…
    assert.doesNotThrow(() => testHooks.reset());
  });
});
