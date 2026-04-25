/**
 * Conversation Engine — CrewHive
 * Handles WhatsApp onboarding for Crew and Organizer roles.
 * State is persisted in Firestore users/{phoneDigits}.
 *
 * handleMessage() returns either:
 *   - a single message object  { type, text, ... }
 *   - an array of messages     [msg1, msg2, ...]
 *     → the webhook sends each one sequentially
 *       (used for welcome + immediate role prompt on first contact)
 */

import { adminDb } from "./firebase-admin";
import logger from "./logger";

// ─── Steps ────────────────────────────────────────────────────────────────────
export const STEPS = {
  ROLE_SELECTION: "role_selection",
  // Crew
  CREW_NAME: "crew_name",
  CREW_CITY: "crew_city",
  CREW_CITY_OTHER: "crew_city_other",
  CREW_ROLE: "crew_role",
  CREW_EXPERIENCE: "crew_experience",
  CREW_PHONE_CONFIRM: "crew_phone_confirm",
  CREW_PHONE_MANUAL: "crew_phone_manual",
  CREW_COMPLETE: "crew_complete",
  // Employer
  EMP_NAME: "emp_name",
  EMP_COMPANY: "emp_company",
  EMP_CITY: "emp_city",
  EMP_CITY_OTHER: "emp_city_other",
  EMP_REQUIREMENTS: "emp_requirements",
  EMP_PHONE_CONFIRM: "emp_phone_confirm",
  EMP_PHONE_MANUAL: "emp_phone_manual",
  EMP_COMPLETE: "emp_complete",
  // Booking
  BOOKING_RESPONSE: "booking_response",
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const CREW_ROLES = [
  "Sound Engineer",
  "Lighting Operator",
  "LED Wall Tech",
  "Stage Manager",
  "Rigger",
  "Cinematographer",
  "Photographer",
  "Assistant Director",
  "Editor",
  "Drone Pilot",
];

const CITIES = [
  "Kochi",
  "Trivandrum",
  "Kozhikode",
  "Thrissur",
  "Kannur",
  "Kottayam",
  "Malappuram",
  "Palakkad",
  "Alappuzha",
  "Other",
];

// ─── Phone helpers ────────────────────────────────────────────────────────────
/** Firestore doc ID: digits only, e.g. "919876543210" */
export const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

/** Pretty display, e.g. +91 98765 43210 */
const formatPhone = (digits) => {
  const d = String(digits).replace(/\D/g, "");
  if (d.length === 12)
    return `+${d.slice(0, 2)} ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 11)
    return `+${d.slice(0, 1)} ${d.slice(1, 6)} ${d.slice(6)}`;
  return `+${d}`;
};

// ─── Firestore state ──────────────────────────────────────────────────────────
const getUserState = async (phone) => {
  const snap = await adminDb()
    .collection("users")
    .doc(phoneToDocId(phone))
    .get();
  return snap.exists ? snap.data() : null;
};

const saveUserState = async (phone, updates) => {
  try {
    const ref = adminDb().collection("users").doc(phoneToDocId(phone));
    const snap = await ref.get();
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    if (snap.exists) {
      await ref.update(payload);
    } else {
      await ref.set({
        phone: `+${phoneToDocId(phone)}`,
        whatsappPhone: `+${phoneToDocId(phone)}`,
        createdAt: new Date().toISOString(),
        ...payload,
      });
    }
    logger.log(
      "[ConversationEngine] saveUserState ok | phone:",
      phoneToDocId(phone),
      "| keys:",
      Object.keys(updates).join(", "),
    );
  } catch (err) {
    logger.error(
      "[ConversationEngine] saveUserState error:",
      err.message,
      "| phone:",
      phoneToDocId(phone),
    );
    throw err;
  }
};

/**
 * Atomically transition step — returns false if step already moved on (idempotent).
 * Also stamps lastMsgNorm on the doc so future duplicates are caught cheaply.
 */
const atomicStepTransition = async (
  phone,
  expectedStep,
  updates,
  lastMsgNorm,
) => {
  const ref = adminDb().collection("users").doc(phoneToDocId(phone));
  try {
    let moved = false;
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const current = data?.step;
      if (current !== expectedStep) {
        moved = false;
        return;
      }
      const payload = {
        ...updates,
        updatedAt: new Date().toISOString(),
        ...(lastMsgNorm !== undefined
          ? { lastMsgNorm, lastMsgAt: Date.now() }
          : {}),
      };
      if (snap.exists) {
        tx.update(ref, payload);
      } else {
        tx.set(ref, {
          phone: `+${phoneToDocId(phone)}`,
          whatsappPhone: `+${phoneToDocId(phone)}`,
          createdAt: new Date().toISOString(),
          ...payload,
        });
      }
      moved = true;
    });
    return moved;
  } catch (err) {
    logger.error(
      "[ConversationEngine] atomicStepTransition error:",
      err.message,
    );
    await saveUserState(phone, updates);
    return true;
  }
};

/** When a duplicate arrives and step already moved, return this sentinel so webhook sends nothing. */
const DUPLICATE_RESPONSE = null;

// ─── Message builders ─────────────────────────────────────────────────────────
const buildText = (text, step) => ({ type: "text", text, step, success: true });

const buildButtons = (text, buttons, step, header = null, footer = null) => ({
  type: "buttons",
  text,
  buttons,
  step,
  success: true,
  ...(header ? { header } : {}),
  ...(footer ? { footer } : {}),
});

const buildList = (
  text,
  sections,
  step,
  buttonText = "Select",
  header = null,
  footer = null,
) => ({
  type: "list",
  text,
  sections,
  step,
  success: true,
  buttonText,
  ...(header ? { header } : {}),
  ...(footer ? { footer } : {}),
});

// ─── Reusable prompts ─────────────────────────────────────────────────────────
const roleSelectionMsg = () =>
  buildButtons(
    "Please select your role to get started:",
    [
      { id: "crew", title: "👷 Crew" },
      { id: "organizer", title: "🎪 Organizer" },
    ],
    STEPS.ROLE_SELECTION,
    "Select Your Role",
  );

const cityListMsg = (step) =>
  buildList(
    "Which city are you based in?\n\n_Select from the list. If your city isn't listed, choose *Other* and type it._",
    [
      {
        rows: CITIES.map((c, i) => ({
          id: c.toLowerCase().replace(/\s/g, "_"),
          title: `${i + 1}. ${c}`,
        })),
      },
    ],
    step,
    "🏙️ Choose City",
    "Select Your City",
  );

const crewRoleListMsg = (step) =>
  buildList(
    "What is your primary *role*?",
    [
      {
        rows: CREW_ROLES.map((r, i) => ({
          id: String(i + 1),
          title: `${i + 1}. ${r}`,
        })),
      },
    ],
    step,
    "🎬 Choose Role",
    "Select Your Role",
  );

const experienceListMsg = (step) =>
  buildList(
    "How many years of *experience* do you have?",
    [
      {
        rows: [
          {
            id: "1",
            title: "1. 0–2 years",
            description: "Fresher / Early career",
          },
          { id: "2", title: "2. 3–5 years", description: "Intermediate" },
          { id: "3", title: "3. 5–10 years", description: "Experienced" },
          { id: "4", title: "4. 10+ years", description: "Senior / Expert" },
        ],
      },
    ],
    step,
    "📊 Experience",
    "Select Experience Level",
  );

const phoneConfirmMsg = (userId, step) => {
  const display = formatPhone(phoneToDocId(userId));
  return buildButtons(
    `We have your WhatsApp number:\n\n📱 *${display}*\n\nShould we use this number for OTP login on CrewHive?`,
    [
      { id: "yes", title: "✅ Yes, use this" },
      { id: "no", title: "❌ No, different" },
    ],
    step,
  );
};

const crewThankyouMsg = () => {
  return buildText(
    `🙏 *Thank you for registering with CrewHive!*\n\n` +
      `Your crew profile has been submitted and is currently *pending approval* by our team.\n\n` +
      `Once approved, you will be notified here on WhatsApp and will be able to log in to the app.`,
    STEPS.CREW_COMPLETE,
  );
};

const organizerThankyouMsg = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crew-hive.vercel.app";
  return buildText(
    `🎉 *Welcome to CrewHive, Organizer!*\n\n` +
      `Your organizer profile is ready. You can now log in and start finding professional crew.\n\n` +
      `🔗 *Login here:* ${appUrl}\n\n` +
      `_Use OTP login with the phone number you registered._`,
    STEPS.EMP_COMPLETE,
  );
};

// ─── MSG91 text normaliser ────────────────────────────────────────────────────
/**
 * MSG91 sends list/button selections in TWO webhook calls:
 *   1. interactive  → id value  (e.g. "other", "kochi", "1")
 *   2. text         → full title (e.g. "10. Other", "1. Kochi", "1. 0–2 years")
 *
 * This function strips the leading "N. " prefix so both formats resolve the same way.
 * e.g.  "10. Other"  →  "other"
 *       "3. Kochi"   →  "kochi"
 *       "2. 3–5 years" → "2" (the number, used as list id)
 *       "✅ Yes, use this" → "yes, use this"
 */
/**
 * Extract a clean selection id from any string MSG91 might send.
 * Handles:
 *   - plain ids: "3", "kochi", "yes"
 *   - titled lists: "3. Sound Engineer" → "3"  (id preserved for number-keyed maps)
 *   - JSON text fallback: '{"list":{"id":"3",...}}' → "3"
 *   - emoji-prefixed buttons: "✅ Yes, use this" → "yes, use this"
 */
const normaliseMsg = (raw) => {
  let s = String(raw).trim();

  // ── JSON text fallback from MSG91 (list/button selections sent as text) ──
  // Shape: '{"list":{"id":"3","title":"3. Sound Engineer"}}' or '{"button":{"id":"yes"}}'
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === "object" && parsed !== null) {
        const id =
          parsed?.list_reply?.id ??
          parsed?.button_reply?.id ??
          parsed?.list?.id ??
          parsed?.button?.id ??
          parsed?.id ??
          null;
        if (id !== null && id !== undefined) {
          s = String(id).trim();
        } else {
          // fallback to title
          const title =
            parsed?.list_reply?.title ??
            parsed?.button_reply?.title ??
            parsed?.list?.title ??
            parsed?.button?.title ??
            parsed?.title ??
            null;
          if (title) s = String(title).trim();
        }
      }
    } catch (_) {
      /* not JSON — leave s as-is */
    }
  }

  s = s.toLowerCase();
  // If string looks like "N. Title" (list item text fallback), keep just "N"
  // so it matches the interactive webhook id (which is also "N").
  // e.g. "1. Sound Engineer" → "1"   "10. Other" → "10"   "3. 5–10 years" → "3"
  const numPrefixMatch = s.match(/^(\d+)\.\s+/);
  if (numPrefixMatch) { s = numPrefixMatch[1]; }
  // Strip leading emoji + space:  "✅ yes, use this" → "yes, use this"
  s = s.replace(
    /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}❌✅👷💼📍🎬📊🔔]+\s*/u,
    "",
  );
  return s.trim();
};

// ─── Main handler ─────────────────────────────────────────────────────────────
/**
 * Process an incoming WhatsApp message.
 * @param {{ userId: string, message: string }} param
 * Returns a single message object OR an array [msg1, msg2] — webhook handles both.
 */
export const handleMessage = async ({ userId, message }) => {
  logger.log(
    "[ConversationEngine] Incoming | userId:",
    userId,
    "| message:",
    JSON.stringify(message),
  );
  try {
    const msg = message.trim().toLowerCase();
    const norm = normaliseMsg(message);

    // ── Atomic dedup — uses Firestore create() which fails with ALREADY_EXISTS ──
    // MSG91 fires TWO webhooks per tap (interactive + text fallback), both within ~1s.
    // We bucket by 10-second window so the dedup key is time-bounded without needing
    // explicit cleanup. Two concurrent create() calls: one succeeds, one throws 6.
    const DEDUP_WINDOW_MS = 60_000;
    const windowKey = Math.floor(Date.now() / DEDUP_WINDOW_MS);
    const safeNorm = norm.replace(/[^a-z0-9]/g, "_").slice(0, 60);
    const dedupId = `${phoneToDocId(userId)}_${safeNorm}_${windowKey}`;
    try {
      await adminDb().collection("dedup").doc(dedupId).create({ ts: Date.now(), phone: userId });
    } catch (err) {
      const code = err?.code ?? 0;
      const msg = err?.message ?? "";
      if (code === 6 || msg.includes("ALREADY_EXISTS") || msg.includes("already exists")) {
        logger.warn("[ConversationEngine] Dedup HIT | norm:", norm, "| user:", phoneToDocId(userId));
        return DUPLICATE_RESPONSE;
      }
      // Other error (network etc) — don't block processing
      logger.warn("[ConversationEngine] Dedup create error (proceeding):", msg);
    }

    // Read user state
    const ref = adminDb().collection("users").doc(phoneToDocId(userId));
    const userSnap = await ref.get();
    const userState = userSnap.exists ? userSnap.data() : null;

    // ── Brand-new user ─────────────────────────────────────────────────────────
    if (!userState) {
      // Doc was just created in the dedup transaction (with claim only).
      // Now set the full initial state.
      await saveUserState(userId, {
        step: STEPS.ROLE_SELECTION,
        role: null,
        data: {},
      });
      return [
        buildText(
          "👋 Welcome to *CrewHive!*\n\nThe platform connecting professional crew with organizers in Kerala. 🎬",
          STEPS.ROLE_SELECTION,
        ),
        roleSelectionMsg(),
      ];
    }

    const step = userState.step;

    // ── Restart ────────────────────────────────────────────────────────────────
    if (norm === "restart" || norm === "reset") {
      await saveUserState(userId, {
        step: STEPS.ROLE_SELECTION,
        role: null,
        data: {},
        pendingBookingId: null,
      });
      return [
        buildText(
          "🔄 *Starting over.*\n\nLet's get you set up on CrewHive!",
          STEPS.ROLE_SELECTION,
        ),
        roleSelectionMsg(),
      ];
    }

    // ── Greeting from existing user ────────────────────────────────────────────
    if (/^(hi+|hey|hello|hii+|start|helo|yo)$/i.test(norm)) {
      if (step === STEPS.CREW_COMPLETE || step === STEPS.EMP_COMPLETE) {
        if (userState.approved) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "https://crew-hive.vercel.app";
          return buildText(
            `👋 Welcome back to *CrewHive!*\n\nYour profile is live ✅\n\n🔗 Login here: ${appUrl}\n\nType *restart* to start over.`,
            step,
          );
        }
        if (step === STEPS.CREW_COMPLETE) {
          return buildText(
            "👋 Welcome back!\n\nYour crew profile is still *pending approval*. We'll notify you once approved.\n\nType *restart* to start over.",
            step,
          );
        }
        // organizer (EMP_COMPLETE) — auto-approved, should always have approved=true
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crew-hive.vercel.app";
        return buildText(
          `👋 Welcome back!\n\nYour organizer profile is ready.\n\n🔗 Login: ${appUrl}\n\nType *restart* to start fresh.`,
          step,
        );
      }
      return await resumeStep(step, userState, userId);
    }

    // ── Role selection ─────────────────────────────────────────────────────────
    if (step === STEPS.ROLE_SELECTION) {
      // Match broadly — MSG91 sends button taps as both interactive (id) and text (title)
      const isCrew = norm === "crew" || norm === "1" || norm.includes("crew");
      const isEmployer =
        norm === "organizer" || norm === "2" || norm.includes("organizer") || norm === "employer" || norm.includes("employer");

      if (isCrew) {
        const moved = await atomicStepTransition(
          userId,
          STEPS.ROLE_SELECTION,
          { role: "crew", step: STEPS.CREW_NAME },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        return buildText(
          "👷 *Crew* selected!\n\nWhat is your *full name*?",
          STEPS.CREW_NAME,
        );
      }
      if (isEmployer) {
        const moved = await atomicStepTransition(
          userId,
          STEPS.ROLE_SELECTION,
          { role: "employer", step: STEPS.EMP_NAME },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        return buildText(
          "🎪 *Organizer* selected!\n\nWhat is your *full name*?",
          STEPS.EMP_NAME,
        );
      }
      return roleSelectionMsg();
    }

    // ══════════════════════════════════════════════════════ CREW FLOW ══════════

    if (step === STEPS.CREW_NAME) {
      const name = message.trim();
      // Guard: ignore stale role-selection button taps that leaked through dedup
      if (!name || name.length < 2 || /^(crew|organizer|employer|yes|no|1|2)$/i.test(norm))
        return buildText(
          "Please enter your *full name* (min 2 characters):",
          STEPS.CREW_NAME,
        );
      const moved = await atomicStepTransition(
        userId,
        STEPS.CREW_NAME,
        { "data.name": name, step: STEPS.CREW_CITY },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return cityListMsg(STEPS.CREW_CITY);
    }

    if (step === STEPS.CREW_CITY) {
      if (norm === "other") {
        const moved = await atomicStepTransition(
          userId,
          STEPS.CREW_CITY,
          { step: STEPS.CREW_CITY_OTHER },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        return buildText(
          "Please *type your city name*:",
          STEPS.CREW_CITY_OTHER,
        );
      }
      // Match by id (e.g. "trivandrum"), by name, or by 1-based index from list
      const cityById = CITIES.find(
        (c) => c.toLowerCase().replace(/\s/g, "_") === norm.replace(/\s/g, "_"),
      );
      const cityByName = CITIES.find(
        (c) => c.toLowerCase() === norm.toLowerCase(),
      );
      const idxNum = parseInt(norm, 10);
      const cityByIdx =
        !isNaN(idxNum) && idxNum >= 1 && idxNum <= CITIES.length
          ? CITIES[idxNum - 1]
          : null;
      const city = cityById || cityByName || cityByIdx;
      logger.log(
        "[ConversationEngine] CREW_CITY | norm:",
        norm,
        "| matched:",
        city || "NONE",
      );
      if (!city) {
        logger.warn(
          "[ConversationEngine] CREW_CITY: no city match — dropping silently",
        );
        return DUPLICATE_RESPONSE;
      }
      // Numeric fallback (e.g. "10") can resolve to "Other" — treat same as norm==="other"
      if (city.toLowerCase() === "other") {
        const moved = await atomicStepTransition(
          userId,
          STEPS.CREW_CITY,
          { step: STEPS.CREW_CITY_OTHER },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        return buildText("Please *type your city name*:", STEPS.CREW_CITY_OTHER);
      }
      const moved = await atomicStepTransition(
        userId,
        STEPS.CREW_CITY,
        { "data.city": city, step: STEPS.CREW_ROLE },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return crewRoleListMsg(STEPS.CREW_ROLE);
    }

    if (step === STEPS.CREW_CITY_OTHER) {
      const city = message.trim();
      if (!city || city.length < 2)
        return buildText(
          "Please enter a valid city name:",
          STEPS.CREW_CITY_OTHER,
        );
      const moved = await atomicStepTransition(
        userId,
        STEPS.CREW_CITY_OTHER,
        { "data.city": city, step: STEPS.CREW_ROLE },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return crewRoleListMsg(STEPS.CREW_ROLE);
    }

    if (step === STEPS.CREW_ROLE) {
      // norm is already JSON-cleaned — use it for numeric id lookup
      const idxStr = norm.match(/^(\d+)/)?.[1];
      const idx = idxStr ? parseInt(idxStr, 10) : NaN;
      const byName = isNaN(idx)
        ? CREW_ROLES.findIndex((r) => norm.includes(r.toLowerCase()))
        : -1;
      const roleIdx =
        !isNaN(idx) && idx >= 1 && idx <= CREW_ROLES.length ? idx - 1 : byName;
      if (roleIdx < 0) {
        logger.warn(
          "[ConversationEngine] CREW_ROLE: no role match for norm:",
          norm,
          "— likely a stale retry, dropping silently",
        );
        return DUPLICATE_RESPONSE;
      }
      const role = CREW_ROLES[roleIdx];
      const moved = await atomicStepTransition(
        userId,
        STEPS.CREW_ROLE,
        { "data.crewRole": role, step: STEPS.CREW_EXPERIENCE },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return experienceListMsg(STEPS.CREW_EXPERIENCE);
    }

    if (step === STEPS.CREW_EXPERIENCE) {
      // norm is already JSON-cleaned — bare id like "1","2","3","4" is expected
      const expNum = norm.match(/^(\d+)/)?.[1];
      const expMap = {
        1: "0–2 years",
        2: "3–5 years",
        3: "5–10 years",
        4: "10+ years",
      };
      const exp = expMap[expNum];
      if (!exp) return experienceListMsg(STEPS.CREW_EXPERIENCE);
      const moved = await atomicStepTransition(
        userId,
        STEPS.CREW_EXPERIENCE,
        { "data.experience": exp, step: STEPS.CREW_PHONE_CONFIRM },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return phoneConfirmMsg(userId, STEPS.CREW_PHONE_CONFIRM);
    }

    if (step === STEPS.CREW_PHONE_CONFIRM) {
      const isYes =
        norm === "yes" ||
        norm === "y" ||
        norm.includes("yes") ||
        norm.includes("use this");
      const isNo =
        norm === "no" ||
        norm === "n" ||
        norm.includes("no") ||
        norm.includes("different");
      if (isYes) {
        const moved = await atomicStepTransition(
          userId,
          STEPS.CREW_PHONE_CONFIRM,
          { step: STEPS.CREW_COMPLETE },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        await saveUserState(userId, { step: STEPS.CREW_PHONE_CONFIRM });
        return await finalizeCrewProfile(userId, `+${phoneToDocId(userId)}`);
      }
      if (isNo) {
        const moved = await atomicStepTransition(
          userId,
          STEPS.CREW_PHONE_CONFIRM,
          { step: STEPS.CREW_PHONE_MANUAL },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        return buildText(
          "Please type your *phone number* for OTP login:\n\n_Example: +91XXXXXXXXXX_",
          STEPS.CREW_PHONE_MANUAL,
        );
      }
      return phoneConfirmMsg(userId, STEPS.CREW_PHONE_CONFIRM);
    }

    if (step === STEPS.CREW_PHONE_MANUAL) {
      const phone = message.trim().replace(/\s/g, "");
      if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
        return buildText(
          "Please enter a valid phone number:\n_Example: +91XXXXXXXXXX_",
          STEPS.CREW_PHONE_MANUAL,
        );
      }
      return await finalizeCrewProfile(
        userId,
        phone.startsWith("+") ? phone : `+${phone}`,
      );
    }

    // ══════════════════════════════════════════════════ EMPLOYER FLOW ══════════

    if (step === STEPS.EMP_NAME) {
      const name = message.trim();
      // Guard: ignore stale role-selection button taps that leaked through dedup
      if (!name || name.length < 2 || /^(crew|organizer|employer|yes|no|1|2)$/i.test(norm))
        return DUPLICATE_RESPONSE;
      const moved = await atomicStepTransition(
        userId,
        STEPS.EMP_NAME,
        { "data.name": name, step: STEPS.EMP_COMPANY },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return buildText(
        `Nice to meet you, *${name}*! 👋\n\nWhat is your *company / production house name*?`,
        STEPS.EMP_COMPANY,
      );
    }

    if (step === STEPS.EMP_COMPANY) {
      const company = message.trim();
      if (!company)
        return buildText("Please enter your company name:", STEPS.EMP_COMPANY);
      const moved = await atomicStepTransition(
        userId,
        STEPS.EMP_COMPANY,
        { "data.company": company, step: STEPS.EMP_CITY },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return cityListMsg(STEPS.EMP_CITY);
    }

    if (step === STEPS.EMP_CITY) {
      if (norm === "other") {
        const moved = await atomicStepTransition(
          userId,
          STEPS.EMP_CITY,
          { step: STEPS.EMP_CITY_OTHER },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        return buildText("Please *type your city name*:", STEPS.EMP_CITY_OTHER);
      }
      const cityById = CITIES.find(
        (c) => c.toLowerCase().replace(/\s/g, "_") === norm.replace(/\s/g, "_"),
      );
      const cityByName = CITIES.find(
        (c) => c.toLowerCase() === norm.toLowerCase(),
      );
      const idxNum2 = parseInt(norm, 10);
      const cityByIdx2 =
        !isNaN(idxNum2) && idxNum2 >= 1 && idxNum2 <= CITIES.length
          ? CITIES[idxNum2 - 1]
          : null;
      const city = cityById || cityByName || cityByIdx2;
      logger.log(
        "[ConversationEngine] EMP_CITY | norm:",
        norm,
        "| matched:",
        city || "NONE",
      );
      if (!city) {
        logger.warn(
          "[ConversationEngine] EMP_CITY: no city match — dropping silently",
        );
        return DUPLICATE_RESPONSE;
      }
      // Numeric fallback (e.g. "10") can resolve to "Other" — treat same as norm==="other"
      if (city.toLowerCase() === "other") {
        const moved = await atomicStepTransition(
          userId,
          STEPS.EMP_CITY,
          { step: STEPS.EMP_CITY_OTHER },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        return buildText("Please *type your city name*:", STEPS.EMP_CITY_OTHER);
      }
      const moved = await atomicStepTransition(
        userId,
        STEPS.EMP_CITY,
        { "data.city": city, step: STEPS.EMP_REQUIREMENTS },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return buildText(
        `📍 *${city}* noted!\n\nBriefly describe your *hiring requirements*:\n_e.g. "Need a photographer and sound engineer for weekly shoots in Kochi"_`,
        STEPS.EMP_REQUIREMENTS,
      );
    }

    if (step === STEPS.EMP_CITY_OTHER) {
      const city = message.trim();
      if (!city || city.length < 2)
        return buildText(
          "Please enter a valid city name:",
          STEPS.EMP_CITY_OTHER,
        );
      const moved = await atomicStepTransition(
        userId,
        STEPS.EMP_CITY_OTHER,
        { "data.city": city, step: STEPS.EMP_REQUIREMENTS },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return buildText(
        `📍 *${city}* noted!\n\nBriefly describe your *hiring requirements*:\n_e.g. "Need a photographer and sound engineer for weekly shoots"_`,
        STEPS.EMP_REQUIREMENTS,
      );
    }

    if (step === STEPS.EMP_REQUIREMENTS) {
      const req = message.trim();
      if (!req || req.length < 5)
        return buildText(
          "Please describe your hiring requirements (at least a few words):",
          STEPS.EMP_REQUIREMENTS,
        );
      const moved = await atomicStepTransition(
        userId,
        STEPS.EMP_REQUIREMENTS,
        { "data.requirements": req, step: STEPS.EMP_PHONE_CONFIRM },
        norm,
      );
      if (!moved) return DUPLICATE_RESPONSE;
      return phoneConfirmMsg(userId, STEPS.EMP_PHONE_CONFIRM);
    }

    if (step === STEPS.EMP_PHONE_CONFIRM) {
      const isYes =
        norm === "yes" ||
        norm === "y" ||
        norm.includes("yes") ||
        norm.includes("use this");
      const isNo =
        norm === "no" ||
        norm === "n" ||
        norm.includes("no") ||
        norm.includes("different");
      if (isYes) {
        const moved = await atomicStepTransition(
          userId,
          STEPS.EMP_PHONE_CONFIRM,
          { step: STEPS.EMP_COMPLETE },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        await saveUserState(userId, { step: STEPS.EMP_PHONE_CONFIRM });
        return await finalizeEmployerProfile(
          userId,
          `+${phoneToDocId(userId)}`,
        );
      }
      if (isNo) {
        const moved = await atomicStepTransition(
          userId,
          STEPS.EMP_PHONE_CONFIRM,
          { step: STEPS.EMP_PHONE_MANUAL },
          norm,
        );
        if (!moved) return DUPLICATE_RESPONSE;
        return buildText(
          "Please type your *phone number* for OTP login:\n\n_Example: +91XXXXXXXXXX_",
          STEPS.EMP_PHONE_MANUAL,
        );
      }
      return phoneConfirmMsg(userId, STEPS.EMP_PHONE_CONFIRM);
    }

    if (step === STEPS.EMP_PHONE_MANUAL) {
      const phone = message.trim().replace(/\s/g, "");
      if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
        return buildText(
          "Please enter a valid phone number:\n_Example: +91XXXXXXXXXX_",
          STEPS.EMP_PHONE_MANUAL,
        );
      }
      return await finalizeEmployerProfile(
        userId,
        phone.startsWith("+") ? phone : `+${phone}`,
      );
    }

    // ── Already completed ──────────────────────────────────────────────────────
    if (step === STEPS.CREW_COMPLETE || step === STEPS.EMP_COMPLETE) {
      if (userState.approved) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://crew-hive.vercel.app";
        return buildText(
          `✅ Your profile is already live!\n\n🔗 Login: ${appUrl}\n\nType *restart* to start over.`,
          step,
        );
      }
      if (step === STEPS.CREW_COMPLETE) {
        return buildText(
          "⏳ Your crew profile is *pending approval*.\n\nWe'll notify you here once approved. Please wait!\n\nType *restart* to start over.",
          step,
        );
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crew-hive.vercel.app";
      return buildText(
        `✅ Your organizer profile is ready!\n\n🔗 Login: ${appUrl}\n\nType *restart* to start over.`,
        step,
      );
    }

    // ── Booking response ───────────────────────────────────────────────────────
    if (step === STEPS.BOOKING_RESPONSE) {
      const bookingId = userState.pendingBookingId;
      if (msg === "yes" || msg === "y") {
        if (bookingId) {
          const ts = new Date().toISOString();
          await adminDb()
            .collection("bookings")
            .doc(bookingId)
            .update({ status: "accepted", updatedAt: ts });
          await adminDb()
            .collection("crew")
            .doc(phoneToDocId(userId))
            .update({ available: false, updatedAt: ts });
        }
        await saveUserState(userId, {
          step: STEPS.CREW_COMPLETE,
          pendingBookingId: null,
        });
        return buildText(
          "✅ *Booking Accepted!*\n\nYou are confirmed for this job. Good luck! 🎬",
          STEPS.CREW_COMPLETE,
        );
      }
      if (msg === "no" || msg === "n") {
        await saveUserState(userId, {
          step: STEPS.CREW_COMPLETE,
          pendingBookingId: null,
        });
        return buildText(
          "❌ *Booking Declined.*\n\nNo worries — more opportunities will come! 💪",
          STEPS.CREW_COMPLETE,
        );
      }
      return buildButtons(
        "🔔 You have a *pending job request*. Are you available?",
        [
          { id: "yes", title: "✅ Accept" },
          { id: "no", title: "❌ Decline" },
        ],
        STEPS.BOOKING_RESPONSE,
      );
    }

    // ── Fallback ───────────────────────────────────────────────────────────────
    return buildText(
      "🤔 I'm not sure how to respond.\n\nType *Hi* to continue where you left off, or *restart* to start over.",
      step,
    );
  } catch (error) {
    logger.error("[ConversationEngine] Error:", error);
    return {
      success: false,
      type: "text",
      text: "Something went wrong. Please try again.",
      error: error.message,
    };
  }
};

// ─── Finalize crew profile ────────────────────────────────────────────────────
const finalizeCrewProfile = async (userId, phone) => {
  const freshState = await getUserState(userId);
  const d = freshState?.data || {};
  const id = phoneToDocId(userId);
  const ts = new Date().toISOString();

  // Create / update crew document (used by the web app)
  await adminDb()
    .collection("crew")
    .doc(id)
    .set(
      {
        id,
        whatsappPhone: `+${id}`,
        phone,
        name: d.name || "",
        city: d.city || "",
        role: d.crewRole || "",
        experience: d.experience || "",
        status: "pending",
        approved: false,
        available: false,
        createdAt: ts,
        updatedAt: ts,
      },
      { merge: true },
    );

  // Mirror all profile data into the users doc so OTP login auto-loads the profile
  await saveUserState(userId, {
    step: STEPS.CREW_COMPLETE,
    role: "crew",
    phone,
    approved: false,
    name: d.name || "",
    city: d.city || "",
    crewRole: d.crewRole || "",
    experience: d.experience || "",
    profileComplete: true,
    "data.phone": phone,
  });

  logger.log(
    "[ConversationEngine] Crew profile finalized | id:",
    id,
    "| phone:",
    phone,
  );
  return crewThankyouMsg();
};

// ─── Finalize organizer profile ──────────────────────────────────────────────────
const finalizeEmployerProfile = async (userId, phone) => {
  const freshState = await getUserState(userId);
  const d = freshState?.data || {};
  const id = phoneToDocId(userId);
  const ts = new Date().toISOString();

  // Organizers are auto-approved — no admin review needed
  await adminDb()
    .collection("organizers")
    .doc(id)
    .set(
      {
        id,
        whatsappPhone: `+${id}`,
        phone,
        name: d.name || "",
        company: d.company || "",
        city: d.city || "",
        requirements: d.requirements || "",
        role: "organizer",
        status: "approved",
        approved: true,
        approvedAt: ts,
        createdAt: ts,
        updatedAt: ts,
      },
      { merge: true },
    );

  // Mirror into users doc — approved immediately
  await saveUserState(userId, {
    step: STEPS.EMP_COMPLETE,
    role: "organizer",
    phone,
    approved: true,
    name: d.name || "",
    city: d.city || "",
    company: d.company || "",
    requirements: d.requirements || "",
    profileComplete: true,
    "data.phone": phone,
  });

  logger.log(
    "[ConversationEngine] Organizer profile finalized (auto-approved) | id:",
    id,
    "| phone:",
    phone,
  );
  return organizerThankyouMsg();
};

// ─── Resume step prompt ───────────────────────────────────────────────────────
const resumeStep = async (step, userState, userId) => {
  switch (step) {
    case STEPS.ROLE_SELECTION:
      return roleSelectionMsg();
    case STEPS.CREW_NAME:
    case STEPS.EMP_NAME:
      return buildText("What is your *full name*?", step);
    case STEPS.CREW_CITY:
    case STEPS.EMP_CITY:
      return cityListMsg(step);
    case STEPS.CREW_CITY_OTHER:
    case STEPS.EMP_CITY_OTHER:
      return buildText("Please *type your city name*:", step);
    case STEPS.CREW_ROLE:
      return crewRoleListMsg(step);
    case STEPS.CREW_EXPERIENCE:
      return experienceListMsg(step);
    case STEPS.CREW_PHONE_CONFIRM:
    case STEPS.EMP_PHONE_CONFIRM:
      return phoneConfirmMsg(userId, step);
    case STEPS.CREW_PHONE_MANUAL:
    case STEPS.EMP_PHONE_MANUAL:
      return buildText(
        "Please type your *phone number* for OTP login:\n_Example: +91XXXXXXXXXX_",
        step,
      );
    case STEPS.EMP_COMPANY:
      return buildText("What is your *company / production house name*?", step);
    case STEPS.EMP_REQUIREMENTS:
      return buildText("Please describe your *hiring requirements*:", step);
    case STEPS.BOOKING_RESPONSE:
      return buildButtons(
        "🔔 You have a *pending job request*. Are you available?",
        [
          { id: "yes", title: "✅ Accept" },
          { id: "no", title: "❌ Decline" },
        ],
        step,
      );
    case STEPS.CREW_COMPLETE:
    case STEPS.EMP_COMPLETE: {
      if (userState?.approved) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://crew-hive.vercel.app";
        return buildText(
          `✅ Your profile is approved!\n\n🔗 Login: ${appUrl}`,
          step,
        );
      }
      return buildText(
        "⏳ Your profile is still *under review*. We'll notify you once approved.",
        step,
      );
    }
    default:
      return buildText(
        "👋 Welcome back!\n\nType *restart* to begin a fresh session.",
        step,
      );
  }
};

/**
 * Builds the approval congratulations message sent by the admin approval flow.
 * Import and call this from the admin approve API route, then send via sendConversationMessage.
 */
export const buildApprovalMessage = (role) => {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://crew-hive.vercel.app";
  return buildText(
    `🎉 *Congratulations! Your CrewHive profile has been approved!*\n\n` +
      `You are now visible to organizers looking for crew in Kerala.\n\n` +
      `🔗 *Login here:* ${appUrl}\n\n_Use OTP login with the phone number you registered._`,
    STEPS.CREW_COMPLETE,
  );
};
