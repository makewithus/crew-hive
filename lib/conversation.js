/**
 * Conversation Engine — CrewHive
 * WhatsApp onboarding for Crew and Organizer.
 *
 * Flow (matches spec exactly):
 * CREW:      welcome → role_selection → name → city → crew_role → experience → phone_confirm → complete
 * ORGANIZER: welcome → role_selection → name → company → city → requirements → phone_confirm → complete
 *
 * Key guarantees:
 * - Single message per user action (atomic dedup via Firestore create)
 * - No duplicate processing (60s content dedup window)
 * - Clean step transitions (atomicStepTransition guards)
 * - stale button taps rejected at name/company steps
 */

import { adminDb } from "./firebase-admin";
import logger from "./logger";

// ─── Steps ─────────────────────────────────────────────────────────────────
export const STEPS = {
  ROLE_SELECTION:    "role_selection",
  CREW_NAME:         "crew_name",
  CREW_CITY:         "crew_city",
  CREW_CITY_OTHER:   "crew_city_other",
  CREW_ROLE:         "crew_role",
  CREW_EXPERIENCE:   "crew_experience",
  CREW_PHONE_CONFIRM:"crew_phone_confirm",
  CREW_PHONE_MANUAL: "crew_phone_manual",
  CREW_COMPLETE:     "crew_complete",
  EMP_NAME:          "emp_name",
  EMP_COMPANY:       "emp_company",
  EMP_CITY:          "emp_city",
  EMP_CITY_OTHER:    "emp_city_other",
  EMP_REQUIREMENTS:  "emp_requirements",
  EMP_PHONE_CONFIRM: "emp_phone_confirm",
  EMP_PHONE_MANUAL:  "emp_phone_manual",
  EMP_COMPLETE:      "emp_complete",
  BOOKING_RESPONSE:  "booking_response",
};

// ─── Data ───────────────────────────────────────────────────────────────────
const CREW_ROLES = [
  "Sound Engineer",
  "Lighting Operator",
  "LED Wall Tech",
  "Stage Manager",
  "Rigger",
  "Other",
];

const CITIES = [
  "Kochi",
  "Trivandrum",
  "Kozhikode",
  "Other",
];

// ─── Helpers ────────────────────────────────────────────────────────────────
export const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

const formatPhone = (digits) => {
  const d = String(digits).replace(/\D/g, "");
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 11) return `+${d.slice(0, 1)} ${d.slice(1, 6)} ${d.slice(6)}`;
  return `+${d}`;
};

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || "https://crew-hive.vercel.app";

// ─── Firestore ──────────────────────────────────────────────────────────────
const getUserState = async (phone) => {
  const snap = await adminDb().collection("users").doc(phoneToDocId(phone)).get();
  return snap.exists ? snap.data() : null;
};

const saveUserState = async (phone, updates) => {
  const ref = adminDb().collection("users").doc(phoneToDocId(phone));
  const snap = await ref.get();
  const payload = { ...updates, updatedAt: new Date().toISOString() };
  if (snap.exists) {
    await ref.update(payload);
  } else {
    await ref.set({ phone: `+${phoneToDocId(phone)}`, whatsappPhone: `+${phoneToDocId(phone)}`, createdAt: new Date().toISOString(), ...payload });
  }
};

/**
 * Atomic step transition — returns false if step already moved (idempotent dedup).
 */
const atomicStepTransition = async (phone, expectedStep, updates, lastMsgNorm) => {
  const ref = adminDb().collection("users").doc(phoneToDocId(phone));
  try {
    let moved = false;
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      if (data?.step !== expectedStep) { moved = false; return; }
      const payload = {
        ...updates,
        updatedAt: new Date().toISOString(),
        ...(lastMsgNorm !== undefined ? { lastMsgNorm, lastMsgAt: Date.now() } : {}),
      };
      if (snap.exists) { tx.update(ref, payload); }
      else { tx.set(ref, { phone: `+${phoneToDocId(phone)}`, whatsappPhone: `+${phoneToDocId(phone)}`, createdAt: new Date().toISOString(), ...payload }); }
      moved = true;
    });
    return moved;
  } catch (_) {
    await saveUserState(phone, updates);
    return true;
  }
};

const DUPLICATE_RESPONSE = null;

