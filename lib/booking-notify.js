/**
 * lib/booking-notify.js — Client-safe booking notification helper
 * Used by organizer pages (client components) to set up a booking response
 * flow for a crew member via WhatsApp.
 * Calls a server route so the cross-user Firestore update is authorized
 * against the booking and performed by the Admin SDK.
 */

import { auth } from './firebase';
import logger from './logger';

const BOOKING_RESPONSE = 'booking_response';

export const sendBookingNotificationToCrew = async (crewId, bookingId, organizerName, jobDetails) => {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    const res = await fetch('/api/bookings/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ crewId, bookingId }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to notify crew');
    }

    return {
      success: true,
      step: BOOKING_RESPONSE,
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
