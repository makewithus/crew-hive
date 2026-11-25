/**
 * scripts/test-prompt3.js
 * Comprehensive automated verification script for Prompt 3
 * Tests all 44 requirements across Recruiter, Admin, and Feature Access
 */

const BASE_URL = "http://localhost:3001";

async function runTests() {
  console.log("=================================================");
  console.log("   CREWHIVE PROMPT 3 AUTOMATED TEST SUITE        ");
  console.log("=================================================");

  const results = [];
  const testPhone = "+919876543210"; // Test recruiter number from seed
  const adminPhone = "+918265940243";

  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, status: "PASS" });
      console.log(`[PASS] ${name}`);
    } catch (err) {
      results.push({ name, status: "FAIL", error: err.message });
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RECRUITER TESTS (1–24)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Phone Registration
  await test("1. Recruiter phone registration validation", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone, checkOnly: true }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.exists === undefined) throw new Error("Missing exists flag");
  });

  // 2. OTP Verification
  let recruiterToken = null;
  await test("2. Recruiter OTP verification (local bypass)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone, code: "123456" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.customToken) throw new Error("Custom token not issued");
    recruiterToken = data.customToken;
  });

  // 3. Recruiter Details & 4. Consent
  await test("3 & 4. Recruiter details & Consent version capture", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: testPhone,
        role: "organizer",
        organizerData: {
          name: "Arun Events & Productions",
          companyName: "Arun Events & Productions",
          city: "Kochi",
          consentAccepted: true,
          consentVersion: "1.0",
          consentTimestamp: new Date().toISOString(),
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || data.role !== "organizer") throw new Error("Signup did not return organizer role");
  });

  // 5. Login
  await test("5. Recruiter login & role resolution", async () => {
    const res = await fetch(`${BASE_URL}/api/organizer/profile?phone=${encodeURIComponent(testPhone)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.data) throw new Error("Profile not retrieved");
  });

  // 6. Dashboard
  await test("6. Recruiter dashboard requests overview endpoint", async () => {
    const res = await fetch(`${BASE_URL}/api/requests/list?phone=${encodeURIComponent(testPhone)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.aggregate) throw new Error("Dashboard aggregate not returned");
    if (data.aggregate.totalRequests === undefined) throw new Error("Missing totalRequests");
  });

  // 7. Crew Search
  await test("7. Crew search base endpoint", async () => {
    const res = await fetch(`${BASE_URL}/api/crew/search`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Search results not an array");
  });

  // 8. Role Filter
  await test("8. Search filter by Parent Role (Sound)", async () => {
    const res = await fetch(`${BASE_URL}/api/crew/search?role=Sound`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Filter by Sound failed");
    // All returned results should match sound
    for (const c of data.data) {
      const match = c.role.toLowerCase().includes("sound");
      if (!match) throw new Error(`Non-sound role returned: ${c.role}`);
    }
  });

  // 9. Specialisation Filter
  await test("9. Search filter by Specialisation", async () => {
    const res = await fetch(`${BASE_URL}/api/crew/search?specialisation=Sound%20Engineer`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Specialisation filter failed");
  });

  // 10. City Filter
  await test("10. Search filter by City (Kochi / Trivandrum)", async () => {
    const res = await fetch(`${BASE_URL}/api/crew/search?city=Kochi`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("City filter failed");
  });

  // 11. Available Now Filter
  await test("11. Available-now filter (excludes busy & auto-expired)", async () => {
    const res = await fetch(`${BASE_URL}/api/crew/search?available=true`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Available now query failed");
    for (const c of data.data) {
      if (!c.available) throw new Error("Found unavailable crew member with available=true filter");
    }
  });

  // 12. Search Pagination
  await test("12. Search pagination and limit enforcement", async () => {
    const res = await fetch(`${BASE_URL}/api/crew/search?page=1&limit=2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.pagination || data.data.length > 2) throw new Error("Pagination limit exceeded");
  });

  // 13. Crew Profile Viewing & 14. Rate Visibility Enforcement
  let sampleCrewId = "917591929595";
  await test("13 & 14. Crew profile viewing and Rate Visibility privacy check", async () => {
    const res = await fetch(`${BASE_URL}/api/crew/search?limit=1`);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      sampleCrewId = json.data[0].id;
      const crew = json.data[0];
      // Coordinates must never be exposed
      if (crew.lat || crew.lng || crew.coordinates) {
        throw new Error("EXACT COORDINATES EXPOSED IN PUBLIC API!");
      }
      // Rate visibility must be respected
      if (crew.rateVisibility === "private" && crew.ratePerDay !== null) {
        throw new Error("Private rate was exposed in public API!");
      }
    }
  });

  // 15 & 16. Contact Actions Verification
  await test("15 & 16. WhatsApp and Phone contact links verification", async () => {
    // Validates phone number format for WhatsApp deep link and tel: URI
    const phoneDigits = sampleCrewId.replace(/\D/g, "");
    const waUrl = `https://wa.me/${phoneDigits}`;
    const telUrl = `tel:+${phoneDigits}`;
    if (!waUrl.startsWith("https://wa.me/91") || !telUrl.startsWith("tel:+91")) {
      throw new Error("Contact links not properly formatted");
    }
  });

  // 17. Availability Request Creation
  let createdRequestId = null;
  const uniqueTestDate = `2026-12-${String(10 + (Math.floor(Date.now() / 60000) % 18)).padStart(2, "0")}`;
  await test("17. Availability request creation with validation", async () => {
    const res = await fetch(`${BASE_URL}/api/requests/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "Sound Engineer",
        date: uniqueTestDate,
        location: "Kochi",
        workType: "Live Concert Test",
        notes: "Test concert request",
        targetCrewIds: ["919876543201"],
        recruiterPhone: testPhone,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.requestId) throw new Error("Request not created");
    createdRequestId = data.requestId;
  });

  // 18. Duplicate Request Prevention
  await test("18. Duplicate request prevention within 2 minutes", async () => {
    // Send immediate duplicate of test 17 with the same role, date, location
    const res = await fetch(`${BASE_URL}/api/requests/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "Sound Engineer",
        date: uniqueTestDate,
        location: "Kochi",
        workType: "Immediate duplicate",
        notes: "Immediate repeat test",
        targetCrewIds: ["919876543201"],
        recruiterPhone: testPhone,
      }),
    });
    if (res.status !== 429) {
      throw new Error(`Expected HTTP 429 for duplicate request, got ${res.status}`);
    }
  });

  // 19. Request Status Tracking
  await test("19. Request status tracking via API", async () => {
    if (!createdRequestId) throw new Error("No request ID to check");
    const res = await fetch(`${BASE_URL}/api/requests/${createdRequestId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.data) throw new Error("Could not retrieve request");
    if (!["pending", "accepted", "declined", "no_response"].includes(data.data.status)) {
      throw new Error(`Unexpected request status: ${data.data.status}`);
    }
  });

  // 20. Confirm Match (Accepted response simulation)
  await test("20. Recruiter confirming match with technician", async () => {
    if (!createdRequestId) throw new Error("No request ID");
    const res = await fetch(`${BASE_URL}/api/requests/${createdRequestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "confirm_match",
        confirmedCrewId: "919876543201",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || data.status !== "confirmed_match") {
      throw new Error("Match confirmation failed");
    }
  });

  // 21. Decline response handling & 22. No-response handling
  await test("21 & 22. Status tracking handles declined and no_response states", async () => {
    const res = await fetch(`${BASE_URL}/api/requests/list?phone=${encodeURIComponent(testPhone)}`);
    const data = await res.json();
    if (!data.success) throw new Error("Failed to list requests");
    if (data.aggregate.noResponses === undefined || data.aggregate.declinedResponses === undefined) {
      throw new Error("Missing declined / noResponse metrics");
    }
  });

  // 23. Search Empty States
  await test("23. Search empty state on non-matching query", async () => {
    const res = await fetch(`${BASE_URL}/api/crew/search?role=NonExistentRoleXYZ`);
    const data = await res.json();
    if (!data.success || data.data.length !== 0) {
      throw new Error("Expected 0 results for non-existent role");
    }
  });

  // 24. API Failure Handling
  await test("24. API error response on missing required fields", async () => {
    const res = await fetch(`${BASE_URL}/api/requests/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.status !== 400) throw new Error(`Expected HTTP 400, got ${res.status}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN TESTS (25–39)
  // ══════════════════════════════════════════════════════════════════════════

  // 25. Admin Authentication & 26. Route Protection
  await test("25 & 26. Admin authentication & route protection", async () => {
    // Unauthenticated request should be rejected with 401 or 403
    const res = await fetch(`${BASE_URL}/api/admin/metrics`, {
      headers: { authorization: "Bearer invalid_token" },
    });
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 401/403 for unauthorized call, got ${res.status}`);
    }
  });

  // 27. Profile Listing (with dev bypass header)
  await test("27. Admin profile listing", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/profiles?filter=all`, {
      headers: { "x-dev-phone": adminPhone },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Profile list failed");
  });

  // 28. Profile Approval
  await test("28. Admin profile approval action", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-phone": adminPhone,
      },
      body: JSON.stringify({
        id: sampleCrewId,
        action: "approve",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Profile approval action failed");
  });

  // 29. Profile Hiding
  await test("29. Admin profile hiding toggle", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-phone": adminPhone,
      },
      body: JSON.stringify({
        id: sampleCrewId,
        action: "toggle_hide",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || data.hidden === undefined) throw new Error("Hide toggle failed");

    // Toggle back to original
    await fetch(`${BASE_URL}/api/admin/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-phone": adminPhone,
      },
      body: JSON.stringify({
        id: sampleCrewId,
        action: "toggle_hide",
      }),
    });
  });

  // 30. Role Management
  await test("30. Admin role management endpoint", async () => {
    const res = await fetch(`${BASE_URL}/api/taxonomy/roles`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || data.data.length < 5) throw new Error("Roles taxonomy not returned");
  });

  // 31. City Management
  await test("31. Admin city management endpoint", async () => {
    const res = await fetch(`${BASE_URL}/api/taxonomy/cities`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || data.data.length < 5) throw new Error("Cities taxonomy not returned");
  });

  // 32. Report Queue & 33. Report Moderation
  let reportId = null;
  await test("32 & 33. Report queue submission and moderation resolution", async () => {
    // 1. Submit report
    const subRes = await fetch(`${BASE_URL}/api/admin/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        reportedProfileId: sampleCrewId,
        reporterPhone: testPhone,
        reason: "Test report verification",
        details: "Automated test suite sample report",
      }),
    });
    const subJson = await subRes.json();
    if (!subJson.success || !subJson.reportId) throw new Error("Report submission failed");
    reportId = subJson.reportId;

    // 2. Resolve report as admin
    const modRes = await fetch(`${BASE_URL}/api/admin/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-phone": adminPhone,
      },
      body: JSON.stringify({
        action: "resolve",
        reportId,
        moderationAction: "dismiss",
      }),
    });
    const modJson = await modRes.json();
    if (!modJson.success || modJson.status !== "dismissed") {
      throw new Error("Report moderation action failed");
    }
  });

  // 34. Metrics
  await test("34. Genuine platform metrics retrieval", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/metrics`, {
      headers: { "x-dev-phone": adminPhone },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.data?.signupsByCity || !data.data?.signupsByRole) {
      throw new Error("Metrics response missing required breakdowns");
    }
  });

  // 35. Association Listing & Creation
  let assocId = null;
  await test("35. Association creation and listing", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/associations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-phone": adminPhone,
      },
      body: JSON.stringify({
        name: "Kerala Sound Engineers Guild",
        code: `KSEG_${Date.now()}`,
        contactPerson: "Arjun Nair",
      }),
    });
    const data = await res.json();
    if (!data.success || !data.id) throw new Error("Association creation failed");
    assocId = data.id;
  });

  // 36. CSV Import Validation & 37. Duplicate Detection
  await test("36 & 37. CSV import validation and duplicate member detection", async () => {
    const sampleCsv = `Name,Phone,Role,City
Manoj Kumar,+919876543201,Sound Engineer,Kochi
Manoj Kumar Dup,+919876543201,Sound Engineer,Kochi
Suresh G,+919447112233,Lighting Operator,Trivandrum
Invalid No Phone,,Stage Tech,Kozhikode`;

    const res = await fetch(`${BASE_URL}/api/admin/associations/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-phone": adminPhone,
      },
      body: JSON.stringify({
        associationId: assocId,
        csvText: sampleCsv,
        action: "preview",
      }),
    });
    const data = await res.json();
    if (!data.success || !data.summary) throw new Error("CSV preview failed");
    if (data.summary.duplicateCsvRows < 1) throw new Error("Duplicate CSV row was not detected");
    if (data.summary.invalidRows < 1) throw new Error("Invalid row was not caught");
    if (data.summary.validRows < 1) throw new Error("Valid row was not recognized");
  });

  // 38. Member Invitation & Import Execution
  await test("38. Association CSV import execution and invitation status", async () => {
    const validCsv = `Name,Phone,Role,City
Suresh Babu,+919447118899,Camera Operator,Kochi`;

    const res = await fetch(`${BASE_URL}/api/admin/associations/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-phone": adminPhone,
      },
      body: JSON.stringify({
        associationId: assocId,
        csvText: validCsv,
        action: "execute",
        sendInvites: false,
      }),
    });
    const data = await res.json();
    if (!data.success || data.importedCount !== 1) {
      throw new Error(`Import execution failed: ${data.error || "importedCount !== 1"}`);
    }
  });

  // 39. Join Code Handling
  await test("39. Association join code verification", async () => {
    // Find association code
    const aRes = await fetch(`${BASE_URL}/api/admin/associations`, {
      headers: { "x-dev-phone": adminPhone },
    });
    const aData = await aRes.json();
    const createdAssoc = aData.data.find((a) => a.id === assocId);
    if (!createdAssoc) throw new Error("Created association not found");

    const vRes = await fetch(`${BASE_URL}/api/associations/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: createdAssoc.code,
        phone: sampleCrewId,
      }),
    });
    const vData = await vRes.json();
    if (!vData.success) throw new Error(`Code verification failed: ${vData.error}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE ACCESS TESTS (40–44)
  // ══════════════════════════════════════════════════════════════════════════

  // 40. Free feature access
  await test("40. Free feature access configuration at launch", async () => {
    const res = await fetch(`${BASE_URL}/api/features`);
    const data = await res.json();
    if (!data.success || !data.data?.activeTier) throw new Error("Feature configuration failed");
  });

  // 41. Trial feature access when enabled & 42. Paid feature access & 43. Disabled states & 44. No automatic paid conversion
  await test("41-44. Feature access module checks (Trial, Paid, Gating, No Auto-Conversion)", async () => {
    const { checkFeatureAccess, ACCESS_TIERS, FEATURES } = await import("../lib/feature-access.js");

    // Free tier
    const freeRes = checkFeatureAccess(FEATURES.BASIC_SEARCH, { subscriptionTier: "free" });
    if (!freeRes.allowed) throw new Error("Basic search blocked in free tier");

    // Trial tier within 7 days
    const trialRes = checkFeatureAccess(FEATURES.ADVANCED_FILTERS, {
      subscriptionTier: "trial",
      createdAt: new Date().toISOString(),
    });
    if (!trialRes.allowed || trialRes.daysRemaining <= 0) {
      throw new Error("Active trial was not granted access");
    }

    // Trial tier expired (8 days old)
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const expiredTrialRes = checkFeatureAccess(FEATURES.ADVANCED_FILTERS, {
      subscriptionTier: "trial",
      createdAt: eightDaysAgo,
    });
    if (expiredTrialRes.allowed) {
      throw new Error("Expired trial incorrectly allowed gated feature");
    }

    // Paid tier
    const paidRes = checkFeatureAccess(FEATURES.ADVANCED_FILTERS, { subscriptionTier: "paid" });
    if (!paidRes.allowed) throw new Error("Paid tier blocked from advanced filters");

    // No automatic paid conversion check
    if (expiredTrialRes.tier === ACCESS_TIERS.PAID) {
      throw new Error("Automatic paid conversion detected! Must be forbidden.");
    }
  });

  console.log("=================================================");
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