// ─── Message builders ───────────────────────────────────────────────────────
const txt  = (text, step) => ({ type: "text", text, step, success: true });
const btns = (text, buttons, step, header = null) => ({ type: "buttons", text, buttons, step, success: true, ...(header ? { header } : {}) });
const list = (text, sections, step, buttonText = "Select", header = null) => ({ type: "list", text, sections, step, success: true, buttonText, ...(header ? { header } : {}) });

// ─── Reusable prompts ───────────────────────────────────────────────────────
const roleSelectionMsg = () =>
  btns(
    "Please select your role to get started:",
    [{ id: "crew", title: "👷 Crew" }, { id: "organizer", title: "🎪 Organizer" }],
    STEPS.ROLE_SELECTION,
    "Select Your Role"
  );

const cityListMsg = (step) =>
  list(
    "Which city are you based in?\n\n_Select from the list. If your city isn't listed, choose *Other* and type it._",
    [{ rows: CITIES.map((c, i) => ({ id: c.toLowerCase().replace(/\s/g, "_"), title: `${i + 1}. ${c}` })) }],
    step,
    "🏙️ Choose City",
    "Select Your City"
  );

const crewRoleListMsg = (step) =>
  list(
    "What is your primary *role*?",
    [{ rows: CREW_ROLES.map((r, i) => ({ id: String(i + 1), title: `${i + 1}. ${r}` })) }],
    step,
    "🎬 Choose Role",
    "Select Your Role"
  );

const experienceListMsg = (step) =>
  list(
    "How many years of *experience* do you have?",
    [{ rows: [
      { id: "1", title: "1. 0–2 years",  description: "Fresher / Early career" },
      { id: "2", title: "2. 3–5 years",  description: "Intermediate" },
      { id: "3", title: "3. 5–10 years", description: "Experienced" },
      { id: "4", title: "4. 10+ years",  description: "Senior / Expert" },
    ]}],
    step,
    "📊 Experience",
    "Select Experience Level"
  );

const phoneConfirmMsg = (userId, step) => {
  const display = formatPhone(phoneToDocId(userId));
  return btns(
    `We have your WhatsApp number:\n\n📱 *${display}*\n\nShould we use this number for OTP login on CrewHive?`,
    [{ id: "yes", title: "✅ Yes, use this" }, { id: "no", title: "❌ No, different" }],
    step
  );
};

const crewCompleteMsg = () =>
  txt(
    `✅ *Perfect!*\n\nYour basic profile is created and submitted for admin review.\n\n` +
    `Once our admin approves your profile, you'll receive a WhatsApp notification with your login link.\n\n` +
    `_Sit tight — we'll notify you here!_ 🙏`,
    STEPS.CREW_COMPLETE
  );

const organizerCompleteMsg = () =>
  txt(
    `🎉 *Perfect!*\n\nYour organizer profile is created!\n\n` +
    `Continue to your dashboard and start hiring:\n🔗 *${APP_URL()}*\n\n` +
    `_Use OTP login with your registered number._`,
    STEPS.EMP_COMPLETE
  );

// ─── normaliseMsg ───────────────────────────────────────────────────────────
/**
 * Extract a clean id from any string MSG91 might send.
 * - JSON text fallback: '{"list":{"id":"3",...}}' → "3"
 * - Titled list fallback: "3. Sound Engineer" → "3"
 * - Emoji-prefixed: "✅ Yes, use this" → "yes, use this"
 */
const normaliseMsg = (raw) => {
  let s = String(raw).trim();

  // JSON fallback
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      const p = JSON.parse(s);
      if (typeof p === "object" && p !== null) {
        const id = p?.list_reply?.id ?? p?.button_reply?.id ?? p?.list?.id ?? p?.button?.id ?? p?.id ?? null;
        if (id !== null) { s = String(id).trim(); }
        else {
          const title = p?.list_reply?.title ?? p?.button_reply?.title ?? p?.list?.title ?? p?.button?.title ?? p?.title ?? null;
          if (title) s = String(title).trim();
        }
      }
    } catch (_) {}
  }

  s = s.toLowerCase();
  // "N. Title" → keep just "N"
  const numPrefix = s.match(/^(\d+)\.\s+/);
  if (numPrefix) { s = numPrefix[1]; }
  // Strip leading emoji
  s = s.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}❌✅👷💼📍🎬📊🔔]+\s*/u, "");
  return s.trim();
};

