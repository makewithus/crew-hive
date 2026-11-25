/**
 * backend/services/whatsapp-onboarding.service.js
 * Conversational WhatsApp onboarding bot state machine (C14 [P0]).
 * Step 1: User sends "Hi" -> identifies phone & checks existing user
 * Step 2: Role selection (10 parent roles from taxonomy)
 * Step 3: City selection (Kochi, Trivandrum, Kozhikode, all districts)
 * Step 4: Name entry
 * Step 5: Single unified user creation via shared data model (users + crew collections)
 */

import {
  PARENT_ROLES,
  LAUNCH_CITIES,
  KERALA_DISTRICTS,
  normalizeIndianPhone,
  phoneToDocId,
  CURRENT_CONSENT_VERSION,
} from "@crew-hive/shared";
import { getDb } from "../config/firebase.js";
import { whatsAppAdapter } from "../integrations/whatsapp/adapter.js";
import * as crewService from "./crew.service.js";

const now = () => new Date().toISOString();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ALL_CITIES = [...LAUNCH_CITIES, ...KERALA_DISTRICTS];

export const ONBOARDING_STEPS = {
  START: "START",
  AWAITING_ROLE: "AWAITING_ROLE",
  AWAITING_CITY: "AWAITING_CITY",
  AWAITING_NAME: "AWAITING_NAME",
  COMPLETED: "COMPLETED",
};

/**
 * Maps user input to a parent role in the CrewHive taxonomy
 */
export function matchRole(input) {
  if (!input) return null;
  const clean = String(input).trim().toLowerCase();

  // Numeric selection (1-10)
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num >= 1 && num <= PARENT_ROLES.length) {
    return PARENT_ROLES[num - 1];
  }

  // Exact ID or payload match
  const byId = PARENT_ROLES.find(
    (r) => r.id === clean || clean === `role_${r.id}` || r.nameEn.toLowerCase() === clean
  );
  if (byId) return byId;

  // Substring or keyword match
  return (
    PARENT_ROLES.find(
      (r) =>
        clean.includes(r.id) ||
        clean.includes(r.nameEn.toLowerCase()) ||
        (r.nameMl && clean.includes(r.nameMl))
    ) || null
  );
}

/**
 * Maps user input to a supported city in Kerala
 */
export function matchCity(input) {
  if (!input) return null;
  const clean = String(input).trim().toLowerCase();

  // Numeric shortcuts
  if (clean === "1" || clean.includes("kochi") || clean.includes("കൊച്ചി") || clean.includes("ernakulam")) {
    return "Kochi";
  }
  if (clean === "2" || clean.includes("thiruvananthapuram") || clean.includes("തിരുവനന്തപുരം") || clean.includes("trivandrum")) {
    return "Thiruvananthapuram";
  }
  if (clean === "3" || clean.includes("kozhikode") || clean.includes("കോഴിക്കോട്") || clean.includes("calicut")) {
    return "Kozhikode";
  }

  // Match against Kerala districts/cities
  const found = ALL_CITIES.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.nameEn.toLowerCase() === clean ||
      clean.includes(c.nameEn.toLowerCase()) ||
      (c.nameMl && clean.includes(c.nameMl))
  );

  return found ? found.nameEn : (input.trim().length >= 3 ? input.trim() : null);
}

/**
 * Process incoming WhatsApp message through conversational state machine
 */
