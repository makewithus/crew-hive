/**
 * backend/services/prebooking.service.js — Pre-bookings with date holds (F7 [P2]).
 * Feature-flagged behind PRE_BOOKINGS_ENABLED (disabled by default).
 */
import { getDb } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { gate } from "./feature.service.js";
import { audit } from "../lib/audit.js";

const now = () => new Date().toISOString();
const HOLD_HOURS = 48;

export function isPrebookingEnabled() {
  return process.env.PRE_BOOKINGS_ENABLED === "true";
}

export async function createDateHold(user, { crewId, date, endDate, eventName, location, notes, offeredRate }) {
  if (!isPrebookingEnabled()) {
    throw Errors.badRequest("Pre-bookings feature is currently disabled.");
  }
  await gate(user, "pre_bookings");
  const db = getDb();
  const cId = String(crewId).replace(/\D/g, "");
  if (!cId) throw Errors.badRequest("crewId is required");
  if (!date) throw Errors.badRequest("date is required");

  // Conflict check: existing active hold or accepted booking on same date
  const existingHolds = await db.collection("date_holds")
    .where("crewId", "==", cId)
    .where("date", "==", date)
    .get();

  for (const doc of existingHolds.docs) {
    const h = doc.data();
    if (h.status === "accepted" || (["pending", "held"].includes(h.status) && (h.holdExpiresAt || "") > now())) {
      throw Errors.conflict("Crew already has an active hold or confirmed booking on this date.");
    }
  }

  const expiresAt = new Date(Date.now() + HOLD_HOURS * 3600_000).toISOString();
  const holdData = {
    recruiterId: user.id,
    crewId: cId,
    date,
    endDate: endDate || date,
    eventName: String(eventName || "").slice(0, 120),
    location: String(location || "").slice(0, 120),
    notes: String(notes || "").slice(0, 500),
    offeredRate: offeredRate ? Number(offeredRate) : null,
    status: "pending",
    holdExpiresAt: expiresAt,
    createdAt: now(),
    updatedAt: now(),
  };

  const ref = await db.collection("date_holds").add(holdData);
  await audit("date_hold_created", user.id, ref.id, { crewId: cId, date });
  return { id: ref.id, ...holdData };
}

export async function listDateHolds(user) {
  const db = getDb();
  const isRecruiter = user.role === "organizer" || user.role === "recruiter";
  const field = isRecruiter ? "recruiterId" : "crewId";
  const snap = await db.collection("date_holds").where(field, "==", user.id).get();
  const holds = [];
  for (const d of snap.docs) {
    const data = d.data();
    let status = data.status;
    if (status === "pending" && data.holdExpiresAt && data.holdExpiresAt < now()) {
      status = "expired";
      // Update lazily in background
      d.ref.update({ status: "expired", updatedAt: now() }).catch(() => {});
    }
    holds.push({ id: d.id, ...data, status });
  }
  return holds;
}

export async function updateDateHoldStatus(user, holdId, newStatus) {
  const db = getDb();
  const ref = db.collection("date_holds").doc(holdId);
  const snap = await ref.get();
  if (!snap.exists) throw Errors.notFound("Date hold not found");
  const hold = snap.data();

  if (hold.status === "pending" && hold.holdExpiresAt && hold.holdExpiresAt < now()) {
    await ref.update({ status: "expired", updatedAt: now() });
    throw Errors.badRequest("Date hold has expired and cannot be updated");
  }

  if (!["accepted", "declined", "cancelled"].includes(newStatus)) {
    throw Errors.badRequest("Invalid status transition");
  }

  // Only crew can accept/decline; only recruiter can cancel
  if (["accepted", "declined"].includes(newStatus) && user.id !== hold.crewId) {
    throw Errors.forbidden("Only the invited crew can accept or decline this hold");
  }
  if (newStatus === "cancelled" && user.id !== hold.recruiterId) {
    throw Errors.forbidden("Only the booking recruiter can cancel this hold");
  }

  await ref.update({ status: newStatus, updatedAt: now() });
  await audit(`date_hold_${newStatus}`, user.id, holdId, {});
  return { id: holdId, status: newStatus };
}

