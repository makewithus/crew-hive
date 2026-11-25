import { createServer } from "../app.js";
import { testHooks } from "../config/firebase.js";
import { clearRateLimits } from "../middleware/rate-limiter.middleware.js";

export async function boot() {
  testHooks.reset(); clearRateLimits();
  const server = await createServer();
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const call = async (method, path, { token, body, headers } = {}) => {
    const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    let json = null; try { json = await res.json(); } catch {}
    return { status: res.status, body: json, data: json?.data };
  };
  /** Full OTP login exactly as a client does it. Returns {token, refreshToken, user}. */
  const login = async (phone, ip = "10.0.0.1") => {
    const s = await call("POST", "/auth/otp/send", { body: { phone }, headers: { "X-Forwarded-For": ip } });
    if (s.status !== 200) throw new Error(`send failed ${s.status} ${JSON.stringify(s.body)}`);
    const v = await call("POST", "/auth/otp/verify", { body: { phone, otp: s.data.devOtp } });
    if (v.status !== 200) throw new Error(`verify failed ${v.status} ${JSON.stringify(v.body)}`);
    return { token: v.data.idToken, refreshToken: v.data.refreshToken, user: v.data.user, isNewUser: v.data.isNewUser };
  };
  const consent = { termsAccepted: true, privacyAccepted: true, acceptableBehaviorAccepted: true };
  return { base, call, login, consent, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }), db: testHooks.db(), auth: testHooks.auth() };
}
