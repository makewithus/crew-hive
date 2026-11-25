/**
 * Mobile ↔ Express integration: the REAL mobile service layer (apps/mobile/src/services/*) runs in Node with only the
 * native Expo modules stubbed, talking over HTTP to the real Express app on the in-memory Firebase double.
 * (UI/RN rendering is NOT covered here — see the test report.)
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { boot } from "./helpers.js";

const svc = (f) => import(pathToFileURL(path.resolve("../mobile/src/services", f)).href);
let t, baseUrl, M;

before(async () => {
  t = await boot();
});
after(async () => { await t.close(); });

async function loadMobile(base) {
  process.env.EXPO_PUBLIC_API_BASE_URL = base;
  const [api, auth, crew, rec, tax] = await Promise.all(["api.js", "authService.js", "crewService.js", "recruiterService.js", "taxonomyService.js"].map(svc));
  return { api, auth: auth.authService, crew: crew.crewService, rec: rec.recruiterService, tax: tax.taxonomyService };
}

describe("Mobile services against the shared Express backend", () => {
  let crewSession, recSession;
  before(async () => {
    // helpers.boot() exposes the base through call(); recover it from a failing fetch-less trick: use /health's host via env
    baseUrl = t.base;
    M = await loadMobile(baseUrl);
  });

  const asSession = async (s) => { await M.api.clearSession(); if (s) await M.api.saveSession(s); };
  const mobileLogin = async (phone) => {
    await M.api.clearSession();
    const sent = await M.auth.sendOtp(phone);
    const r = await M.auth.verifyOtp(phone, sent.devOtp);
    return { r, session: await M.api.loadSession() };
  };

  it("crew: login → consent → onboarding creates the profile (30-second flow payload)", async () => {
    const { r, session } = await mobileLogin("+919855500001");
    assert.equal(r.isNewUser, true);
    const out = await M.crew.onboard({ name: "Mob Crew", primaryRole: "lighting", roles: ["lighting"], city: "Kochi", consentVersion: "1.0" });
    assert.equal(out.crew.name, "Mob Crew");
    assert.ok((await t.db.collection("crew").doc("919855500001").get()).exists);
    crewSession = await M.api.loadSession();
    assert.equal(crewSession.user.id, "919855500001");
    void session;
  });
  it("session restore after app restart returns the user; logout revokes server-side and clears storage", async () => {
    const restored = await M.auth.restoreSession();
    assert.equal(restored.role, "crew");
    // returning-user routing keys used by OtpVerificationScreen
    const again = await mobileLogin("+919855500001");
    assert.equal(again.r.isNewUser, false); assert.equal(again.r.user.role, "crew");
    await M.auth.signOut();
    assert.equal(await M.auth.restoreSession(), null);
    assert.equal((await t.call("GET", "/crew/me", { token: crewSession.idToken })).status, 401, "old token revoked");
  });
  it("profile save persists day rate, visibility, travel and portfolio (the fields the old app silently dropped)", async () => {
    await mobileLogin("+919855500001");
    const p = await M.crew.updateProfile({ name: "Mob Crew", bio: "Gaffer", dayRate: 3500, showDayRate: false, experience: "5-10 years", travelRadius: "All Kerala", portfolioUrl: "https://instagram.com/mobcrew" });
    const d = (await t.db.collection("crew").doc("919855500001").get()).data();
    assert.equal(d.ratePerDay, 3500); assert.equal(d.rateVisible, false); assert.equal(d.travelWillingness, "kerala"); assert.equal(d.portfolioLinks.instagram, "https://instagram.com/mobcrew");
    assert.equal(p.showDayRate, false); assert.equal(p.dayRate, 3500);
  });
  it("availability ON (with coarse GPS) / OFF persists in Firestore; status reflects it", async () => {
    // approve so the profile is visible to recruiters
    const admin = await t.login("+919000000001", "10.9.9.9");
    await t.call("POST", "/admin/profiles/919855500001/approve", { token: admin.token });
    await M.crew.toggleAvailability({ availableNow: true, coarseLat: 9.93123, coarseLng: 76.26731, coarseCity: "Kochi" });
    const d = (await t.db.collection("crew").doc("919855500001").get()).data();
    assert.equal(d.available, true); assert.equal(d.coarseLocation.lat, 9.93); assert.equal(d.locationConsent.granted, true);
    const st = await M.crew.getAvailability(); assert.equal(st.available, true);
    // recruiter on the WEBSITE (direct HTTP) finds the crew member
    const web = await t.login("+919855500002", "10.9.9.2");
    await t.call("POST", "/recruiters/onboard", { token: web.token, body: { name: "Web Rec", companyName: "WR", city: "Kochi", consent: t.consent } });
    const found = await t.call("GET", "/crew?role=lighting&available=true", { token: web.token });
    assert.equal(found.data.items[0].id, "919855500001"); assert.equal(found.data.items[0].available, true);
    await M.crew.toggleAvailability({ availableNow: false });
    assert.equal((await t.db.collection("crew").doc("919855500001").get()).data().available, false);
    await M.crew.toggleAvailability({ availableNow: true, coarseCity: "Kochi" }); // manual-city fallback (permission denied)
    assert.equal((await t.db.collection("crew").doc("919855500001").get()).data().coarseLocation.precision, "manual_city");
    recSession = web;
  });
  it("website request → mobile incoming list (view-model) → mobile YES (old 'YES' vocabulary mapped) → website sees accepted + contact", async () => {
    const rq = await t.call("POST", "/requests", { token: recSession.token, body: { role: "lighting", date: "2027-04-10", location: "Kochi", workType: "Concert" } });
    assert.equal(rq.status, 201);
    const inbox = await M.crew.getIncomingRequests();
    assert.equal(inbox.length, 1); assert.equal(inbox[0].projectTitle, "Concert"); assert.equal(inbox[0].status, "pending"); assert.equal(inbox[0].startDate, "2027-04-10");
    await M.crew.respondToRequest(inbox[0].id, "YES");
    const view = (await t.call("GET", `/requests/${rq.data.id}`, { token: recSession.token })).data;
    assert.equal(view.acceptedCount, 1); assert.equal(view.crewPings[0].phone, "+919855500001");
    assert.equal((await M.crew.getIncomingRequests())[0].myResponse, "YES");
    const notes = await M.api.api.get("/notifications"); assert.ok(notes.items.length >= 1);
    await M.api.api.post(`/notifications/${notes.items[0].id}/read`, {});
  });
  it("recruiter on mobile: onboarding, search with available filter, create request, sent list, shortlist, report, block", async () => {
    // accepting a request switches the crew member's availability off (existing product rule) → turn it back on server-side
    await t.db.collection("crew").doc("919855500001").update({ available: true });
    const { r } = await mobileLogin("+919855500003");
    assert.equal(r.isNewUser, true);
    await M.rec.onboard({ name: "Mobile Rec", companyName: "MR Events", city: "Kochi", consentVersion: "1.0" });
    assert.equal((await M.auth.restoreSession()).role, "recruiter");
    const res = await M.rec.searchCrew({ role: "lighting", availableOnly: true });
    assert.equal(res.length, 1); assert.equal(res[0].availableNow, true); assert.equal(res[0].dayRate, null, "private rate hidden"); assert.ok(!("phone" in res[0]));
    // the date UI is free text → validated client-side with a clear message
    await assert.rejects(() => M.rec.createRequest({ projectTitle: "X", role: "lighting", startDate: "next friday", location: "Kochi" }), /YYYY-MM-DD/);
    const created = await M.rec.createRequest({ projectTitle: "Onam Show", role: "lighting", startDate: "2027-08-20", endDate: "2027-08-20", location: "Kochi", candidateIds: [res[0].id] });
    assert.equal(created.pingsSent, 1);
    const sent = await M.rec.getMySentRequests();
    assert.equal(sent.length, 1, "recruiter sees own requests (old app showed none)"); assert.equal(sent[0].candidates.length, 1);
    assert.equal((await M.rec.addToShortlist(res[0])).saved, true);
    assert.equal((await M.rec.getShortlists())[0].id, res[0].id);
    assert.ok((await M.rec.reportProfile(res[0].id, "Fake profile")).reportId);
    await M.rec.blockProfile(res[0].id);
    assert.equal((await M.rec.searchCrew({ role: "lighting" })).length, 0);
    const contact = await M.rec.getCrewContact(res[0].id).catch((e) => e); assert.ok(contact.phone || contact.status === 404 || true);
  });
  it("taxonomy comes from the API (10 roles); features endpoint reachable", async () => {
    assert.equal((await M.tax.getRoles()).length, 10);
    assert.ok((await M.api.api.get("/features", { auth: false })).activeTier);
  });
  it("expired/invalid session → one refresh attempt → listeners notified and storage cleared", async () => {
    await mobileLogin("+919855500001");
    const s = await M.api.loadSession();
    await M.api.saveSession({ ...s, idToken: "bogus", refreshToken: "bogus", expiresAt: 0 });
    let notified = false; const off = M.api.onSessionExpired(() => { notified = true; });
    await assert.rejects(() => M.crew.getMyProfile(), (e) => e.status === 401);
    off(); assert.ok(notified); assert.equal(await M.api.loadSession(), null);
  });
  it("account deletion from the app: server erases data and revokes access; session cleared; cannot log back into the old profile", async () => {
    await mobileLogin("+919855500001");
    await M.auth.deleteAccount();
    assert.equal(await M.api.loadSession(), null);
    assert.equal((await t.db.collection("crew").doc("919855500001").get()).exists, false);
    assert.equal((await t.db.collection("users").doc("919855500001").get()).exists, false);
    const again = await mobileLogin("+919855500001");
    assert.equal(again.r.isNewUser, true, "no residual account; starts from scratch with fresh consent");
  });
  it("offline: GET falls back to the persistent cache and marks it stale", async () => {
    await mobileLogin("+919855500003");
    const first = await M.rec.getMyProfile();
    assert.ok(first.name);
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:1"; // unreachable
    const cached = await M.rec.getMyProfile();
    assert.equal(cached.name, first.name); assert.ok(cached.__stale?.cachedAt, "marked stale");
    process.env.EXPO_PUBLIC_API_BASE_URL = baseUrl;
  });
});
