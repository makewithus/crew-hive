/**
 * Conversation Engine — CrewHive
 * Handles WhatsApp onboarding for Crew and Employer roles.
 * State is persisted in Firestore users/{phoneDigits}.
 *
 * handleMessage() returns either:
 *   - a single message object  { type, text, ... }
 *   - an array of messages     [msg1, msg2, ...]
 *     → the webhook sends each one sequentially
 *       (used for welcome + immediate role prompt on first contact)
 */

import { adminDb } from './firebase-admin';
import logger from './logger';

// ─── Steps ────────────────────────────────────────────────────────────────────
export const STEPS = {
  ROLE_SELECTION:    'role_selection',
  // Crew
  CREW_NAME:         'crew_name',
  CREW_CITY:         'crew_city',
  CREW_CITY_OTHER:   'crew_city_other',
  CREW_ROLE:         'crew_role',
  CREW_EXPERIENCE:   'crew_experience',
  CREW_PHONE_CONFIRM:'crew_phone_confirm',
  CREW_PHONE_MANUAL: 'crew_phone_manual',
  CREW_COMPLETE:     'crew_complete',
  // Employer
  EMP_NAME:          'emp_name',
  EMP_COMPANY:       'emp_company',
  EMP_CITY:          'emp_city',
  EMP_CITY_OTHER:    'emp_city_other',
  EMP_REQUIREMENTS:  'emp_requirements',
  EMP_PHONE_CONFIRM: 'emp_phone_confirm',
  EMP_PHONE_MANUAL:  'emp_phone_manual',
  EMP_COMPLETE:      'emp_complete',
  // Booking
  BOOKING_RESPONSE:  'booking_response',
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

// ─── Phone helpers ────────────────────────────────────────────────────────────
/** Firestore doc ID: digits only, e.g. "919876543210" */
export const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

/** Pretty display, e.g. +91 98765 43210 */
const formatPhone = (digits) => {
  const d = String(digits).replace(/\D/g, '');
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 11) return `+${d.slice(0, 1)} ${d.slice(1, 6)} ${d.slice(6)}`;
  return `+${d}`;
};

// ─── Firestore state ──────────────────────────────────────────────────────────
const getUserState = async (phone) => {
  const snap = await adminDb().collection('users').doc(phoneToDocId(phone)).get();
  return snap.exists ? snap.data() : null;
};

const saveUserState = async (phone, updates) => {
  try {
    const ref = adminDb().collection('users').doc(phoneToDocId(phone));
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
    logger.log('[ConversationEngine] saveUserState ok | phone:', phoneToDocId(phone), '| keys:', Object.keys(updates).join(', '));
  } catch (err) {
    logger.error('[ConversationEngine] saveUserState error:', err.message, '| phone:', phoneToDocId(phone));
    throw err;
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

// ─── Reusable prompts ─────────────────────────────────────────────────────────
const roleSelectionMsg = () =>
  buildButtons(
    'Please select your role to get started:',
    [
      { id: 'crew',     title: '👷 Crew Member' },
      { id: 'employer', title: '💼 Employer' },
    ],
    STEPS.ROLE_SELECTION,
    'Select Your Role',
  );

const cityListMsg = (step) =>
  buildList(
    "Which city are you based in?\n\n_Select from the list. If your city isn't listed, choose *Other* and type it._",
    [{ rows: CITIES.map((c, i) => ({ id: c.toLowerCase().replace(/\s/g, '_'), title: `${i + 1}. ${c}` })) }],
    step,
    '🏙️ Choose City',
    'Select Your City',
  );

const crewRoleListMsg = (step) =>
  buildList(
    'What is your primary *role*?',
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
        { id: '1', title: '1. 0–2 years',  description: 'Fresher / Early career' },
        { id: '2', title: '2. 3–5 years',  description: 'Intermediate' },
        { id: '3', title: '3. 5–10 years', description: 'Experienced' },
        { id: '4', title: '4. 10+ years',  description: 'Senior / Expert' },
      ],
    }],
    step,
    '📊 Experience',
    'Select Experience Level',
  );

