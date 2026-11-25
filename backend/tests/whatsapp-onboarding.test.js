import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { boot } from "./helpers.js";
import { phoneToDocId } from "@crew-hive/shared";

describe("C14 — WhatsApp Conversational Onboarding Flow & Idempotency", () => {
  let t;
  before(async () => {
    t = await boot();
  });
  after(async () => {
    await t.close();
  });

  const testPhone = "+919847012345";
  const docId = phoneToDocId(testPhone);

  const signAndCall = (body) => {
    const raw = JSON.stringify(body);
    const sig = crypto.createHmac("sha256", "test-secret").update(raw).digest("hex");
    return t.call("POST", "/whatsapp/webhook", {
      body,
      headers: { "x-signature": sig },
    });
  };

  test("1. New user sends 'Hi' -> starts onboarding state machine awaiting role", async () => {
    const res = await signAndCall({
      id: "msg_001",
      from: testPhone,
      body: "Hi",
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, "started");
    assert.equal(res.data.step, "AWAITING_ROLE");

    // Session doc exists in Firestore
    const sessionDoc = await t.db.collection("whatsapp_sessions").doc(docId).get();
    assert.equal(sessionDoc.exists, true);
    assert.equal(sessionDoc.data().step, "AWAITING_ROLE");
  });

  test("2. Idempotency: duplicate message ID is safely recognized", async () => {
    const res = await signAndCall({
      id: "msg_001", // same ID
      from: testPhone,
      body: "Hi",
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.duplicate, true);
  });

  test("3. User selects role ('2' for Sound) -> advances to AWAITING_CITY", async () => {
    const res = await signAndCall({
      id: "msg_002",
      from: testPhone,
      body: "2",
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, "role_saved");
    assert.equal(res.data.role, "sound");
    assert.equal(res.data.step, "AWAITING_CITY");

    const sessionDoc = await t.db.collection("whatsapp_sessions").doc(docId).get();
    assert.equal(sessionDoc.data().role, "sound");
    assert.equal(sessionDoc.data().step, "AWAITING_CITY");
  });

  test("4. User selects city ('1' for Kochi) -> advances to AWAITING_NAME", async () => {
    const res = await signAndCall({
      id: "msg_003",
      from: testPhone,
      body: "1",
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, "city_saved");
    assert.equal(res.data.city, "Kochi");
    assert.equal(res.data.step, "AWAITING_NAME");
  });

  test("5. User sends name ('Arjun Nair') -> completes account creation in unified DB", async () => {
    const res = await signAndCall({
      id: "msg_004",
      from: testPhone,
      body: "Arjun Nair",
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, "completed");
    assert.equal(res.data.crewId, docId);

    // Verify user document in 'users' collection
    const userSnap = await t.db.collection("users").doc(docId).get();
    assert.equal(userSnap.exists, true);
    assert.equal(userSnap.data().name, "Arjun Nair");
    assert.equal(userSnap.data().role, "crew");
    assert.equal(userSnap.data().consent.version, "1.0");

    // Verify crew document in 'crew' collection
    const crewSnap = await t.db.collection("crew").doc(docId).get();
    assert.equal(crewSnap.exists, true);
    assert.equal(crewSnap.data().name, "Arjun Nair");
    assert.equal(crewSnap.data().role, "sound");
    assert.equal(crewSnap.data().city, "Kochi");
  });

  test("6. Existing user sending 'Hi' is recognized without creating duplicates", async () => {
    const res = await signAndCall({
      id: "msg_005",
      from: testPhone,
      body: "Hi",
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, "existing_user");
    assert.equal(res.data.id, docId);
  });
});
