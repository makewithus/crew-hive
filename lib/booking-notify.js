/**
 * lib/booking-notify.js — Client-safe booking notification helper
 * Used by organizer pages (client components) to set up a booking response
 * flow for a crew member via WhatsApp.
 * Uses the client Firebase SDK (works in authenticated browser context).
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import logger from './logger';

const phoneToDocId = (phone) => String(phone).replace(/\D/g, '');

const BOOKING_RESPONSE = 'booking_response';

export const sendBookingNotificationToCrew = async (crewId, bookingId, organizerName, jobDetails) => {
  try {
    const ref = doc(db, 'users', phoneToDocId(crewId));
    const snap = await getDoc(ref);
    const payload = {
      step: BOOKING_RESPONSE,
      pendingBookingId: bookingId,
      updatedAt: new Date().toISOString(),
    };
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { createdAt: new Date().toISOString(), ...payload });
    }
    return {
      success: true,
      message: {
        type: 'buttons',
        text: `🔔 *New Job Request!*\n\n*From:* ${organizerName}\n*Details:* ${jobDetails}\n\nAre you available for this job?`,
        buttons: [{ id: 'yes', title: '✅ Accept' }, { id: 'no', title: '❌ Decline' }],
      },
    };
  } catch (error) {
    logger.error('[booking-notify] sendBookingNotificationToCrew error:', error);
    return { success: false, error: error.message };
  }
};
