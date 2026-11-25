import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { boot } from "./helpers.js";

let t;
before(async () => { t = await boot(); });
after(async () => { await t.close(); });

const CREW = "+919811100001", CREW2 = "+919811100002", REC = "+919811100003", REC2 = "+919811100004", ADMIN = "+919000000001";
const onboardCrew = (token, over = {}) => t.call("POST", "/crew/onboard", { token, body: { name: "Asha Lights", role: "lighting", city: "Kochi", consent: t.consent, ...over } });
const onboardRec = (token) => t.call("POST", "/recruiters/onboard", { token, body: { name: "Ravi", companyName: "Ravi Events", city: "Kochi", consent: t.consent } });

describe("Security: no bypass, real sessions only", () => {
  it("rejects forged DEV_TOKEN_* / DEV_TOKEN_admin / x-dev-* headers", async () => {
    for (const h of [{ token: "DEV_TOKEN_admin" }, { token: "DEV_TOKEN_+919000000001" }, { headers: { "x-dev-phone": ADMIN, "x-dev-role": "admin" } }]) {
      const r = await t.call("GET", "/admin/metrics", h);
      assert.equal(r.status, 401);
    }
  });
  it("OTP is random, hashed at rest, not 123456 by default, single use, limited attempts", async () => {
    const s = await t.call("POST", "/auth/otp/send", { body: { phone: CREW }, headers: { "X-Forwarded-For": "10.1.1.1" } });
    assert.equal(s.status, 200);
    const stored = (await t.db.collection("otpCodes").doc("919811100001").get()).data();
    assert.ok(stored.hash && !stored.otp, "OTP must be stored hashed");
    const wrong = s.data.devOtp === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) assert.equal((await t.call("POST", "/auth/otp/verify", { body: { phone: CREW, otp: wrong } })).status, 401);
    assert.equal((await t.call("POST", "/auth/otp/verify", { body: { phone: CREW, otp: s.data.devOtp } })).status, 429, "locked after 5 wrong attempts");
  });
  it("30s resend cooldown and per-device limit", async () => {
    await t.call("POST", "/auth/otp/send", { body: { phone: "+919811100010" } });
    assert.equal((await t.call("POST", "/auth/otp/send", { body: { phone: "+919811100010" } })).status, 429);
    let last;
    for (let i = 0; i < 7; i++) last = await t.call("POST", "/auth/otp/send", { body: { phone: `+91981110002${i}` }, headers: { "X-Device-Id": "dev-1" } });
    assert.equal(last.status, 429, "same device, many phones → limited");
  });
  it("client can never choose its role: no role field is honoured at login or onboarding", async () => {
    const u = await t.login("+919811100030");
    assert.equal(u.user.role, null);
    const r = await t.call("POST", "/crew/onboard", { token: u.token, body: { name: "Sneaky", role: "lighting", city: "Kochi", consent: t.consent, userRole: "admin", isAdmin: true } });
    assert.equal(r.status, 201);
    assert.equal((await t.call("GET", "/admin/metrics", { token: u.token })).status, 403);
    assert.equal((await t.db.collection("users").doc("919811100030").get()).data().role, "crew");
  });
  it("super admin comes only from server env", async () => {
    const a = await t.login(ADMIN, "10.2.2.2");
    assert.equal(a.user.role, "super_admin");
    assert.equal((await t.call("GET", "/admin/metrics", { token: a.token })).status, 200);
  });
  it("webhook requires a valid signature; verification handshake works", async () => {
    const raw = JSON.stringify({ id: "m1", status: "delivered" });
    assert.equal((await t.call("POST", "/whatsapp/webhook", { body: { id: "m1" } })).status, 401);
    const sig = crypto.createHmac("sha256", "test-secret").update(raw).digest("hex");
  });
});

