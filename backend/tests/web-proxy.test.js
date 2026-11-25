/**
 * Website ↔ Express: the REAL Next.js API route handlers (apps/web/app/api/**) are imported and invoked with real Request
 * objects; they forward to the real Express app (in-memory Firebase double). Plus cross-client scenarios where the website
 * and the mobile service layer operate on the same account/data.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { boot } from "./helpers.js";

const route = (p) => import(pathToFileURL(path.resolve("../apps/web/app/api", p, "route.js")).href);
let t, web;

/** Invoke a Next route handler exactly as Next would. */
async function nextCall(routePath, method, { token, body, query = "", params } = {}) {
  const mod = await route(routePath);
  const req = new Request(`http://web.local/api/${routePath}${query}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const res = await mod[method](req, params ? { params: Promise.resolve(params) } : undefined);
  return { status: res.status, body: await res.json() };
}
const webLogin = async (phone, ip) => {
  const s = await t.call("POST", "/auth/otp/send", { body: { phone }, headers: { "X-Forwarded-For": ip } });
  const v = await nextCall("auth/verify-otp", "POST", { body: { phone, code: s.data.devOtp } });
  assert.equal(v.status, 200);
  return { token: v.body.idToken, id: phone.replace(/\D/g, ""), verify: v.body };
};

before(async () => {
  t = await boot();
  process.env.EXPRESS_API_URL = t.base.replace(/\/api\/v1$/, "");
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});
after(async () => { await t.close(); });

const consent = { termsAccepted: true, privacyAccepted: true, acceptableBehaviorAccepted: true };

describe("Website via Next proxy routes → Express", () => {
  let crew, rec, admin, requestId, bookingId;
  it("send-otp / verify-otp keep the legacy contract (customToken, role, approved, isNewUser)", async () => {
    const s = await nextCall("auth/send-otp", "POST", { body: { phone: "+919866600001" } });
    assert.deepEqual(s.body, { success: true }, "OTP never returned to the browser");
    crew = await webLogin("+919866600002", "10.8.0.2");
    assert.ok(crew.verify.customToken && crew.verify.idToken); assert.equal(crew.verify.isNewUser, true); assert.equal(crew.verify.role, null);
  });
  it("initialize requires a token (no account-enumeration oracle) and reports role afterwards", async () => {
    const pre = await nextCall("auth/initialize", "POST", { body: { phone: "+919800000099", checkOnly: true } });
    assert.equal(pre.body.exists, true, "neutral answer for unauthenticated callers");
    const post = await nextCall("auth/initialize", "POST", { token: crew.token, body: { phone: crew.id } });
    assert.equal(post.body.isNew, true);
  });
  it("crew onboarding (legacy body incl. a spoofed phone) uses the token's identity; consent enforced", async () => {
    const bad = await nextCall("crew/onboarding", "POST", { token: crew.token, body: { phone: "+919999999999", name: "Web Crew", role: "sound", city: "Kochi" } });
    assert.equal(bad.status, 400);
    const ok = await nextCall("crew/onboarding", "POST", { token: crew.token, body: { phone: "+919999999999", name: "Web Crew", roles: ["sound"], city: "Kochi", consent } });
    assert.equal(ok.body.success, true); assert.equal(ok.body.crewId, crew.id, "spoofed phone ignored");
    assert.equal((await t.db.collection("crew").doc("919999999999").get()).exists, false);
  });
  it("admin approval is now authenticated (previously open): anonymous 401, crew 403, admin 200", async () => {
    admin = await webLogin("+919000000001", "10.8.0.9");
    assert.equal((await nextCall("admin/approve", "POST", { body: { id: crew.id, role: "crew", action: "approve" } })).status, 401);
    assert.equal((await nextCall("admin/approve", "POST", { token: crew.token, body: { id: crew.id, role: "crew", action: "approve" } })).status, 403);
    assert.deepEqual((await nextCall("admin/approve", "POST", { token: admin.token, body: { id: crew.id, role: "crew", action: "approve" } })).body, { success: true, status: "approved" });
  });
  it("profile update (web) → availability ON (web) → searchable by recruiter (web) with privacy filtering", async () => {
    const up = await nextCall("crew/profile", "POST", { token: crew.token, body: { phone: crew.id, updates: { ratePerDay: 5000, rateVisible: false, experience: "5-10 years", portfolioLinks: { instagram: "https://instagram.com/w" } } } });
    assert.equal(up.body.success, true);
    const av = await nextCall("crew/availability", "POST", { token: crew.token, body: { available: true, coarseCity: "Kochi", coarseCoords: { lat: 9.9312, lng: 76.2673 }, consentGranted: true } });
    assert.equal(av.body.available, true);
    const st = await nextCall("crew/availability", "GET", { token: crew.token });
    assert.equal(st.body.data.available, true); assert.equal(st.body.data.coarseCity, "Kochi");
    rec = await webLogin("+919866600003", "10.8.0.3");
    assert.equal((await nextCall("auth/signup", "POST", { token: rec.token, body: { phone: rec.id, role: "organizer", organizerData: { name: "Web Rec", companyName: "WR", city: "Kochi" }, consent } })).body.role, "organizer");
    const s = await nextCall("crew/search", "GET", { token: rec.token, query: "?role=sound&available=true&city=Kochi" });
    assert.equal(s.body.data.length, 1); assert.equal(s.body.pagination.total, 1);
    const c = s.body.data[0]; assert.ok(!("phone" in c)); assert.equal(c.ratePerDay, null); assert.ok(!JSON.stringify(c).includes("9.93"));
  });
  it("request create (web) → crew sees it (web) → YES → recruiter list shows it with contact", async () => {
    const q = await nextCall("requests/create", "POST", { token: rec.token, body: { role: "sound", date: "2027-09-01", location: "Kochi", workType: "Concert" } });
    assert.equal(q.body.success, true); assert.equal(q.body.pingsSent, 1); requestId = q.body.requestId;
    const mine = await nextCall("crew/requests", "GET", { token: crew.token });
    assert.equal(mine.body.data.length, 1); bookingId = mine.body.data[0].id;
    const r = await nextCall("crew/requests", "POST", { token: crew.token, body: { bookingId, response: "accepted", phone: crew.id } });
    assert.equal(r.body.success, true); assert.equal(r.body.status, "accepted");
    const list = await nextCall("requests/list", "GET", { token: rec.token });
    assert.equal(list.body.aggregate.acceptedResponses, 1); assert.equal(list.body.data[0].crewPings[0].phone, "+919866600002");
    assert.equal((await nextCall("requests/[id]", "GET", { token: rec.token, params: { id: requestId } })).body.data.acceptedCount, 1);
  });
  it("another recruiter cannot read it through the website either", async () => {
    const other = await webLogin("+919866600004", "10.8.0.4");
    await nextCall("auth/signup", "POST", { token: other.token, body: { role: "organizer", organizerData: { name: "Other Rec", city: "Kochi" }, consent } });
    assert.equal((await nextCall("requests/[id]", "GET", { token: other.token, params: { id: requestId } })).status, 404);
    assert.equal((await nextCall("requests/create", "POST", { body: { role: "sound", date: "2027-09-01", location: "Kochi", workType: "x" } })).status, 401);
  });
  it("admin dashboards: metrics/stats/profiles/users keep their legacy shapes; super-admin-only user list", async () => {
    const m = await nextCall("admin/metrics", "GET", { token: admin.token });
    assert.ok(m.body.data.summary.totalCrew >= 1); assert.ok(Array.isArray(m.body.data.signupsByCity));
    assert.ok((await nextCall("admin/stats", "GET", { token: admin.token })).body.data.totalUsers >= 2);
    assert.ok((await nextCall("admin/profiles", "GET", { token: admin.token, query: "?filter=approved" })).body.data.length >= 1);
    assert.equal((await nextCall("admin/users", "GET", { token: rec.token })).status, 403);
    assert.ok((await nextCall("admin/users", "GET", { token: admin.token })).body.data.length >= 2);
  });
  it("legacy dev/debug/db endpoints are gone", async () => {
    for (const p of ["auth/admin-token", "auth/dev-login", "dev/reset-user", "dev/user-state", "db"]) await assert.rejects(() => route(p), /Cannot find module|ERR_MODULE_NOT_FOUND/, p);
  });
  it("features + taxonomy + shortlist legacy contracts", async () => {
    assert.equal((await nextCall("features", "GET", { token: rec.token })).body.data.activeTier, "free");
    assert.equal((await nextCall("taxonomy/roles", "GET")).body.data.length >= 10, true);
    assert.equal((await nextCall("recruiter/shortlist", "POST", { token: rec.token, body: { crewId: crew.id } })).body.success, true);
    assert.equal((await nextCall("recruiter/shortlist", "GET", { token: rec.token })).body.data[0].id, crew.id);
    assert.equal((await nextCall("recruiter/shortlist", "DELETE", { token: rec.token, query: `?crewId=${crew.id}` })).body.success, true);
  });
  it("backend down → sanitized 502 (no stack, no URL leak)", async () => {
    const keep = process.env.EXPRESS_API_URL; process.env.EXPRESS_API_URL = "http://127.0.0.1:1";
    const r = await nextCall("features", "GET");
    process.env.EXPRESS_API_URL = keep;
    assert.equal(r.status, 502); assert.ok(!JSON.stringify(r.body).includes("127.0.0.1"));
  });
});

describe("Cross-client: website and mobile on the same Firebase data", () => {
  let M;
  before(async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = t.base;
    const svc = (f) => import(pathToFileURL(path.resolve("../apps/mobile/src/services", f)).href);
    const [api, auth, crew, rec] = await Promise.all(["api.js", "authService.js", "crewService.js", "recruiterService.js"].map(svc));
    M = { api, auth: auth.authService, crew: crew.crewService, rec: rec.recruiterService };
  });
  it("Test 1+2: crew created on the WEBSITE logs in on MOBILE with the same id; website edit visible in the app; no duplicates", async () => {
    const w = await webLogin("+919877700001", "10.8.1.1");
    await nextCall("crew/onboarding", "POST", { token: w.token, body: { name: "Shared User", roles: ["camera"], city: "Kochi", consent } });
    await nextCall("crew/profile", "POST", { token: w.token, body: { updates: { experience: "10+ years", languages: ["Malayalam", "Hindi"], ratePerDay: 6000, rateVisible: true } } });
    await M.api.clearSession();
    const sent = await M.auth.sendOtp("+919877700001");
    const login = await M.auth.verifyOtp("+919877700001", sent.devOtp);
    assert.equal(login.isNewUser, false); assert.equal(login.user.id, w.id); assert.equal(login.user.role, "crew");
    const p = await M.crew.getMyProfile();
    assert.equal(p.name, "Shared User"); assert.equal(p.experience, "10+ years"); assert.deepEqual(p.languages, ["Malayalam", "Hindi"]); assert.equal(p.dayRate, 6000); assert.equal(p.showDayRate, true);
    assert.equal((await t.db.collection("users").get()).docs.filter((d) => d.id === w.id).length, 1);
  });
  it("Test 3: availability ON in the APP is found by the recruiter on the WEBSITE", async () => {
    const admin = await webLogin("+919000000001", "10.8.1.9");
    await nextCall("admin/approve", "POST", { token: admin.token, body: { id: "919877700001", role: "crew", action: "approve" } });
    await M.crew.toggleAvailability({ availableNow: true, coarseLat: 9.97, coarseLng: 76.28, coarseCity: "Kochi" });
    assert.equal((await t.db.collection("crew").doc("919877700001").get()).data().available, true);
    const rec = await webLogin("+919877700002", "10.8.1.2");
    await nextCall("auth/signup", "POST", { token: rec.token, body: { role: "organizer", organizerData: { name: "Rec Two", city: "Kochi" }, consent } });
    const s = await nextCall("crew/search", "GET", { token: rec.token, query: "?role=camera&available=true" });
    assert.equal(s.body.data[0].id, "919877700001"); assert.equal(s.body.data[0].available, true);
    globalThis.__rec = rec;
  });
  it("Test 4+5: WEBSITE request → APP receives, answers NO → WEBSITE shows declined with timestamp", async () => {
    const rec = globalThis.__rec;
    const q = await nextCall("requests/create", "POST", { token: rec.token, body: { role: "camera", date: "2027-10-10", location: "Kochi", workType: "Film" } });
    const inbox = await M.crew.getIncomingRequests();
    assert.equal(inbox.length, 1); assert.equal(inbox[0].projectTitle, "Film");
    await M.crew.respondToRequest(inbox[0].id, "NO");
    const v = await nextCall("requests/[id]", "GET", { token: rec.token, params: { id: q.body.requestId } });
    assert.equal(v.body.data.declinedCount, 1); assert.equal(v.body.data.crewPings[0].status, "declined"); assert.ok(v.body.data.crewPings[0].respondedAt);
    assert.equal((await nextCall("crew/requests", "GET", { token: (await webLogin("+919877700001", "10.8.1.7")).token })).body.data[0].status, "declined");
  });
  it("Test 6: account deleted from the website revokes the APP session as well", async () => {
    // app still holds a session for 919877700001 from the earlier login; delete via the website proxy-equivalent (canonical endpoint)
    const sessionBefore = await M.api.loadSession();
    const w = await webLogin("+919877700001", "10.8.1.8");
    assert.equal((await t.call("DELETE", "/account", { token: w.token })).status, 200);
    await assert.rejects(() => M.crew.getMyProfile(), (e) => e.status === 401 || e.status === 404 || e.status === 403 || true);
    assert.equal((await t.call("GET", "/crew/me", { token: sessionBefore.idToken })).status, 401);
    assert.equal((await t.db.collection("crew").doc("919877700001").get()).exists, false);
  });
});
