/**
 * Conversation Engine — CrewHive
 * Handles WhatsApp onboarding for Crew and Employer roles.
 * State is persisted in Firestore users/{phoneDigits}.
 * Returns structured message objects that the webhook sends via MSG91.
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// ─── Steps ────────────────────────────────────────────────────────────────────
export const STEPS = {
  ROLE_SELECTION: 'role_selection',
  // Crew
  CREW_NAME: 'crew_name',
  CREW_CITY: 'crew_city',
  CREW_CITY_OTHER: 'crew_city_other',
  CREW_ROLE: 'crew_role',
  CREW_EXPERIENCE: 'crew_experience',
  CREW_PHONE_CONFIRM: 'crew_phone_confirm',
  CREW_PHONE_MANUAL: 'crew_phone_manual',
  CREW_COMPLETE: 'crew_complete',
  // Employer
  EMP_NAME: 'emp_name',
  EMP_COMPANY: 'emp_company',
  EMP_CITY: 'emp_city',
  EMP_CITY_OTHER: 'emp_city_other',
  EMP_REQUIREMENTS: 'emp_requirements',
  EMP_COMPLETE: 'emp_complete',
  // Booking
  BOOKING_RESPONSE: 'booking_response',
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const CREW_ROLES = [
  'Cinematographer',
  'Photographer',
  'Sound Engineer',
  'Lighting Operator',
  'Assistant Director',
  'Production Assistant',
  'Editor',
  'Drone Pilot',
  'Grip',
  'Gaffer',
];

const CITIES = [
  'Kochi',
  'Trivandrum',
  'Kozhikode',
  'Thrissur',
  'Kannur',
  'Kottayam',
  'Malappuram',
  'Palakkad',
  'Alappuzha',
  'Other',
];

// ─── Phone helper ─────────────────────────────────────────────────────────────
/** Firestore doc ID: digits only, e.g. "919876543210" */
export const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

// ─── Firestore state ──────────────────────────────────────────────────────────
const getUserState = async (phone) => {
  const snap = await getDoc(doc(db, 'users', phoneToDocId(phone)));
  return snap.exists() ? snap.data() : null;
};

const saveUserState = async (phone, updates) => {
  const ref = doc(db, 'users', phoneToDocId(phone));
  const snap = await getDoc(ref);
  const payload = { ...updates, updatedAt: new Date().toISOString() };
  if (snap.exists()) {
    await updateDoc(ref, payload);
  } else {
    await setDoc(ref, {
      phone: `+${phoneToDocId(phone)}`,
      createdAt: new Date().toISOString(),
      ...payload,
    });
  }
};

// ─── Message builders ─────────────────────────────────────────────────────────
const buildText = (text, step) => ({ type: 'text', text, step, success: true });

const buildButtons = (text, buttons, step, header = null, footer = null) => ({
  type: 'buttons',
  text,
  buttons,
  step,
  success: true,
  ...(header ? { header } : {}),
  ...(footer ? { footer } : {}),
});

const buildList = (text, sections, step, buttonText = 'Select', header = null, footer = null) => ({
  type: 'list',
  text,
  sections,
  step,
  success: true,
  buttonText,
  ...(header ? { header } : {}),
  ...(footer ? { footer } : {}),
});

// ─── Reusable list messages ───────────────────────────────────────────────────
const cityListMsg = (step) =>
  buildList(
    'Which city are you based in?\n\n_If your city is not listed, select *Other* and then type it._',
    [{ rows: CITIES.map((c, i) => ({ id: c.toLowerCase().replace(/\s/g, '_'), title: `${i + 1}. ${c}` })) }],
    step,
    '🏙️ Choose City',
    'Select Your City',
  );

const roleListMsg = (step) =>
  buildList(
    'What is your primary *role*?\n\n_Select the number from the list:_',
    [{ rows: CREW_ROLES.map((r, i) => ({ id: String(i + 1), title: `${i + 1}. ${r}` })) }],
    step,
    '🎬 Choose Role',
    'Select Your Role',
  );