const phoneConfirmMsg = (userId, step) => {
  const display = formatPhone(phoneToDocId(userId));
  return buildButtons(
    `We have your WhatsApp number:\n\n📱 *${display}*\n\nShould we use this number for OTP login on CrewHive?`,
    [
      { id: 'yes', title: '✅ Yes, use this' },
      { id: 'no',  title: '❌ No, different' },
    ],
    step,
  );
};

const thankyouMsg = (role) =>
  buildText(
    `🙏 *Thank you for registering with CrewHive!*\n\n` +
    `Your ${role === 'employer' ? 'employer' : 'crew'} profile has been submitted and is *under review* by our team.\n\n` +
    `We will notify you here on WhatsApp once your profile is approved.\n\n` +
    `_Please wait for approval before attempting to log in._`,
    role === 'employer' ? STEPS.EMP_COMPLETE : STEPS.CREW_COMPLETE,
  );

// ─── Main handler ─────────────────────────────────────────────────────────────
/**
 * Process an incoming WhatsApp message.
 * @param {{ userId: string, message: string }} param
 * Returns a single message object OR an array [msg1, msg2] — webhook handles both.
 */
export const handleMessage = async ({ userId, message }) => {
  logger.log('[ConversationEngine] Incoming | userId:', userId, '| message:', JSON.stringify(message));
  try {
    let userState = await getUserState(userId);
    const msg = message.trim().toLowerCase();

    // ── Brand-new user ─────────────────────────────────────────────────────────
    if (!userState) {
      await saveUserState(userId, { step: STEPS.ROLE_SELECTION, role: null, data: {} });
      // Two messages: welcome text first, then role selection immediately after
      return [
        buildText(
          '👋 Welcome to *CrewHive!*\n\nThe platform connecting professional crew with employers in Kerala. 🎬',
          STEPS.ROLE_SELECTION,
        ),
        roleSelectionMsg(),
      ];
    }

    const step = userState.step;

    // ── Restart ────────────────────────────────────────────────────────────────
    if (msg === 'restart' || msg === 'reset') {
      await saveUserState(userId, { step: STEPS.ROLE_SELECTION, role: null, data: {}, pendingBookingId: null });
      return [
        buildText("🔄 *Starting over.*\n\nLet's get you set up on CrewHive!", STEPS.ROLE_SELECTION),
        roleSelectionMsg(),
      ];
    }

    // ── Greeting from existing user ────────────────────────────────────────────
    if (/^(hi+|hey|hello|hii+|start|helo|yo)$/i.test(msg)) {
      if (step === STEPS.CREW_COMPLETE || step === STEPS.EMP_COMPLETE) {
        if (userState.approved) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crew-hive.vercel.app';
          return buildText(
            `👋 Welcome back to *CrewHive!*\n\nYour profile is live ✅\n\n🔗 Login here: ${appUrl}\n\nType *restart* to start over.`,
            step,
          );
        }
        return buildText(
          '👋 Welcome back!\n\nYour profile is still *under review*. We\'ll notify you once it\'s approved.\n\nType *restart* to start over.',
          step,
        );
      }
      return await resumeStep(step, userState, userId);
    }

    // ── Role selection ─────────────────────────────────────────────────────────
    if (step === STEPS.ROLE_SELECTION) {
      if (msg === 'crew' || msg === '1') {
        await saveUserState(userId, { role: 'crew', step: STEPS.CREW_NAME });
        return buildText('👷 *Crew Member* selected!\n\nWhat is your *full name*?', STEPS.CREW_NAME);
      }
      if (msg === 'employer' || msg === '2') {
        await saveUserState(userId, { role: 'employer', step: STEPS.EMP_NAME });
        return buildText('💼 *Employer* selected!\n\nWhat is your *full name*?', STEPS.EMP_NAME);
      }
      return roleSelectionMsg();
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
      return crewRoleListMsg(STEPS.CREW_ROLE);
    }

    if (step === STEPS.CREW_CITY_OTHER) {
      const city = message.trim();
      if (!city || city.length < 2) return buildText('Please enter a valid city name:', STEPS.CREW_CITY_OTHER);
      await saveUserState(userId, { 'data.city': city, step: STEPS.CREW_ROLE });
      return crewRoleListMsg(STEPS.CREW_ROLE);
    }

    if (step === STEPS.CREW_ROLE) {
      const idx = parseInt(msg, 10);
      if (isNaN(idx) || idx < 1 || idx > CREW_ROLES.length) return crewRoleListMsg(STEPS.CREW_ROLE);
      const role = CREW_ROLES[idx - 1];
      await saveUserState(userId, { 'data.crewRole': role, step: STEPS.CREW_EXPERIENCE });
      return experienceListMsg(STEPS.CREW_EXPERIENCE);
    }

    if (step === STEPS.CREW_EXPERIENCE) {
      const expMap = { '1': '0–2 years', '2': '3–5 years', '3': '5–10 years', '4': '10+ years' };
      const exp = expMap[msg];
      if (!exp) return experienceListMsg(STEPS.CREW_EXPERIENCE);
      await saveUserState(userId, { 'data.experience': exp, step: STEPS.CREW_PHONE_CONFIRM });
      return phoneConfirmMsg(userId, STEPS.CREW_PHONE_CONFIRM);
    }

    if (step === STEPS.CREW_PHONE_CONFIRM) {
      if (msg === 'yes' || msg === 'y') {
        const phone = `+${phoneToDocId(userId)}`;
        return await finalizeCrewProfile(userId, phone);
      }
      if (msg === 'no' || msg === 'n') {
        await saveUserState(userId, { step: STEPS.CREW_PHONE_MANUAL });
        return buildText('Please type your *phone number* for OTP login:\n\n_Example: +91XXXXXXXXXX_', STEPS.CREW_PHONE_MANUAL);
      }
      return phoneConfirmMsg(userId, STEPS.CREW_PHONE_CONFIRM);
    }

    if (step === STEPS.CREW_PHONE_MANUAL) {
      const phone = message.trim().replace(/\s/g, '');
      if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
        return buildText('Please enter a valid phone number:\n_Example: +91XXXXXXXXXX_', STEPS.CREW_PHONE_MANUAL);
      }
      return await finalizeCrewProfile(userId, phone.startsWith('+') ? phone : `+${phone}`);
    }

    // ══════════════════════════════════════════════════ EMPLOYER FLOW ══════════

    if (step === STEPS.EMP_NAME) {
      const name = message.trim();
      if (!name || name.length < 2) return buildText('Please enter your *full name* (min 2 characters):', STEPS.EMP_NAME);
      await saveUserState(userId, { 'data.name': name, step: STEPS.EMP_COMPANY });
      return buildText(`Nice to meet you, *${name}*! 👋\n\nWhat is your *company / production house name*?`, STEPS.EMP_COMPANY);
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
      return buildText(`📍 *${city}* noted!\n\nBriefly describe your *hiring requirements*:\n_e.g. "Need a photographer and sound engineer for weekly shoots in Kochi"_`, STEPS.EMP_REQUIREMENTS);
    }

    if (step === STEPS.EMP_CITY_OTHER) {
      const city = message.trim();
      if (!city || city.length < 2) return buildText('Please enter a valid city name:', STEPS.EMP_CITY_OTHER);
      await saveUserState(userId, { 'data.city': city, step: STEPS.EMP_REQUIREMENTS });
      return buildText(`📍 *${city}* noted!\n\nBriefly describe your *hiring requirements*:\n_e.g. "Need a photographer and sound engineer for weekly shoots"_`, STEPS.EMP_REQUIREMENTS);
    }

    if (step === STEPS.EMP_REQUIREMENTS) {
      const req = message.trim();
      if (!req || req.length < 5) return buildText('Please describe your hiring requirements (at least a few words):', STEPS.EMP_REQUIREMENTS);
      await saveUserState(userId, { 'data.requirements': req, step: STEPS.EMP_PHONE_CONFIRM });
      return phoneConfirmMsg(userId, STEPS.EMP_PHONE_CONFIRM);
    }

    if (step === STEPS.EMP_PHONE_CONFIRM) {
      if (msg === 'yes' || msg === 'y') {
        const phone = `+${phoneToDocId(userId)}`;
        return await finalizeEmployerProfile(userId, phone);
      }
      if (msg === 'no' || msg === 'n') {
        await saveUserState(userId, { step: STEPS.EMP_PHONE_MANUAL });
        return buildText('Please type your *phone number* for OTP login:\n\n_Example: +91XXXXXXXXXX_', STEPS.EMP_PHONE_MANUAL);
      }
      return phoneConfirmMsg(userId, STEPS.EMP_PHONE_CONFIRM);
    }

    if (step === STEPS.EMP_PHONE_MANUAL) {
      const phone = message.trim().replace(/\s/g, '');
      if (!/^\+?[1-9]\d{9,14}$/.test(phone)) {
        return buildText('Please enter a valid phone number:\n_Example: +91XXXXXXXXXX_', STEPS.EMP_PHONE_MANUAL);
      }
      return await finalizeEmployerProfile(userId, phone.startsWith('+') ? phone : `+${phone}`);
    }

    // ── Already completed ──────────────────────────────────────────────────────
    if (step === STEPS.CREW_COMPLETE || step === STEPS.EMP_COMPLETE) {
      if (userState.approved) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crew-hive.vercel.app';
        return buildText(`✅ Your profile is already live!\n\n🔗 Login: ${appUrl}\n\nType *restart* to start over.`, step);
      }
      return buildText(
        '⏳ Your profile is *under review*.\n\nWe\'ll notify you here once approved. Please wait!\n\nType *restart* to start over.',
        step,
      );
    }

    // ── Booking response ───────────────────────────────────────────────────────
    if (step === STEPS.BOOKING_RESPONSE) {
      const bookingId = userState.pendingBookingId;
      if (msg === 'yes' || msg === 'y') {
        if (bookingId) {
          const ts = new Date().toISOString();
          await adminDb().collection('bookings').doc(bookingId).update({ status: 'accepted', updatedAt: ts });
          await adminDb().collection('crew').doc(phoneToDocId(userId)).update({ available: false, updatedAt: ts });
        }
        await saveUserState(userId, { step: STEPS.CREW_COMPLETE, pendingBookingId: null });
        return buildText('✅ *Booking Accepted!*\n\nYou are confirmed for this job. Good luck! 🎬', STEPS.CREW_COMPLETE);
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
    return buildText("🤔 I'm not sure how to respond.\n\nType *Hi* to continue where you left off, or *restart* to start over.", step);

  } catch (error) {
    logger.error('[ConversationEngine] Error:', error);
    return { success: false, type: 'text', text: 'Something went wrong. Please try again.', error: error.message };
  }
};