export async function handleIncomingMessage({ from, body, messageId = null }) {
  const db = getDb();
  const rawPhone = String(from).startsWith("+") ? from : `+${from}`;
  const phone = normalizeIndianPhone(rawPhone) || rawPhone;
  const id = phoneToDocId(phone);

  const text = String(body || "").trim();
  const lower = text.toLowerCase();

  // 1. Check if user already exists in unified database
  const userDoc = await db.collection("users").doc(id).get();
  if (userDoc.exists && userDoc.data()?.name) {
    const existing = userDoc.data();
    const welcomeBackMsg = `Welcome back to CrewHive, ${existing.name}! 👋\n\nYour profile is active. You can manage your availability, view incoming requests, and update your portfolio anytime on our web portal:\nhttps://crewhive.in`;
    await whatsAppAdapter.sendText(phone, welcomeBackMsg);
    return { status: "existing_user", id, message: welcomeBackMsg };
  }

  // 2. Load or initialize conversational session
  const sessionRef = db.collection("whatsapp_sessions").doc(id);
  const sessionSnap = await sessionRef.get();
  const session = sessionSnap.exists ? sessionSnap.data() : null;

  const isGreeting = ["hi", "hello", "hey", "start", "join", "ഹായ്", "നമസ്കാരം"].includes(lower);
  const isExpired = session?.updatedAt && Date.now() - new Date(session.updatedAt).getTime() > SESSION_TTL_MS;

  // New session or restart on greeting
  if (!session || isGreeting || isExpired || session.step === ONBOARDING_STEPS.COMPLETED) {
    const rolesListText = PARENT_ROLES.map(
      (r, i) => `${i + 1}. ${r.nameEn} (${r.nameMl || ""})`
    ).join("\n");

    const reply = `👋 Welcome to CrewHive — Kerala's AV & Event Crew Network!\n\nLet's create your free profile in 30 seconds.\n\nReply with the NUMBER of your primary craft:\n${rolesListText}`;

    await sessionRef.set({
      id,
      phone,
      step: ONBOARDING_STEPS.AWAITING_ROLE,
      startedAt: now(),
      updatedAt: now(),
    });

    await whatsAppAdapter.sendText(phone, reply);
    return { status: "started", step: ONBOARDING_STEPS.AWAITING_ROLE, reply };
  }

  // 3. Step: Awaiting Role
  if (session.step === ONBOARDING_STEPS.AWAITING_ROLE) {
    const matched = matchRole(text);
    if (!matched) {
      const retryMsg = `Please reply with a valid number from 1 to ${PARENT_ROLES.length} to select your role (e.g. 1 for Lighting, 2 for Sound).`;
      await whatsAppAdapter.sendText(phone, retryMsg);
      return { status: "invalid_role", step: ONBOARDING_STEPS.AWAITING_ROLE };
    }

    await sessionRef.update({
      role: matched.id,
      roleName: matched.nameEn,
      step: ONBOARDING_STEPS.AWAITING_CITY,
      updatedAt: now(),
    });

    const cityMsg = `Selected craft: ${matched.nameEn} ✅\n\nNow select your primary base in Kerala:\n1. Kochi (കൊച്ചി)\n2. Thiruvananthapuram (തിരുവനന്തപുരം)\n3. Kozhikode (കോഴിക്കോട്)\n\n(Or reply with any other Kerala district, e.g. Thrissur, Kannur)`;
    await whatsAppAdapter.sendText(phone, cityMsg);
    return { status: "role_saved", role: matched.id, step: ONBOARDING_STEPS.AWAITING_CITY };
  }

  // 4. Step: Awaiting City
  if (session.step === ONBOARDING_STEPS.AWAITING_CITY) {
    const matchedCity = matchCity(text);
    if (!matchedCity) {
      const retryCity = `Please reply with 1 for Kochi, 2 for Thiruvananthapuram, 3 for Kozhikode, or type your Kerala district name.`;
      await whatsAppAdapter.sendText(phone, retryCity);
      return { status: "invalid_city", step: ONBOARDING_STEPS.AWAITING_CITY };
    }

    await sessionRef.update({
      city: matchedCity,
      step: ONBOARDING_STEPS.AWAITING_NAME,
      updatedAt: now(),
    });

    const nameMsg = `Base location: ${matchedCity} ✅\n\nAlmost done! Please type your professional Full Name:\n(e.g., 'Rahul Menon')`;
    await whatsAppAdapter.sendText(phone, nameMsg);
    return { status: "city_saved", city: matchedCity, step: ONBOARDING_STEPS.AWAITING_NAME };
  }

  // 5. Step: Awaiting Name -> Final Account Creation
  if (session.step === ONBOARDING_STEPS.AWAITING_NAME) {
    const fullName = text.slice(0, 80).trim();
    if (fullName.length < 2) {
      const retryName = `Please type your full professional name (at least 2 letters).`;
      await whatsAppAdapter.sendText(phone, retryName);
      return { status: "invalid_name", step: ONBOARDING_STEPS.AWAITING_NAME };
    }

    // Single unified user creation
    const userContext = { id, phone };
    const payload = {
      name: fullName,
      role: session.role,
      roles: [session.role],
      specialisations: [],
      city: session.city,
      consent: {
        version: CURRENT_CONSENT_VERSION,
        termsAccepted: true,
        privacyAccepted: true,
        acceptableBehaviorAccepted: true,
      },
    };

    // Call unified crewService onboard
    const result = await crewService.onboard(userContext, payload);

    await sessionRef.update({
      name: fullName,
      step: ONBOARDING_STEPS.COMPLETED,
      completedAt: now(),
      updatedAt: now(),
    });

    const successMsg = `🎉 Profile created successfully, ${fullName}!\n\n• Role: ${session.roleName || session.role}\n• City: ${session.city}\n• Status: Live on CrewHive\n\nYou can log in with your WhatsApp number (${phone}) at https://crewhive.in or the CrewHive mobile app to activate your 18h availability window and receive direct bookings!`;
    await whatsAppAdapter.sendText(phone, successMsg);

    return {
      status: "completed",
      step: ONBOARDING_STEPS.COMPLETED,
      crewId: result.crew.id,
      name: fullName,
    };
  }

  return { status: "noop" };
}