// ─── ROLE guard (stale button taps at name/company step) ────────────────────
const isRoleButtonTap = (norm) => /^(crew|organizer|employer|yes|no|1|2)$/.test(norm);

// ─── Main handler ───────────────────────────────────────────────────────────
export const handleMessage = async ({ userId, message }) => {
  logger.log("[Conv] in | userId:", userId, "| msg:", JSON.stringify(message));
  try {
    const norm = normaliseMsg(message);

    // ── Content-based dedup (60s window) ────────────────────────────────────
    const DEDUP_WINDOW_MS = 60_000;
    const windowKey = Math.floor(Date.now() / DEDUP_WINDOW_MS);
    const safeNorm = norm.replace(/[^a-z0-9]/g, "_").slice(0, 60);
    const dedupId = `${phoneToDocId(userId)}_${safeNorm}_${windowKey}`;
    try {
      await adminDb().collection("dedup").doc(dedupId).create({ ts: Date.now(), phone: userId });
    } catch (err) {
      const code = err?.code ?? 0;
      const msg  = err?.message ?? "";
      if (code === 6 || msg.includes("ALREADY_EXISTS") || msg.includes("already exists")) {
        logger.warn("[Conv] dedup HIT | norm:", norm, "| user:", phoneToDocId(userId));
        return DUPLICATE_RESPONSE;
      }
      logger.warn("[Conv] dedup create error (proceeding):", msg);
    }

    const userState = await getUserState(userId);

    // ── New user ─────────────────────────────────────────────────────────────
    if (!userState) {
      await saveUserState(userId, { step: STEPS.ROLE_SELECTION, role: null, data: {} });
      return [
        txt("👋 *Welcome to CrewHive!*\n\nI'm your onboarding assistant. Let's get you registered in 5 minutes.\n\nThe platform connecting professional crew with organizers in Kerala. 🎬", STEPS.ROLE_SELECTION),
        roleSelectionMsg(),
      ];
    }

    const step = userState.step;

    // ── Restart ──────────────────────────────────────────────────────────────
    if (norm === "restart" || norm === "reset") {
      await saveUserState(userId, { step: STEPS.ROLE_SELECTION, role: null, data: {}, pendingBookingId: null });
      return [
        txt("🔄 *Starting over.*\n\nLet's get you set up on CrewHive!", STEPS.ROLE_SELECTION),
        roleSelectionMsg(),
      ];
    }

    // ── Greeting from existing user ──────────────────────────────────────────
    if (/^(hi+|hey|hello+|hii+|start|helo|yo)$/i.test(norm)) {
      if (step === STEPS.CREW_COMPLETE) {
        if (userState.approved) {
          return txt(`👋 Welcome back!\n\nYour profile is live ✅\n\n🔗 Login: ${APP_URL()}\n\nType *restart* to start over.`, step);
        }
        return txt("👋 Welcome back!\n\nYour crew profile is *pending admin approval*. We'll notify you here once approved.\n\nType *restart* to start over.", step);
      }
      if (step === STEPS.EMP_COMPLETE) {
        return txt(`👋 Welcome back!\n\nYour organizer profile is ready.\n\n🔗 Login: ${APP_URL()}\n\nType *restart* to start fresh.`, step);
      }
      return resumeStep(step, userState, userId);
    }

    // ── ROLE SELECTION ───────────────────────────────────────────────────────
    if (step === STEPS.ROLE_SELECTION) {
      const isCrew     = norm === "crew" || norm === "1" || norm.includes("crew");
      const isOrganizer = norm === "organizer" || norm === "2" || norm.includes("organizer") || norm === "employer";

      if (isCrew) {
        const moved = await atomicStepTransition(userId, STEPS.ROLE_SELECTION, { role: "crew", step: STEPS.CREW_NAME }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return txt("👷 *Crew* selected!\n\nWhat is your *full name*?", STEPS.CREW_NAME);
      }
      if (isOrganizer) {
        const moved = await atomicStepTransition(userId, STEPS.ROLE_SELECTION, { role: "organizer", step: STEPS.EMP_NAME }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return txt("🎪 *Organizer* selected!\n\nWhat is your *full name*?", STEPS.EMP_NAME);
      }
      return roleSelectionMsg();
    }

    // ══════════════ CREW FLOW ═══════════════════════════════════════════════

    if (step === STEPS.CREW_NAME) {
      const name = message.trim();
      if (!name || name.length < 2 || isRoleButtonTap(norm)) {
        return txt("Please enter your *full name* (at least 2 characters):", STEPS.CREW_NAME);
      }
      const moved = await atomicStepTransition(userId, STEPS.CREW_NAME, { "data.name": name, step: STEPS.CREW_CITY }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return cityListMsg(STEPS.CREW_CITY);
    }

    if (step === STEPS.CREW_CITY) {
      // Check "other" first
      if (norm === "other" || norm === String(CITIES.length)) {
        const moved = await atomicStepTransition(userId, STEPS.CREW_CITY, { step: STEPS.CREW_CITY_OTHER }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return txt("Please *type your city name*:", STEPS.CREW_CITY_OTHER);
      }
      const city = matchCity(norm);
      if (!city) { return DUPLICATE_RESPONSE; }
      if (city.toLowerCase() === "other") {
        const moved = await atomicStepTransition(userId, STEPS.CREW_CITY, { step: STEPS.CREW_CITY_OTHER }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return txt("Please *type your city name*:", STEPS.CREW_CITY_OTHER);
      }
      const moved = await atomicStepTransition(userId, STEPS.CREW_CITY, { "data.city": city, step: STEPS.CREW_ROLE }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return crewRoleListMsg(STEPS.CREW_ROLE);
    }

    if (step === STEPS.CREW_CITY_OTHER) {
      const city = message.trim();
      if (!city || city.length < 2) return txt("Please enter a valid city name:", STEPS.CREW_CITY_OTHER);
      const moved = await atomicStepTransition(userId, STEPS.CREW_CITY_OTHER, { "data.city": city, step: STEPS.CREW_ROLE }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return crewRoleListMsg(STEPS.CREW_ROLE);
    }

    if (step === STEPS.CREW_ROLE) {
      const roleIdx = matchCrewRole(norm);
      if (roleIdx < 0) { return DUPLICATE_RESPONSE; }
      const role = CREW_ROLES[roleIdx];
      const moved = await atomicStepTransition(userId, STEPS.CREW_ROLE, { "data.crewRole": role, step: STEPS.CREW_EXPERIENCE }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return experienceListMsg(STEPS.CREW_EXPERIENCE);
    }

    if (step === STEPS.CREW_EXPERIENCE) {
      const expMap = { "1": "0–2 years", "2": "3–5 years", "3": "5–10 years", "4": "10+ years" };
      const expNum = norm.match(/^(\d+)/)?.[1];
      const exp = expMap[expNum];
      if (!exp) return experienceListMsg(STEPS.CREW_EXPERIENCE);
      const moved = await atomicStepTransition(userId, STEPS.CREW_EXPERIENCE, { "data.experience": exp, step: STEPS.CREW_PHONE_CONFIRM }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return phoneConfirmMsg(userId, STEPS.CREW_PHONE_CONFIRM);
    }

    if (step === STEPS.CREW_PHONE_CONFIRM) {
      const isYes = norm === "yes" || norm.includes("yes") || norm.includes("use this");
      const isNo  = norm === "no"  || norm.includes("no")  || norm.includes("different");
      if (isYes) {
        const moved = await atomicStepTransition(userId, STEPS.CREW_PHONE_CONFIRM, { step: STEPS.CREW_COMPLETE }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return await finalizeCrewProfile(userId, `+${phoneToDocId(userId)}`);
      }
      if (isNo) {
        const moved = await atomicStepTransition(userId, STEPS.CREW_PHONE_CONFIRM, { step: STEPS.CREW_PHONE_MANUAL }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return txt("Please type your *phone number* for OTP login:\n\n_Example: +91XXXXXXXXXX_", STEPS.CREW_PHONE_MANUAL);
      }
      return phoneConfirmMsg(userId, STEPS.CREW_PHONE_CONFIRM);
    }

    if (step === STEPS.CREW_PHONE_MANUAL) {
      const phone = message.trim().replace(/\s/g, "");
      if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
        return txt("Please enter a valid phone number:\n_Example: +91XXXXXXXXXX_", STEPS.CREW_PHONE_MANUAL);
      }
      return await finalizeCrewProfile(userId, phone.startsWith("+") ? phone : `+${phone}`);
    }

    // ══════════════ ORGANIZER FLOW ═══════════════════════════════════════════

    if (step === STEPS.EMP_NAME) {
      const name = message.trim();
      if (!name || name.length < 2 || isRoleButtonTap(norm)) return DUPLICATE_RESPONSE;
      const moved = await atomicStepTransition(userId, STEPS.EMP_NAME, { "data.name": name, step: STEPS.EMP_COMPANY }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return txt(`Nice to meet you, *${name}*! 👋\n\nWhat is your *company / production house name*?`, STEPS.EMP_COMPANY);
    }

    if (step === STEPS.EMP_COMPANY) {
      const company = message.trim();
      if (!company || company.length < 1) return txt("Please enter your company name:", STEPS.EMP_COMPANY);
      const moved = await atomicStepTransition(userId, STEPS.EMP_COMPANY, { "data.company": company, step: STEPS.EMP_CITY }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return cityListMsg(STEPS.EMP_CITY);
    }

    if (step === STEPS.EMP_CITY) {
      if (norm === "other" || norm === String(CITIES.length)) {
        const moved = await atomicStepTransition(userId, STEPS.EMP_CITY, { step: STEPS.EMP_CITY_OTHER }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return txt("Please *type your city name*:", STEPS.EMP_CITY_OTHER);
      }
      const city = matchCity(norm);
      if (!city) { return DUPLICATE_RESPONSE; }
      if (city.toLowerCase() === "other") {
        const moved = await atomicStepTransition(userId, STEPS.EMP_CITY, { step: STEPS.EMP_CITY_OTHER }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return txt("Please *type your city name*:", STEPS.EMP_CITY_OTHER);
      }
      const moved = await atomicStepTransition(userId, STEPS.EMP_CITY, { "data.city": city, step: STEPS.EMP_REQUIREMENTS }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return txt(
        `📍 *${city}* noted!\n\nBriefly describe your *hiring requirements*:\n_e.g. "Need a photographer and sound engineer for weekly shoots"_`,
        STEPS.EMP_REQUIREMENTS
      );
    }

    if (step === STEPS.EMP_CITY_OTHER) {
      const city = message.trim();
      if (!city || city.length < 2) return txt("Please enter a valid city name:", STEPS.EMP_CITY_OTHER);
      const moved = await atomicStepTransition(userId, STEPS.EMP_CITY_OTHER, { "data.city": city, step: STEPS.EMP_REQUIREMENTS }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return txt(
        `📍 *${city}* noted!\n\nBriefly describe your *hiring requirements*:\n_e.g. "Need a photographer and sound engineer for weekly shoots"_`,
        STEPS.EMP_REQUIREMENTS
      );
    }

    if (step === STEPS.EMP_REQUIREMENTS) {
      const req = message.trim();
      if (!req || req.length < 5) return txt("Please describe your hiring requirements (at least a few words):", STEPS.EMP_REQUIREMENTS);
      const moved = await atomicStepTransition(userId, STEPS.EMP_REQUIREMENTS, { "data.requirements": req, step: STEPS.EMP_PHONE_CONFIRM }, norm);
      if (!moved) return DUPLICATE_RESPONSE;
      return phoneConfirmMsg(userId, STEPS.EMP_PHONE_CONFIRM);
    }

    if (step === STEPS.EMP_PHONE_CONFIRM) {
      const isYes = norm === "yes" || norm.includes("yes") || norm.includes("use this");
      const isNo  = norm === "no"  || norm.includes("no")  || norm.includes("different");
      if (isYes) {
        const moved = await atomicStepTransition(userId, STEPS.EMP_PHONE_CONFIRM, { step: STEPS.EMP_COMPLETE }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return await finalizeOrganizerProfile(userId, `+${phoneToDocId(userId)}`);
      }
      if (isNo) {
        const moved = await atomicStepTransition(userId, STEPS.EMP_PHONE_CONFIRM, { step: STEPS.EMP_PHONE_MANUAL }, norm);
        if (!moved) return DUPLICATE_RESPONSE;
        return txt("Please type your *phone number* for OTP login:\n\n_Example: +91XXXXXXXXXX_", STEPS.EMP_PHONE_MANUAL);
      }
      return phoneConfirmMsg(userId, STEPS.EMP_PHONE_CONFIRM);
    }

    if (step === STEPS.EMP_PHONE_MANUAL) {
      const phone = message.trim().replace(/\s/g, "");
      if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
        return txt("Please enter a valid phone number:\n_Example: +91XXXXXXXXXX_", STEPS.EMP_PHONE_MANUAL);
      }
      return await finalizeOrganizerProfile(userId, phone.startsWith("+") ? phone : `+${phone}`);
    }

    // ── Already completed ────────────────────────────────────────────────────
    if (step === STEPS.CREW_COMPLETE) {
      if (userState.approved) {
        return txt(`✅ Your profile is approved!\n\n🔗 Login: ${APP_URL()}\n\nType *restart* to start over.`, step);
      }
      return txt("⏳ Your crew profile is *pending admin approval*.\n\nWe'll notify you here on WhatsApp once approved!\n\nType *restart* to start over.", step);
    }
    if (step === STEPS.EMP_COMPLETE) {
      return txt(`✅ Your organizer profile is ready!\n\n🔗 Login: ${APP_URL()}\n\nType *restart* to start over.`, step);
    }

    // ── Booking response ─────────────────────────────────────────────────────
    if (step === STEPS.BOOKING_RESPONSE) {
      const bookingId = userState.pendingBookingId;
      const isYes = norm === "yes" || norm === "y";
      const isNo  = norm === "no"  || norm === "n";
      if (isYes) {
        if (bookingId) {
          const ts = new Date().toISOString();
          await adminDb().collection("bookings").doc(bookingId).update({ status: "accepted", updatedAt: ts });
          await adminDb().collection("crew").doc(phoneToDocId(userId)).update({ available: false, updatedAt: ts });
        }
        await saveUserState(userId, { step: STEPS.CREW_COMPLETE, pendingBookingId: null });
        return txt("✅ *Booking Accepted!*\n\nYou are confirmed for this job. Good luck! 🎬", STEPS.CREW_COMPLETE);
      }
      if (isNo) {
        await saveUserState(userId, { step: STEPS.CREW_COMPLETE, pendingBookingId: null });
        return txt("❌ *Booking Declined.*\n\nNo worries — more opportunities will come! 💪", STEPS.CREW_COMPLETE);
      }
      return btns(
        "🔔 You have a *pending job request*. Are you available?",
        [{ id: "yes", title: "✅ Accept" }, { id: "no", title: "❌ Decline" }],
        STEPS.BOOKING_RESPONSE
      );
    }

    // ── Fallback ─────────────────────────────────────────────────────────────
    return txt("🤔 Type *Hi* to continue where you left off, or *restart* to start over.", step);

  } catch (error) {
    logger.error("[Conv] Error:", error);
    return { success: false, type: "text", text: "Something went wrong. Please try again.", error: error.message };
  }
};

// ─── City matcher ───────────────────────────────────────────────────────────
const matchCity = (norm) => {
  const byId   = CITIES.find((c) => c.toLowerCase().replace(/\s/g, "_") === norm.replace(/\s/g, "_"));
  const byName = CITIES.find((c) => c.toLowerCase() === norm);
  const idxNum = parseInt(norm, 10);
  const byIdx  = !isNaN(idxNum) && idxNum >= 1 && idxNum <= CITIES.length ? CITIES[idxNum - 1] : null;
  return byId || byName || byIdx || null;
};

// ─── Crew role matcher ──────────────────────────────────────────────────────
const matchCrewRole = (norm) => {
  const idxStr = norm.match(/^(\d+)/)?.[1];
  const idx    = idxStr ? parseInt(idxStr, 10) : NaN;
  if (!isNaN(idx) && idx >= 1 && idx <= CREW_ROLES.length) return idx - 1;
  return CREW_ROLES.findIndex((r) => norm.includes(r.toLowerCase()));
};

// ─── Finalize crew profile ──────────────────────────────────────────────────
const finalizeCrewProfile = async (userId, phone) => {
  const freshState = await getUserState(userId);
  const d  = freshState?.data || {};
  const id = phoneToDocId(userId);
  const ts = new Date().toISOString();

  await adminDb().collection("crew").doc(id).set({
    id, whatsappPhone: `+${id}`, phone,
    name: d.name || "", city: d.city || "", role: d.crewRole || "",
    experience: d.experience || "", status: "pending",
    approved: false, available: false,
    createdAt: ts, updatedAt: ts,
  }, { merge: true });

  await saveUserState(userId, {
    step: STEPS.CREW_COMPLETE, role: "crew", phone, approved: false,
    name: d.name || "", city: d.city || "", crewRole: d.crewRole || "",
    experience: d.experience || "", profileComplete: true, "data.phone": phone,
  });

  logger.log("[Conv] Crew profile finalized | id:", id);
  return crewCompleteMsg();
};

// ─── Finalize organizer profile ─────────────────────────────────────────────
const finalizeOrganizerProfile = async (userId, phone) => {
  const freshState = await getUserState(userId);
  const d  = freshState?.data || {};
  const id = phoneToDocId(userId);
  const ts = new Date().toISOString();

  await adminDb().collection("organizers").doc(id).set({
    id, whatsappPhone: `+${id}`, phone,
    name: d.name || "", company: d.company || "",
    city: d.city || "", requirements: d.requirements || "",
    role: "organizer", status: "approved", approved: true,
    approvedAt: ts, createdAt: ts, updatedAt: ts,
  }, { merge: true });

  await saveUserState(userId, {
    step: STEPS.EMP_COMPLETE, role: "organizer", phone, approved: true,
    name: d.name || "", city: d.city || "", company: d.company || "",
    requirements: d.requirements || "", profileComplete: true, "data.phone": phone,
  });

  logger.log("[Conv] Organizer profile finalized (auto-approved) | id:", id);
  return organizerCompleteMsg();
};

// ─── Resume step ─────────────────────────────────────────────────────────────
const resumeStep = (step, userState, userId) => {
  switch (step) {
    case STEPS.ROLE_SELECTION:    return roleSelectionMsg();
    case STEPS.CREW_NAME:         return txt("What is your *full name*?", step);
    case STEPS.EMP_NAME:          return txt("What is your *full name*?", step);
    case STEPS.CREW_CITY:
    case STEPS.EMP_CITY:          return cityListMsg(step);
    case STEPS.CREW_CITY_OTHER:
    case STEPS.EMP_CITY_OTHER:    return txt("Please *type your city name*:", step);
    case STEPS.CREW_ROLE:         return crewRoleListMsg(step);
    case STEPS.CREW_EXPERIENCE:   return experienceListMsg(step);
    case STEPS.CREW_PHONE_CONFIRM:
    case STEPS.EMP_PHONE_CONFIRM: return phoneConfirmMsg(userId, step);
    case STEPS.CREW_PHONE_MANUAL:
    case STEPS.EMP_PHONE_MANUAL:  return txt("Please type your *phone number* for OTP login:\n_Example: +91XXXXXXXXXX_", step);
    case STEPS.EMP_COMPANY:       return txt("What is your *company / production house name*?", step);
    case STEPS.EMP_REQUIREMENTS:  return txt("Please describe your *hiring requirements*:", step);
    case STEPS.BOOKING_RESPONSE:
      return btns("🔔 You have a *pending job request*. Are you available?",
        [{ id: "yes", title: "✅ Accept" }, { id: "no", title: "❌ Decline" }], step);
    case STEPS.CREW_COMPLETE:
      if (userState?.approved) return txt(`✅ Your profile is approved!\n\n🔗 Login: ${APP_URL()}`, step);
      return txt("⏳ Your profile is still *under review*. We'll notify you once approved.", step);
    case STEPS.EMP_COMPLETE:
      return txt(`✅ Your organizer profile is ready!\n\n🔗 Login: ${APP_URL()}`, step);
    default:
      return txt("👋 Type *restart* to begin a fresh session.", step);
  }
};

// ─── Approval message (used by admin API) ──────────────────────────────────
export const buildApprovalMessage = (role) =>
  txt(
    `🎉 *Congratulations! Your CrewHive profile has been approved!*\n\n` +
    `You are now visible to organizers looking for crew in Kerala.\n\n` +
    `🔗 *Login here:* ${APP_URL()}\n\n_Use OTP login with the phone number you registered._`,
    STEPS.CREW_COMPLETE
  );