const experienceListMsg = (step) =>
  buildList(
    'How many years of *experience* do you have?',
    [{
      rows: [
        { id: '1', title: '1. 0–2 years', description: 'Fresher / Early career' },
        { id: '2', title: '2. 3–5 years', description: 'Intermediate' },
        { id: '3', title: '3. 5–10 years', description: 'Experienced' },
        { id: '4', title: '4. 10+ years', description: 'Senior / Expert' },
      ],
    }],
    step,
    '📊 Experience',
    'Select Experience Level',
  );

// ─── Main handler ─────────────────────────────────────────────────────────────
/**
 * Process an incoming WhatsApp message.
 * @param {{ userId: string, message: string }} param
 *   userId = phone number as received from MSG91 webhook (e.g. "919876543210")
 */
export const handleMessage = async ({ userId, message }) => {
  try {
    let userState = await getUserState(userId);
    const msg = message.trim().toLowerCase();

    // New user
    if (!userState) {
      await saveUserState(userId, { step: STEPS.ROLE_SELECTION, role: null, data: {} });
      return buildButtons(
        '👋 Welcome to *CrewHive!*\n\nThe platform connecting professional crew with employers in Kerala.\n\nWhat is your role?',
        [
          { id: 'crew', title: '👷 Crew Member' },
          { id: 'employer', title: '💼 Employer' },
        ],
        STEPS.ROLE_SELECTION,
        'Welcome to CrewHive!',
      );
    }

    const step = userState.step;

    // Restart
    if (msg === 'restart' || msg === 'reset') {
      await saveUserState(userId, { step: STEPS.ROLE_SELECTION, role: null, data: {}, pendingBookingId: null });
      return buildButtons(
        '🔄 *Starting over.*\n\nWelcome back to CrewHive! What is your role?',
        [
          { id: 'crew', title: '👷 Crew Member' },
          { id: 'employer', title: '💼 Employer' },
        ],
        STEPS.ROLE_SELECTION,
        'CrewHive',
      );
    }

    // Resume
    if (msg === 'hi' || msg === 'hello' || msg === 'start') {
      return await resumeStep(step, userState, userId);
    }

    // ── Role selection ─────────────────────────────────────────────────────────
    if (step === STEPS.ROLE_SELECTION) {
      if (msg === 'crew' || msg === '1') {
        await saveUserState(userId, { role: 'crew', step: STEPS.CREW_NAME });
        return buildText('Great! You selected *Crew* 🎬\n\nWhat is your *full name*?', STEPS.CREW_NAME);
      }
      if (msg === 'employer' || msg === '2') {
        await saveUserState(userId, { role: 'employer', step: STEPS.EMP_NAME });
        return buildText('Great! You selected *Employer* 💼\n\nWhat is your *full name*?', STEPS.EMP_NAME);
      }
      return buildButtons(
        'Please select your role:',
        [{ id: 'crew', title: '👷 Crew Member' }, { id: 'employer', title: '💼 Employer' }],
        STEPS.ROLE_SELECTION,
      );
    }

    // ══════════════════════════════════════════════════════ CREW FLOW ══════════

    if (step === STEPS.CREW_NAME) {
      const name = message.trim();
      if (!name || name.length < 2) return buildText('Please enter your *full name* (min 2 characters):', STEPS.CREW_NAME);
      await saveUserState(userId, { 'data.name': name, step: STEPS.CREW_CITY });
      return cityListMsg(STEPS.CREW_CITY);
    }

    if (step === STEPS.CREW_CITY) {
      if (msg === 'other') {
        await saveUserState(userId, { step: STEPS.CREW_CITY_OTHER });
        return buildText('Please *type your city name*:', STEPS.CREW_CITY_OTHER);
      }
      const city = CITIES.find((c) => c.toLowerCase().replace(/\s/g, '_') === msg.replace(/\s/g, '_'));
      if (!city) return cityListMsg(STEPS.CREW_CITY);
      await saveUserState(userId, { 'data.city': city, step: STEPS.CREW_ROLE });
      return roleListMsg(STEPS.CREW_ROLE);
    }

    if (step === STEPS.CREW_CITY_OTHER) {
      const city = message.trim();
      if (!city || city.length < 2) return buildText('Please enter a valid city name:', STEPS.CREW_CITY_OTHER);
      await saveUserState(userId, { 'data.city': city, step: STEPS.CREW_ROLE });
      return roleListMsg(STEPS.CREW_ROLE);
    }

    if (step === STEPS.CREW_ROLE) {
      const idx = parseInt(msg, 10);
      if (isNaN(idx) || idx < 1 || idx > CREW_ROLES.length) return roleListMsg(STEPS.CREW_ROLE);
      const role = CREW_ROLES[idx - 1];
      await saveUserState(userId, { 'data.crewRole': role, step: STEPS.CREW_EXPERIENCE });
      return experienceListMsg(STEPS.CREW_EXPERIENCE);
    }

    if (step === STEPS.CREW_EXPERIENCE) {
      const expMap = { '1': '0-2 years', '2': '3-5 years', '3': '5-10 years', '4': '10+ years' };
      const exp = expMap[msg];
      if (!exp) return experienceListMsg(STEPS.CREW_EXPERIENCE);
      await saveUserState(userId, { 'data.experience': exp, step: STEPS.CREW_PHONE_CONFIRM });
      const digits = phoneToDocId(userId);
      const display = digits.length > 10 ? `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`;
      return buildButtons(
        `Almost done! ✅\n\nShould we use your WhatsApp number for OTP login?\n\n📱 *${display}*`,
        [{ id: 'yes', title: '✅ Yes, use this' }, { id: 'no', title: '❌ No, different' }],
        STEPS.CREW_PHONE_CONFIRM,
      );
    }

    if (step === STEPS.CREW_PHONE_CONFIRM) {
      if (msg === 'yes' || msg === 'y') {
        const phone = `+${phoneToDocId(userId)}`;
        return await finalizeCrewProfile(userId, await getUserState(userId), phone);
      }
      if (msg === 'no' || msg === 'n') {
        await saveUserState(userId, { step: STEPS.CREW_PHONE_MANUAL });
        return buildText('Please enter your *preferred phone number* for OTP:\n\n_Example: +91XXXXXXXXXX_', STEPS.CREW_PHONE_MANUAL);
      }
      return buildButtons(
        'Please select an option:',
        [{ id: 'yes', title: '✅ Yes, use this' }, { id: 'no', title: '❌ No, different' }],
        STEPS.CREW_PHONE_CONFIRM,
      );
    }

    if (step === STEPS.CREW_PHONE_MANUAL) {
      const phone = message.trim().replace(/\s/g, '');
      if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
        return buildText('Please enter a valid phone number:\n_Example: +91XXXXXXXXXX_', STEPS.CREW_PHONE_MANUAL);
      }
      return await finalizeCrewProfile(userId, await getUserState(userId), phone.startsWith('+') ? phone : `+${phone}`);
    }

    // ══════════════════════════════════════════════════ EMPLOYER FLOW ══════════

    if (step === STEPS.EMP_NAME) {
      const name = message.trim();
      if (!name || name.length < 2) return buildText('Please enter your *full name* (min 2 characters):', STEPS.EMP_NAME);
      await saveUserState(userId, { 'data.name': name, step: STEPS.EMP_COMPANY });
      return buildText(`Nice to meet you, *${name}*! 👋\n\nWhat is your *company name*?`, STEPS.EMP_COMPANY);
    }

    if (step === STEPS.EMP_COMPANY) {
      const company = message.trim();
      if (!company) return buildText('Please enter your company name:', STEPS.EMP_COMPANY);
      await saveUserState(userId, { 'data.company': company, step: STEPS.EMP_CITY });
      return cityListMsg(STEPS.EMP_CITY);
    }

    if (step === STEPS.EMP_CITY) {
      if (msg === 'other') {
        await saveUserState(userId, { step: STEPS.EMP_CITY_OTHER });
        return buildText('Please *type your city name*:', STEPS.EMP_CITY_OTHER);
      }
      const city = CITIES.find((c) => c.toLowerCase().replace(/\s/g, '_') === msg.replace(/\s/g, '_'));
      if (!city) return cityListMsg(STEPS.EMP_CITY);
      await saveUserState(userId, { 'data.city': city, step: STEPS.EMP_REQUIREMENTS });
      return buildText(`*${city}* noted! 📍\n\nDescribe your *hiring requirements*:\n_e.g. type of crew, event type, frequency_`, STEPS.EMP_REQUIREMENTS);
    }

    if (step === STEPS.EMP_CITY_OTHER) {
      const city = message.trim();
      if (!city || city.length < 2) return buildText('Please enter a valid city name:', STEPS.EMP_CITY_OTHER);
      await saveUserState(userId, { 'data.city': city, step: STEPS.EMP_REQUIREMENTS });
      return buildText(`*${city}* noted! 📍\n\nDescribe your *hiring requirements*:\n_e.g. type of crew, event type, frequency_`, STEPS.EMP_REQUIREMENTS);
    }

    if (step === STEPS.EMP_REQUIREMENTS) {
      const req = message.trim();
      if (!req) return buildText('Please describe your hiring requirements:', STEPS.EMP_REQUIREMENTS);
      const freshState = await getUserState(userId);
      const d = freshState?.data || {};
      const { createEmployerProfile } = await import('./firestore');
      await createEmployerProfile(userId, {
        name: d.name,
        company: d.company,
        city: d.city,
        requirements: req,
        phone: `+${phoneToDocId(userId)}`,
      });
      await saveUserState(userId, {
        step: STEPS.EMP_COMPLETE,
        role: 'employer',
        approved: false,
        'data.requirements': req,
      });
      return buildText(
        `🎉 *Registration Complete!*\n\n📋 *Summary:*\n• Name: ${d.name}\n• Company: ${d.company}\n• City: ${d.city}\n• Requirements: ${req}\n\nYour profile is under review. You will be notified once approved. Welcome to CrewHive! 🚀`,
        STEPS.EMP_COMPLETE,
      );
    }

    // ── Completed ──────────────────────────────────────────────────────────────
    if (step === STEPS.CREW_COMPLETE || step === STEPS.EMP_COMPLETE) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crewhive.app';
      return buildText(
        `✅ Your profile is already set up!\n\nLog in at: ${appUrl}/login\n\nType *restart* to start over.`,
        step,
      );
    }

    // ── Booking response ───────────────────────────────────────────────────────
    if (step === STEPS.BOOKING_RESPONSE) {
      const bookingId = userState.pendingBookingId;
      if (msg === 'yes' || msg === 'y') {
        if (bookingId) {
          const { updateBooking, updateCrewProfile } = await import('./firestore');
          await updateBooking(bookingId, { status: 'accepted' });
          await updateCrewProfile(userId, { available: false });
        }
        await saveUserState(userId, { step: STEPS.CREW_COMPLETE, pendingBookingId: null });
        return buildText('✅ *Booking Accepted!*\n\nYou are confirmed for this job. Your availability is now set to unavailable.\n\nGood luck! 🎬', STEPS.CREW_COMPLETE);
      }
      if (msg === 'no' || msg === 'n') {
        await saveUserState(userId, { step: STEPS.CREW_COMPLETE, pendingBookingId: null });
        return buildText('❌ *Booking Declined.*\n\nNo worries — more opportunities will come! 💪', STEPS.CREW_COMPLETE);
      }
      return buildButtons(
        '🔔 You have a *pending job request*. Are you available?',
        [{ id: 'yes', title: '✅ Accept' }, { id: 'no', title: '❌ Decline' }],
        STEPS.BOOKING_RESPONSE,
      );
    }

    // ── Fallback ───────────────────────────────────────────────────────────────
    return buildText('I\'m not sure how to respond. 🤔\n\nType *Hi* to continue or *restart* to start over.', step);

  } catch (error) {
    console.error('[ConversationEngine] Error:', error);
    return { success: false, type: 'text', text: 'Something went wrong. Please try again.', error: error.message };
  }
};