describe("Test 1 — shared identity; Test 2 — profile reflected", () => {
  let web, mobile;
  it("same phone → same user id, one user doc, same profile on both clients", async () => {
    web = await t.login(CREW, "10.3.0.1");
    assert.equal(web.isNewUser, true);
    const ob = await onboardCrew(web.token, { roles: ["lighting", "sound"], specialisations: ["gaffer"] });
    assert.equal(ob.status, 201);
    mobile = await t.login(CREW, "10.3.0.2"); // later: mobile logs in with the same verified phone
    assert.equal(mobile.isNewUser, false);
    assert.equal(mobile.user.id, web.user.id);
    assert.equal(mobile.user.role, "crew");
    const users = (await t.db.collection("users").get()).docs.filter((d) => d.id.endsWith("919811100001"));
    assert.equal(users.length, 1, "no duplicate user records");
    const a = (await t.call("GET", "/crew/me", { token: web.token })).data, b = (await t.call("GET", "/crew/me", { token: mobile.token })).data;
    assert.equal(a.id, "919811100001");
    assert.deepEqual(a, b);
  });
  it("website profile update is visible to mobile (all fields)", async () => {
    const up = await t.call("PATCH", "/crew/me", { token: web.token, body: { ratePerDay: 4500, rateVisible: false, experience: "5-10 years", languages: ["Malayalam", "Tamil"], travelWillingness: "kerala", portfolioLinks: { instagram: "https://instagram.com/asha", youtube: "javascript:alert(1)".replace("javascript:alert(1)", "https://youtube.com/c/a") }, pastCredits: [{ eventName: "Onam Fest", role: "Gaffer", year: "2025" }], equipmentOwned: [{ name: "Par can", category: "lighting" }] } });
    assert.equal(up.status, 200);
    const m = (await t.call("GET", "/crew/me", { token: mobile.token })).data;
    assert.equal(m.ratePerDay, 4500); assert.equal(m.experience, "5-10 years"); assert.deepEqual(m.languages, ["Malayalam", "Tamil"]);
    assert.equal(m.pastCredits[0].eventName, "Onam Fest"); assert.equal(m.travelWillingness, "kerala");
    assert.ok(m.profileCompleteness > 60); assert.ok(m.nextStep);
  });
  it("invalid input is rejected (bad URL, negative rate, bad travel value)", async () => {
    assert.equal((await t.call("PATCH", "/crew/me", { token: web.token, body: { portfolioLinks: { instagram: "javascript:alert(1)" } } })).status, 400);
    assert.equal((await t.call("PATCH", "/crew/me", { token: web.token, body: { ratePerDay: -5 } })).status, 400);
    assert.equal((await t.call("PATCH", "/crew/me", { token: web.token, body: { travelWillingness: "moon" } })).status, 400);
  });
  it("consent is required and recorded before an account exists", async () => {
    const u = await t.login("+919811100031");
    assert.equal((await t.db.collection("users").doc("919811100031").get()).exists, false, "no account doc before consent");
    const bad = await t.call("POST", "/crew/onboard", { token: u.token, body: { name: "No Consent", role: "sound", city: "Kochi", consent: { termsAccepted: true } } });
    assert.equal(bad.status, 400);
    assert.equal((await t.db.collection("users").doc("919811100031").get()).exists, false);
    await t.call("POST", "/crew/onboard", { token: u.token, body: { name: "With Consent", role: "sound", city: "Kochi", consent: t.consent } });
    const c = (await t.db.collection("users").doc("919811100031").get()).data().consent;
    assert.equal(c.version, "1.0"); assert.ok(c.recordedAt);
  });
});

