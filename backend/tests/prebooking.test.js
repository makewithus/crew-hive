import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./helpers.js";
import { phoneToDocId } from "@crew-hive/shared";

describe("I7 [P2] — Pre-bookings with Date Holds", () => {
  let t;
  const prevFlag = process.env.PRE_BOOKINGS_ENABLED;

  before(async () => {
    t = await boot();
  });

  after(async () => {
    process.env.PRE_BOOKINGS_ENABLED = prevFlag;
    await t.close();
  });

  const recruiterPhone = "+919876500001";
  const crewPhone = "+919876500002";
  const otherRecruiterPhone = "+919876500003";

  let recruiterToken;
  let crewToken;
  let otherRecruiterToken;

  test("0. Setup users: recruiter and crew", async () => {
    // Recruiter onboarding
    const rAuth = await t.login(recruiterPhone, "10.0.0.10");
    recruiterToken = rAuth.token;
    await t.call("POST", "/recruiters/onboard", {
      token: recruiterToken,
      body: { name: "Apex Events", companyName: "Apex Events Pvt Ltd", city: "Kochi", consent: t.consent },
    });

    // Crew onboarding
    const cAuth = await t.login(crewPhone, "10.0.0.11");
    crewToken = cAuth.token;
    await t.call("POST", "/crew/onboard", {
      token: crewToken,
      body: { name: "Anand Sound", role: "sound", city: "Kochi", consent: t.consent },
    });
    // Approve crew
    await t.db.collection("users").doc(phoneToDocId(crewPhone)).update({ approved: true });

    // Second recruiter
    const r2Auth = await t.login(otherRecruiterPhone, "10.0.0.12");
    otherRecruiterToken = r2Auth.token;
    await t.call("POST", "/recruiters/onboard", {
      token: otherRecruiterToken,
      body: { name: "Cochin Productions", companyName: "Cochin Productions", city: "Kochi", consent: t.consent },
    });
  });

  test("1. When PRE_BOOKINGS_ENABLED is not set, hold request is rejected with 400", async () => {
    delete process.env.PRE_BOOKINGS_ENABLED;
    const res = await t.call("POST", "/prebookings", {
      token: recruiterToken,
      body: {
        crewId: crewPhone,
        date: "2027-02-15",
        eventName: "Kochi Fest",
      },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /disabled/i);
  });

  test("2. With PRE_BOOKINGS_ENABLED='true', recruiter creates a 48h date hold", async () => {
    process.env.PRE_BOOKINGS_ENABLED = "true";
    const res = await t.call("POST", "/prebookings", {
      token: recruiterToken,
      body: {
        crewId: crewPhone,
        date: "2027-02-15",
        endDate: "2027-02-16",
        eventName: "Kochi Fest 2027",
        location: "Bolgatty Palace",
        offeredRate: 7500,
        notes: "Setup starts at 6 AM",
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.status, "pending");
    assert.equal(res.data.eventName, "Kochi Fest 2027");
    assert.equal(res.data.crewId, phoneToDocId(crewPhone));
    assert.ok(res.data.holdExpiresAt);
  });

  test("3. Conflicting hold creation is rejected with 409 Conflict", async () => {
    // Other recruiter attempts to hold the same crew on same date
    const res = await t.call("POST", "/prebookings", {
      token: otherRecruiterToken,
      body: {
        crewId: crewPhone,
        date: "2027-02-15",
        eventName: "Competing Concert",
      },
    });

    assert.equal(res.status, 409);
    assert.match(res.body.error.message, /active hold or confirmed booking/i);
  });

  test("4. Crew lists date holds and views incoming request", async () => {
    const res = await t.call("GET", "/prebookings", { token: crewToken });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.items));
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].eventName, "Kochi Fest 2027");
  });

  test("5. Recruiter cannot accept/decline; only crew can respond (403)", async () => {
    const holds = await t.call("GET", "/prebookings", { token: crewToken });
    const holdId = holds.data.items[0].id;

    const res = await t.call("PATCH", `/prebookings/${holdId}/status`, {
      token: recruiterToken,
      body: { status: "accepted" },
    });
    assert.equal(res.status, 403);
  });

  test("6. Crew accepts the hold -> status becomes 'accepted'", async () => {
    const holds = await t.call("GET", "/prebookings", { token: crewToken });
    const holdId = holds.data.items[0].id;

    const res = await t.call("PATCH", `/prebookings/${holdId}/status`, {
      token: crewToken,
      body: { status: "accepted" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, "accepted");

    // Recruiter also sees the accepted status
    const rHolds = await t.call("GET", "/prebookings", { token: recruiterToken });
    const match = rHolds.data.items.find((h) => h.id === holdId);
    assert.equal(match.status, "accepted");
  });

  test("7. Only booking recruiter can cancel a hold; crew cannot cancel (403)", async () => {
    // Create another hold on a different date
    const hRes = await t.call("POST", "/prebookings", {
      token: recruiterToken,
      body: {
        crewId: crewPhone,
        date: "2027-03-01",
        eventName: "Trivandrum Film Awards",
      },
    });
    assert.equal(hRes.status, 201);
    const holdId = hRes.data.id;

    // Crew attempts to cancel -> 403
    const crewCancel = await t.call("PATCH", `/prebookings/${holdId}/status`, {
      token: crewToken,
      body: { status: "cancelled" },
    });
    assert.equal(crewCancel.status, 403);

    // Recruiter cancels -> 200
    const recCancel = await t.call("PATCH", `/prebookings/${holdId}/status`, {
      token: recruiterToken,
      body: { status: "cancelled" },
    });
    assert.equal(recCancel.status, 200);
    assert.equal(recCancel.data.status, "cancelled");
  });
});