// ─── Finalize crew profile ────────────────────────────────────────────────────
const finalizeCrewProfile = async (userId, freshState, phone) => {
  const d = freshState?.data || {};
  const { createCrewProfile } = await import('./firestore');
  await createCrewProfile(userId, {
    name: d.name,
    city: d.city,
    role: d.crewRole,
    experience: d.experience,
    phone,
  });
  await saveUserState(userId, {
    step: STEPS.CREW_COMPLETE,
    role: 'crew',
    phone,
    approved: false,
    'data.phone': phone,
  });
  return buildText(
    `🎉 *Registration Complete!*\n\n📋 *Summary:*\n• Name: ${d.name}\n• City: ${d.city}\n• Role: ${d.crewRole}\n• Experience: ${d.experience}\n• Phone: ${phone}\n\nYour profile is under review. You will be notified once approved. Welcome to CrewHive! 🚀`,
    STEPS.CREW_COMPLETE,
  );
};

// ─── Resume step prompt ───────────────────────────────────────────────────────
const resumeStep = async (step, userState, userId) => {
  switch (step) {
    case STEPS.ROLE_SELECTION:
      return buildButtons(
        '👋 Welcome back! Please select your role:',
        [{ id: 'crew', title: '👷 Crew Member' }, { id: 'employer', title: '💼 Employer' }],
        step,
      );
    case STEPS.CREW_NAME:
    case STEPS.EMP_NAME:
      return buildText('What is your *full name*?', step);
    case STEPS.CREW_CITY:
    case STEPS.EMP_CITY:
      return cityListMsg(step);
    case STEPS.CREW_CITY_OTHER:
    case STEPS.EMP_CITY_OTHER:
      return buildText('Please *type your city name*:', step);
    case STEPS.CREW_ROLE:
      return roleListMsg(step);
    case STEPS.CREW_EXPERIENCE:
      return experienceListMsg(step);
    case STEPS.CREW_PHONE_CONFIRM: {
      const digits = phoneToDocId(userId);
      const display = `+${digits.slice(0, 2)} ${digits.slice(2)}`;
      return buildButtons(
        `Should we use your WhatsApp number for OTP?\n📱 *${display}*`,
        [{ id: 'yes', title: '✅ Yes, use this' }, { id: 'no', title: '❌ No, different' }],
        step,
      );
    }
    case STEPS.CREW_PHONE_MANUAL:
      return buildText('Please enter your *preferred phone number*:\n_Example: +91XXXXXXXXXX_', step);
    case STEPS.EMP_REQUIREMENTS:
      return buildText('Describe your *hiring requirements*:', step);
    case STEPS.BOOKING_RESPONSE:
      return buildButtons(
        '🔔 You have a *pending job request*. Are you available?',
        [{ id: 'yes', title: '✅ Accept' }, { id: 'no', title: '❌ Decline' }],
        step,
      );
    default:
      return buildText('👋 Welcome back!\n\nType *restart* to begin a fresh session.', step);
  }
};

// ─── Booking notification ─────────────────────────────────────────────────────
export const sendBookingNotificationToCrew = async (crewId, bookingId, organizerName, jobDetails) => {
  try {
    const saveUserState_ = async (phone, updates) => {
      const ref = doc(db, 'users', phoneToDocId(phone));
      const snap = await getDoc(ref);
      const payload = { ...updates, updatedAt: new Date().toISOString() };
      if (snap.exists()) await updateDoc(ref, payload);
      else await setDoc(ref, { createdAt: new Date().toISOString(), ...payload });
    };
    await saveUserState_(crewId, { step: STEPS.BOOKING_RESPONSE, pendingBookingId: bookingId });
    return {
      success: true,
      message: {
        type: 'buttons',
        text: `🔔 *New Job Request!*\n\n*From:* ${organizerName}\n*Details:* ${jobDetails}\n\nAre you available for this job?`,
        buttons: [{ id: 'yes', title: '✅ Accept' }, { id: 'no', title: '❌ Decline' }],
      },
    };
  } catch (error) {
    console.error('[ConversationEngine] sendBookingNotificationToCrew error:', error);
    return { success: false, error: error.message };
  }
};