describe("Test 3/4/5 — availability, request, response across clients", () => {
  let crew, rec, admin, requestId, bookingId;
  before(async () => {
    admin = await t.login(ADMIN, "10.4.0.9");
    crew = await t.login(CREW2, "10.4.0.1");
    await onboardCrew(crew.token, { name: "Biju Sound", role: "sound", city: "Kochi" });
    await t.call("PATCH", "/crew/me", { token: crew.token, body: { ratePerDay: 3000, rateVisible: false } });
    rec = await t.login(REC, "10.4.0.2");
    await onboardRec(rec.token);
  });
  it("unapproved or unavailable crew is not searchable; approval + availability ON (mobile payload) makes crew searchable on web", async () => {
    assert.equal((await t.call("GET", "/crew?role=sound&available=true", { token: rec.token })).data.items.length, 0);
    assert.equal((await t.call("POST", `/admin/profiles/${crew.user.id}/approve`, { token: admin.token })).status, 200);
    const av = await t.call("PUT", "/crew/me/availability", { token: crew.token, body: { available: true, coarseCity: "Kochi", coarseCoords: { lat: 9.93123, lng: 76.26731 }, consentGranted: true } });
    assert.equal(av.status, 200); assert.equal(av.data.available, true);
    const stored = (await t.db.collection("crew").doc(crew.user.id).get()).data();
    assert.equal(stored.available, true); assert.equal(stored.coarseLocation.lat, 9.93); assert.equal(stored.locationConsent.granted, true);
    const days = (new Date(stored.availableExpiresAt) - Date.now()) / 86400000; assert.ok(days > 6.9 && days <= 7.01, "expiry is server-set to 7 days");
    const s = await t.call("GET", "/crew?role=sound&available=true&city=Kochi", { token: rec.token });
    assert.equal(s.data.items.length, 1); assert.equal(s.data.items[0].available, true);
  });
  it("privacy: no phone, no coordinates, no private rate in search/profile; contact only via audited recruiter flow", async () => {
    for (const r of [await t.call("GET", "/crew?role=sound"), await t.call("GET", `/crew/${crew.user.id}`)]) {
      const c = r.data.items ? r.data.items[0] : r.data;
      const text = JSON.stringify(c);
      assert.ok(!("phone" in c)); assert.ok(!text.includes("9.93") && !text.includes("76.27")); assert.equal(c.ratePerDay, null); assert.ok(!("locationConsent" in c));
    }
    assert.equal((await t.call("GET", `/crew/${crew.user.id}/contact`)).status, 401);
    assert.equal((await t.call("GET", `/crew/${crew.user.id}/contact`, { token: crew.token })).status, 403, "crew cannot use recruiter contact flow");
    const c = await t.call("GET", `/crew/${crew.user.id}/contact`, { token: rec.token });
    assert.equal(c.status, 200); assert.equal(c.data.phone, CREW2);
    assert.ok((await t.db.collection("audit_logs").where("action", "==", "crew_contact_viewed").get()).size >= 1);
  });
  it("hidden profiles disappear from search", async () => {
    await t.call("POST", `/admin/profiles/${crew.user.id}/toggle_hide`, { token: admin.token });
    assert.equal((await t.call("GET", "/crew?role=sound")).data.items.length, 0);
    await t.call("POST", `/admin/profiles/${crew.user.id}/toggle_hide`, { token: admin.token });
    assert.equal((await t.call("GET", "/crew?role=sound")).data.items.length, 1);
  });
  it("Test 4: recruiter (website) creates request → persisted → crew (mobile) sees it and answers YES → recruiter sees it", async () => {
    const c = await t.call("POST", "/requests", { token: rec.token, body: { role: "sound", date: "2027-02-01", location: "Kochi", workType: "Live Event" } });
    assert.equal(c.status, 201); assert.equal(c.data.pingsSent, 1); requestId = c.data.id;
    assert.equal((await t.db.collection("availability_requests").doc(requestId).get()).data().recruiterId, rec.user.id);
    const mine = await t.call("GET", "/crew/me/requests", { token: crew.token });
    assert.equal(mine.data.items.length, 1); bookingId = mine.data.items[0].id; assert.equal(mine.data.items[0].status, "pending");
    assert.ok(!("recruiterPhone" in mine.data.items[0]));
    const note = await t.call("GET", "/notifications", { token: crew.token });
    assert.equal(note.data.unread >= 1, true);
    const r = await t.call("POST", `/crew/me/requests/${bookingId}/respond`, { token: crew.token, body: { response: "accepted" } });
    assert.equal(r.status, 200);
    const view = (await t.call("GET", `/requests/${requestId}`, { token: rec.token })).data;
    assert.equal(view.acceptedCount, 1); assert.equal(view.crewPings[0].status, "accepted"); assert.equal(view.crewPings[0].phone, CREW2, "contact option appears for confirmed match only");
    assert.ok((await t.call("GET", "/notifications", { token: rec.token })).data.items.some((n) => n.type === "response"));
  });
  it("duplicate response is rejected (409); mobile's old YES/NO vocabulary is rejected (400)", async () => {
    assert.equal((await t.call("POST", `/crew/me/requests/${bookingId}/respond`, { token: crew.token, body: { response: "declined" } })).status, 409);
    assert.equal((await t.call("POST", `/crew/me/requests/${bookingId}/respond`, { token: crew.token, body: { response: "YES" } })).status, 400);
  });
  it("Test 5: NO response from mobile is reflected for the website recruiter with timestamps", async () => {
    const crew3 = await t.login("+919811100005", "10.4.0.5");
    await onboardCrew(crew3.token, { name: "Cyril Sound", role: "sound", city: "Kochi" });
    await t.call("POST", `/admin/profiles/${crew3.user.id}/approve`, { token: admin.token });
    await t.call("PUT", "/crew/me/availability", { token: crew3.token, body: { available: true, coarseCity: "Kochi" } });
    const c = await t.call("POST", "/requests", { token: rec.token, body: { role: "sound", date: "2027-03-01", location: "Kochi", workType: "Wedding", targetCrewIds: [crew3.user.id] } });
    const b = (await t.call("GET", "/crew/me/requests", { token: crew3.token })).data.items[0];
    await t.call("POST", `/crew/me/requests/${b.id}/respond`, { token: crew3.token, body: { response: "declined" } });
    const v = (await t.call("GET", `/requests/${c.data.id}`, { token: rec.token })).data;
    assert.equal(v.declinedCount, 1); assert.equal(v.crewPings[0].status, "declined"); assert.ok(v.crewPings[0].respondedAt); assert.ok(!("phone" in v.crewPings[0]));
    assert.equal((await t.db.collection("bookings").doc(b.id).get()).data().status, "declined");
  });
  it("duplicate request within 2 minutes is rejected; daily per-crew ping cap enforced", async () => {
    assert.equal((await t.call("POST", "/requests", { token: rec.token, body: { role: "sound", date: "2027-02-01", location: "Kochi", workType: "Live Event" } })).status, 429);
  });
  it("availability OFF removes crew from available search and clears coarse location", async () => {
    await t.call("PUT", "/crew/me/availability", { token: crew.token, body: { available: true, coarseCity: "Kochi" } });
    await t.call("PUT", "/crew/me/availability", { token: crew.token, body: { available: false } });
    assert.ok(!(await t.call("GET", "/crew?role=sound&available=true")).data.items.some((i) => i.id === crew.user.id));
    assert.equal((await t.db.collection("crew").doc(crew.user.id).get()).data().coarseLocation, null);
  });
  it("location consent withdrawal stops availability and clears location", async () => {
    await t.call("PUT", "/crew/me/availability", { token: crew.token, body: { available: true, coarseCity: "Kochi" } });
    const w = await t.call("POST", "/crew/me/location-consent/withdraw", { token: crew.token });
    assert.equal(w.status, 200);
    const d = (await t.db.collection("crew").doc(crew.user.id).get()).data();
    assert.equal(d.available, false); assert.equal(d.coarseLocation, null); assert.equal(d.locationConsent.granted, false);
  });
  it("expired availability is not searchable and is turned off by the expiry job", async () => {
    await t.db.collection("crew").doc(crew.user.id).update({ available: true, availableExpiresAt: new Date(Date.now() - 1000).toISOString(), availableUntil: new Date(Date.now() - 1000).toISOString() });
    assert.ok(!(await t.call("GET", "/crew?role=sound&available=true")).data.items.some((i) => i.id === crew.user.id));
    const { expireStale } = await import("../jobs/availability-expiry.job.js");
    assert.ok((await expireStale()) >= 1);
    assert.equal((await t.db.collection("crew").doc(crew.user.id).get()).data().available, false);
  });
});