// ─── Finalize crew profile ────────────────────────────────────────────────────
const finalizeCrewProfile = async (userId, phone) => {
  const freshState = await getUserState(userId);
  const d = freshState?.data || {};
  const id = phoneToDocId(userId);
  const ts = new Date().toISOString();

  // Create / update crew document (used by the web app)
  await adminDb().collection('crew').doc(id).set({
    id,
    whatsappPhone: `+${id}`,
    phone,
    name: d.name || '',
    city: d.city || '',
    role: d.crewRole || '',
    experience: d.experience || '',
    status: 'pending',
    approved: false,
    available: false,
    createdAt: ts,
    updatedAt: ts,
  }, { merge: true });

  // Mirror all profile data into the users doc so OTP login auto-loads the profile
  await saveUserState(userId, {
    step: STEPS.CREW_COMPLETE,
    role: 'crew',
    phone,
    approved: false,
    name: d.name || '',
    city: d.city || '',
    crewRole: d.crewRole || '',
    experience: d.experience || '',
    profileComplete: true,
    'data.phone': phone,
  });

  logger.log('[ConversationEngine] Crew profile finalized | id:', id, '| phone:', phone);
  return thankyouMsg('crew');
};

// ─── Finalize employer profile ────────────────────────────────────────────────
const finalizeEmployerProfile = async (userId, phone) => {
  const freshState = await getUserState(userId);
  const d = freshState?.data || {};
  const id = phoneToDocId(userId);
  const ts = new Date().toISOString();

  // Create / update employers document
  await adminDb().collection('employers').doc(id).set({
    id,
    whatsappPhone: `+${id}`,
    phone,
    name: d.name || '',
    company: d.company || '',
    city: d.city || '',
    requirements: d.requirements || '',
    status: 'pending',
    approved: false,
    createdAt: ts,
    updatedAt: ts,
  }, { merge: true });

  // Mirror into users doc
  await saveUserState(userId, {
    step: STEPS.EMP_COMPLETE,
    role: 'employer',
    phone,
    approved: false,
    name: d.name || '',
    city: d.city || '',
    company: d.company || '',
    requirements: d.requirements || '',
    profileComplete: true,
    'data.phone': phone,
  });

  logger.log('[ConversationEngine] Employer profile finalized | id:', id, '| phone:', phone);
  return thankyouMsg('employer');
};