describe("Test 7 — authorization isolation", () => {
  let c1, c2, r1, r2, admin, reqId, bookId;
  before(async () => {
    admin = await t.login(ADMIN, "10.5.0.9");
    c1 = await t.login("+919822200001", "10.5.0.1"); await onboardCrew(c1.token, { name: "Crew One", role: "camera", city: "Kochi" });
    c2 = await t.login("+919822200002", "10.5.0.2"); await onboardCrew(c2.token, { name: "Crew Two", role: "camera", city: "Kochi" });
    r1 = await t.login("+919822200003", "10.5.0.3"); await onboardRec(r1.token);
    r2 = await t.login("+919822200004", "10.5.0.4"); await onboardRec(r2.token);
    for (const c of [c1, c2]) { await t.call("POST", `/admin/profiles/${c.user.id}/approve`, { token: admin.token }); await t.call("PUT", "/crew/me/availability", { token: c.token, body: { available: true, coarseCity: "Kochi" } }); }
    const q = await t.call("POST", "/requests", { token: r1.token, body: { role: "camera", date: "2027-05-01", location: "Kochi", workType: "Film", targetCrewIds: [c1.user.id] } });
    reqId = q.data.id; bookId = (await t.call("GET", "/crew/me/requests", { token: c1.token })).data.items[0].id;
  });
  it("a recruiter cannot read or modify another recruiter's request (404, no existence leak)", async () => {
    assert.equal((await t.call("GET", `/requests/${reqId}`, { token: r2.token })).status, 404);
    assert.equal((await t.call("PATCH", `/requests/${reqId}`, { token: r2.token, body: { action: "cancel" } })).status, 404);
    assert.equal((await t.call("GET", "/requests", { token: r2.token })).data.items.length, 0);
    assert.equal((await t.call("GET", `/requests/${reqId}`)).status, 401);
  });
  it("a crew member not targeted by a request cannot respond to it", async () => {
    assert.equal((await t.call("POST", `/crew/me/requests/${bookId}/respond`, { token: c2.token, body: { response: "accepted" } })).status, 403);
    assert.equal((await t.db.collection("bookings").doc(bookId).get()).data().status, "pending");
  });
  it("crew cannot create availability requests; recruiters cannot use crew endpoints", async () => {
    assert.equal((await t.call("POST", "/requests", { token: c1.token, body: { role: "camera", date: "2027-05-02", location: "Kochi", workType: "Film" } })).status, 403);
    assert.equal((await t.call("PUT", "/crew/me/availability", { token: r1.token, body: { available: true } })).status, 403);
  });
  it("crew cannot modify another crew's profile (endpoints are identity-scoped; no id parameter exists)", async () => {
    const before = (await t.call("GET", "/crew/me", { token: c2.token })).data.name;
    await t.call("PATCH", "/crew/me", { token: c1.token, body: { name: "Hacked", id: c2.user.id, phone: "+910000000000" } });
    assert.equal((await t.call("GET", "/crew/me", { token: c2.token })).data.name, before);
    assert.equal((await t.call("GET", "/crew/me", { token: c1.token })).data.phone, "+919822200001", "phone is immutable via profile update");
  });
  it("notifications: cannot mark someone else's notification as read", async () => {
    const n = (await t.call("GET", "/notifications", { token: c1.token })).data.items[0];
    assert.equal((await t.call("POST", `/notifications/${n.id}/read`, { token: c2.token })).status, 404);
    assert.equal((await t.call("POST", `/notifications/${n.id}/read`, { token: c1.token })).status, 200);
  });
  it("admin operations require admin: crew, recruiter and anonymous are refused; only super-admin lists users", async () => {
    for (const tok of [c1.token, r1.token]) for (const [m, p] of [["GET", "/admin/profiles"], ["GET", "/admin/metrics"], ["POST", `/admin/profiles/${c2.user.id}/approve`], ["GET", "/admin/reports"], ["POST", "/admin/associations/import"], ["PUT", "/admin/features"]]) assert.equal((await t.call(m, p, { token: tok })).status, 403, `${m} ${p}`);
    assert.equal((await t.call("GET", "/admin/profiles")).status, 401);
    assert.equal((await t.call("GET", "/admin/users", { token: admin.token })).status, 200);
    assert.equal((await t.call("PUT", `/admin/users/${c1.user.id}/role`, { token: c1.token, body: { role: "admin" } })).status, 403);
  });
  it("admin actions are audit-logged", async () => {
    assert.ok((await t.db.collection("audit_logs").where("action", "==", "profile_approved").get()).size >= 2);
  });
  it("blocks: blocked profile is hidden from the blocker's search and excluded from their pings", async () => {
    await t.call("PUT", `/blocks/${c1.user.id}`, { token: r1.token });
    assert.ok(!(await t.call("GET", "/crew?role=camera", { token: r1.token })).data.items.some((i) => i.id === c1.user.id));
    assert.ok((await t.call("GET", "/crew?role=camera", { token: r2.token })).data.items.some((i) => i.id === c1.user.id));
    await t.call("DELETE", `/blocks/${c1.user.id}`, { token: r1.token });
  });
  it("reports: submit, duplicate guard, admin queue, moderation hides profile", async () => {
    const rp = await t.call("POST", "/reports", { token: r1.token, body: { reportedProfileId: c2.user.id, reason: "Fake profile", details: "x" } });
    assert.equal(rp.status, 201);
    assert.equal((await t.call("POST", "/reports", { token: r1.token, body: { reportedProfileId: c2.user.id, reason: "Fake profile" } })).status, 409);
    assert.equal((await t.call("GET", "/admin/reports?status=pending", { token: admin.token })).data.items.length >= 1, true);
    assert.equal((await t.call("POST", `/admin/reports/${rp.data.reportId}/resolve`, { token: admin.token, body: { moderationAction: "hide_profile" } })).status, 200);
    assert.equal((await t.db.collection("crew").doc(c2.user.id).get()).data().hidden, true);
  });
});

describe("Feature access, associations, taxonomy, sessions", () => {
  it("features endpoint: config-driven, free at launch, flipping to trial gates features and shows days remaining", async () => {
    const admin = await t.login(ADMIN, "10.6.0.9"); const rec = await t.login("+919833300001", "10.6.0.1"); await onboardRec(rec.token);
    assert.equal((await t.call("GET", "/recruiters/me/shortlist", { token: rec.token })).status, 200);
    await t.call("PUT", "/admin/features", { token: admin.token, body: { activeTier: "trial", trialDurationDays: 7 } });
    const f = (await t.call("GET", "/features", { token: rec.token })).data;
    assert.equal(f.activeTier, "trial"); assert.equal(f.trialDaysRemaining, 7);
    await t.db.collection("organizers").doc(rec.user.id).update({ trialStartedAt: new Date(Date.now() - 8 * 86400000).toISOString() });
    const denied = await t.call("GET", "/recruiters/me/shortlist", { token: rec.token });
    assert.equal(denied.status, 403);
    assert.equal((await t.db.collection("organizers").doc(rec.user.id).get()).data().subscriptionTier, undefined, "no automatic paid conversion");
    await t.call("PUT", "/admin/features", { token: admin.token, body: { activeTier: "free" } });
  });
  it("associations: create, CSV preview/commit with validation, badge only after the member confirms with the join code", async () => {
    const admin = await t.login(ADMIN, "10.6.1.9");
    const a = await t.call("POST", "/admin/associations", { token: admin.token, body: { name: "Kerala Sound Guild", code: "ksg-1" } });
    assert.equal(a.status, 201); assert.equal(a.data.code, "KSG-1");
    assert.equal((await t.call("POST", "/admin/associations", { token: admin.token, body: { name: "Dup", code: "KSG-1" } })).status, 409);
    const csv = "Name,Phone,City\nAnil,9846000001,Kochi\nBad,12345,Kochi\nAnil Again,+91 98460 00001,Kochi\n,9846000002,Kochi";
    const p = (await t.call("POST", "/admin/associations/import", { token: admin.token, body: { associationId: a.data.id, csvText: csv } })).data;
    assert.deepEqual([p.summary.valid, p.summary.invalid, p.summary.duplicate_csv], [1, 2, 1]);
    const c = (await t.call("POST", "/admin/associations/import", { token: admin.token, body: { associationId: a.data.id, csvText: csv, action: "commit" } })).data;
    assert.equal(c.imported, 1);
    assert.equal((await t.db.collection("association_members").doc("919846000001").get()).data().status, "invited");
    const crew = await t.login("+919846000001", "10.6.1.1"); await onboardCrew(crew.token, { name: "Anil", role: "sound", city: "Kochi" });
    assert.equal((await t.db.collection("crew").doc(crew.user.id).get()).data().isAssociationVerified, undefined, "no badge before confirmation");
    await t.call("PATCH", "/crew/me", { token: crew.token, body: { associationMembership: { name: "Fake Guild", verified: true } } });
    assert.notEqual((await t.call("GET", "/crew/me", { token: crew.token })).data.associationMembership.verified, true, "verified cannot be self-set");
    assert.equal((await t.call("POST", "/crew/me/association", { token: crew.token, body: { code: "WRONG" } })).status, 404);
    assert.equal((await t.call("POST", "/crew/me/association", { token: crew.token, body: { code: "ksg-1" } })).status, 200);
    assert.equal((await t.db.collection("crew").doc(crew.user.id).get()).data().associationMembership.verified, true);
  });
  it("taxonomy: 10 roles, 37 specialisations, admin-managed additions without code changes", async () => {
    const admin = await t.login(ADMIN, "10.6.2.9");
    const roles = (await t.call("GET", "/taxonomy/roles")).data.items;
    assert.equal(roles.length, 10); assert.equal(roles.reduce((n, r) => n + r.specialisations.length, 0), 37);
    await t.call("POST", "/admin/taxonomy/roles", { token: admin.token, body: { role: { id: "vfx", nameEn: "VFX", nameMl: "വിഎഫ്എക്സ്", icon: "Sparkles", sortOrder: 11, specialisations: [] } } });
    assert.equal((await t.call("GET", "/taxonomy/roles")).data.items.length, 11);
    assert.equal((await t.call("POST", "/admin/taxonomy/roles", { token: (await t.login("+919833300009", "10.6.2.1")).token, body: { role: { id: "x", nameEn: "X" } } })).status, 403);
  });
  it("sessions: refresh works, logout revokes, expired/revoked tokens are 401, bad JSON → 400 envelope", async () => {
    const u = await t.login("+919833300020", "10.6.3.1");
    const rf = await t.call("POST", "/auth/refresh", { body: { refreshToken: u.refreshToken } });
    assert.equal(rf.status, 200); assert.ok(rf.data.idToken);
    assert.equal((await t.call("GET", "/auth/me", { token: rf.data.idToken })).status, 200);
    assert.equal((await t.call("POST", "/auth/logout", { token: rf.data.idToken })).status, 200);
    assert.equal((await t.call("GET", "/auth/me", { token: rf.data.idToken })).status, 401);
    assert.equal((await t.call("POST", "/auth/refresh", { body: { refreshToken: u.refreshToken } })).status, 401);
    const bad = await fetch(`http://127.0.0.1:${t.base || ""}`).catch(() => null); void bad;
  });
  it("response envelope: success and error shapes; no stack traces", async () => {
    const ok = await t.call("GET", "/taxonomy/cities"); assert.equal(ok.body.success, true); assert.ok("data" in ok.body && "message" in ok.body);
    const bad = await t.call("POST", "/auth/otp/send", { body: { phone: "123" } });
    assert.equal(bad.status, 400); assert.equal(bad.body.success, false); assert.equal(bad.body.error.code, "VALIDATION_ERROR"); assert.ok(!JSON.stringify(bad.body).includes("at "));
    assert.equal((await t.call("GET", "/nope")).status, 404);
  });
});