// ─── Resume step prompt ───────────────────────────────────────────────────────
const resumeStep = async (step, userState, userId) => {
  switch (step) {
    case STEPS.ROLE_SELECTION:
      return roleSelectionMsg();
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
      return crewRoleListMsg(step);
    case STEPS.CREW_EXPERIENCE:
      return experienceListMsg(step);
    case STEPS.CREW_PHONE_CONFIRM:
    case STEPS.EMP_PHONE_CONFIRM:
      return phoneConfirmMsg(userId, step);
    case STEPS.CREW_PHONE_MANUAL:
    case STEPS.EMP_PHONE_MANUAL:
      return buildText('Please type your *phone number* for OTP login:\n_Example: +91XXXXXXXXXX_', step);
    case STEPS.EMP_COMPANY:
      return buildText('What is your *company / production house name*?', step);
    case STEPS.EMP_REQUIREMENTS:
      return buildText('Please describe your *hiring requirements*:', step);
    case STEPS.BOOKING_RESPONSE:
      return buildButtons(
        '🔔 You have a *pending job request*. Are you available?',
        [{ id: 'yes', title: '✅ Accept' }, { id: 'no', title: '❌ Decline' }],
        step,
      );
    case STEPS.CREW_COMPLETE:
    case STEPS.EMP_COMPLETE: {
      if (userState?.approved) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crew-hive.vercel.app';
        return buildText(`✅ Your profile is approved!\n\n🔗 Login: ${appUrl}`, step);
      }
      return buildText('⏳ Your profile is still *under review*. We\'ll notify you once approved.', step);
    }
    default:
      return buildText('👋 Welcome back!\n\nType *restart* to begin a fresh session.', step);
  }
};

/**
 * Builds the approval congratulations message sent by the admin approval flow.
 * Import and call this from the admin approve API route, then send via sendConversationMessage.
 */
export const buildApprovalMessage = (role) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crew-hive.vercel.app';
  return buildText(
    `🎉 *Congratulations! Your CrewHive profile has been approved!*\n\n` +
    (role === 'employer'
      ? `You can now log in and start finding professional crew for your projects.\n\n`
      : `You are now visible to employers looking for crew in Kerala.\n\n`) +
    `🔗 *Login here:* ${appUrl}\n\n_Use OTP login with the phone number you registered._`,
    role === 'employer' ? STEPS.EMP_COMPLETE : STEPS.CREW_COMPLETE,
  );
};