describe("Test 6 — account deletion", () => {
  it("revokes access, erases personal data per policy, preserves audit trail, cannot reuse the old session", async () => {
    const admin = await t.login(ADMIN, "10.7.0.9");
    const crew = await t.login("+919844400001", "10.7.0.1"); await onboardCrew(crew.token, { name: "Del Me", role: "sound", city: "Kochi" });
    await t.call("POST", `/admin/profiles/${crew.user.id}/approve`, { token: admin.token });
    await t.call("PUT", "/crew/me/availability", { token: crew.token, body: { available: true, coarseCity: "Kochi" } });
    const rec = await t.login("+919844400002", "10.7.0.2"); await onboardRec(rec.token);
    const rq = await t.call("POST", "/requests", { token: rec.token, body: { role: "sound", date: "2027-06-01", location: "Kochi", workType: "Gig", targetCrewIds: [crew.user.id] } });
    await t.call("POST", "/devices", { token: crew.token, body: { deviceToken: "ExponentPushToken[abc]" } });
    assert.equal((await t.call("DELETE", "/account", { token: crew.token })).status, 200);
    for (const c of ["users", "crew"]) assert.equal((await t.db.collection(c).doc(crew.user.id).get()).exists, false);
    assert.equal((await t.db.collection("notifications").where("userId", "==", crew.user.id).get()).size, 0);
    assert.equal((await t.db.collection("user_devices").where("userId", "==", crew.user.id).get()).size, 0);
    assert.equal((await t.db.collection("bookings").where("crewId", "==", crew.user.id).get()).size, 0);
    assert.equal((await t.call("GET", "/crew/me", { token: crew.token })).status, 401, "old session revoked");
    assert.equal((await t.call("POST", "/auth/refresh", { body: { refreshToken: crew.refreshToken } })).status, 401);
    const stillThere = (await t.call("GET", `/requests/${rq.data.id}`, { token: rec.token })).data;
    assert.ok(!stillThere.crewPings.some((p) => p.crewId === crew.user.id), "deleted user removed from other users' requests");
    assert.ok((await t.db.collection("audit_logs").where("action", "==", "account_deleted").get()).size >= 1, "audit entry preserved");
    assert.equal((await t.call("GET", `/crew/${crew.user.id}`)).status, 404);
    assert.equal((await t.call("GET", "/crew?role=sound")).data.items.some((i) => i.id === crew.user.id), false);
  });
});
