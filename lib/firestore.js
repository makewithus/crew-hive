/**
 * Firestore helpers — CrewHive
 *
 * All reads and writes go through /api/db (Admin SDK, no rule restrictions).
 * Real-time subscriptions (onSnapshot) still use the client SDK.
 *
 * All document IDs are phone digits only (e.g. "919876543210").
 */

import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "./firebase";

// ─── Phone helper ─────────────────────────────────────────────────────────────
export const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

// ─── Internal: call /api/db with optional auth token ─────────────────────────
async function dbCall(body) {
  let idToken = null;
  try {
    if (auth.currentUser) idToken = await auth.currentUser.getIdToken();
  } catch (_) {}

  const res = await fetch("/api/db", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: "Bearer " + idToken } : {}),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "DB operation failed");
  return json;
}

// ══════════════════════════════════════════════ USERS ═════════════════════════

export const createUser = async (phone, userData) => {
  try {
    const id = phoneToDocId(phone);
    await dbCall({ op: "set", collection: "users", docId: id, data: { phone: "+" + id, ...userData } });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] createUser error:", error);
    return { success: false, error: error.message };
  }
};

export const getUser = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    const res = await dbCall({ op: "get", collection: "users", docId: id });
    if (!res.exists) return { success: false, error: "User not found" };
    return { success: true, data: res.data };
  } catch (error) {
    console.error("[Firestore] getUser error:", error);
    return { success: false, error: error.message };
  }
};

export const updateUser = async (phone, userData) => {
  try {
    await dbCall({ op: "update", collection: "users", docId: phoneToDocId(phone), data: userData });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] updateUser error:", error);
    return { success: false, error: error.message };
  }
};

// ══════════════════════════════════════════════ CREW ══════════════════════════

export const createCrewProfile = async (phone, crewData) => {
  try {
    const id = phoneToDocId(phone);
    const existing = await dbCall({ op: "get", collection: "crew", docId: id });
    const existingData = existing.exists ? existing.data : {};
    await dbCall({
      op: "set",
      collection: "crew",
      docId: id,
      data: {
        id,
        phone: "+" + id,
        ...crewData,
        status: existingData.status || "pending",
        available: existingData.available ?? false,
        createdAt: existingData.createdAt || new Date().toISOString(),
      },
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] createCrewProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const getCrewProfile = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    const res = await dbCall({ op: "get", collection: "crew", docId: id });
    if (!res.exists) return { success: false, error: "Crew profile not found" };
    return { success: true, data: res.data };
  } catch (error) {
    console.error("[Firestore] getCrewProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const updateCrewProfile = async (phone, crewData) => {
  try {
    await dbCall({ op: "update", collection: "crew", docId: phoneToDocId(phone), data: crewData });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] updateCrewProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const approveCrewMember = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    const ts = new Date().toISOString();
    await dbCall({
      op: "multiWrite",
      collection: "crew",
      writes: [
        { op: "update", collection: "crew", docId: id, data: { status: "approved", approvedAt: ts } },
        { op: "update", collection: "users", docId: id, data: { approved: true, approvedAt: ts } },
      ],
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] approveCrewMember error:", error);
    return { success: false, error: error.message };
  }
};

export const rejectCrewMember = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    await dbCall({ op: "update", collection: "crew", docId: id, data: { status: "rejected", rejectedAt: new Date().toISOString() } });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] rejectCrewMember error:", error);
    return { success: false, error: error.message };
  }
};

export const getPendingCrew = async () => {
  try {
    const res = await dbCall({ op: "query", collection: "crew", filters: [{ field: "status", op: "==", value: "pending" }] });
    return { success: true, data: res.data };
  } catch (error) {
    console.error("[Firestore] getPendingCrew error:", error);
    return { success: false, error: error.message };
  }
};

export const getApprovedCrew = async (filters = {}) => {
  try {
    const res = await dbCall({ op: "query", collection: "crew", filters: [{ field: "status", op: "==", value: "approved" }] });
    let crews = res.data;
    if (filters.role) crews = crews.filter((c) => c.role === filters.role);
    if (filters.city) crews = crews.filter((c) => c.city?.toLowerCase().includes(filters.city.toLowerCase()));
    if (filters.available) crews = crews.filter((c) => c.available === true);
    return { success: true, data: crews };
  } catch (error) {
    console.error("[Firestore] getApprovedCrew error:", error);
    return { success: false, error: error.message };
  }
};

// ══════════════════════════════════════════════ EMPLOYER / ORGANIZER ══════════

export const createEmployerProfile = async (phone, employerData) => {
  try {
    const id = phoneToDocId(phone);
    await dbCall({ op: "set", collection: "employers", docId: id, data: { id, phone: "+" + id, ...employerData, status: "pending" } });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] createEmployerProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const getEmployerProfile = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    let res = await dbCall({ op: "get", collection: "organizers", docId: id });
    if (!res.exists) res = await dbCall({ op: "get", collection: "employers", docId: id });
    if (!res.exists) res = await dbCall({ op: "get", collection: "users", docId: id });
    if (!res.exists) return { success: false, error: "Organizer profile not found" };
    return { success: true, data: res.data };
  } catch (error) {
    console.error("[Firestore] getEmployerProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const updateEmployerProfile = async (phone, data) => {
  try {
    const id = phoneToDocId(phone);
    const existing = await dbCall({ op: "get", collection: "organizers", docId: id });
    const col = existing.exists ? "organizers" : "employers";
    await dbCall({ op: "update", collection: col, docId: id, data });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] updateEmployerProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const createOrganizerProfile = createEmployerProfile;
export const getOrganizerProfile = getEmployerProfile;

// ══════════════════════════════════════════════ BOOKINGS ══════════════════════

export const createBooking = async (bookingData) => {
  try {
    const res = await dbCall({ op: "add", collection: "bookings", data: { ...bookingData, status: "pending" } });
    return { success: true, bookingId: res.id };
  } catch (error) {
    console.error("[Firestore] createBooking error:", error);
    return { success: false, error: error.message };
  }
};

export const getBooking = async (bookingId) => {
  try {
    const res = await dbCall({ op: "get", collection: "bookings", docId: bookingId });
    if (!res.exists) return { success: false, error: "Booking not found" };
    return { success: true, data: res.data };
  } catch (error) {
    console.error("[Firestore] getBooking error:", error);
    return { success: false, error: error.message };
  }
};

export const updateBooking = async (bookingId, bookingData) => {
  try {
    await dbCall({ op: "update", collection: "bookings", docId: bookingId, data: bookingData });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] updateBooking error:", error);
    return { success: false, error: error.message };
  }
};

export const getCrewBookings = async (phone) => {
  try {
    const res = await dbCall({ op: "query", collection: "bookings", filters: [{ field: "crewId", op: "==", value: phoneToDocId(phone) }] });
    return { success: true, data: res.data };
  } catch (error) {
    console.error("[Firestore] getCrewBookings error:", error);
    return { success: false, error: error.message };
  }
};

export const getEmployerBookings = async (phone) => {
  try {
    const res = await dbCall({ op: "query", collection: "bookings", filters: [{ field: "employerId", op: "==", value: phoneToDocId(phone) }] });
    return { success: true, data: res.data };
  } catch (error) {
    console.error("[Firestore] getEmployerBookings error:", error);
    return { success: false, error: error.message };
  }
};

export const getOrganizerBookings = getEmployerBookings;

// ══════════════════════════════════════════════ REAL-TIME (onSnapshot) ════════

export const subscribeToPendingCrew = (callback) => {
  return onSnapshot(
    query(collection(db, "crew"), where("status", "==", "pending")),
    (snap) => callback({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const subscribeToApprovedCrew = (filters = {}, callback) => {
  return onSnapshot(
    query(collection(db, "crew"), where("status", "==", "approved")),
    (snap) => {
      let crews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (filters.role) crews = crews.filter((c) => c.role === filters.role);
      if (filters.city) crews = crews.filter((c) => c.city?.toLowerCase().includes(filters.city.toLowerCase()));
      if (filters.available) crews = crews.filter((c) => c.available === true);
      callback({ success: true, data: crews });
    },
    (err) => callback({ success: false, error: err.message }),
  );
};

export const subscribeToCrewProfile = (phone, callback) => {
  return onSnapshot(
    doc(db, "crew", phoneToDocId(phone)),
    (snap) =>
      snap.exists()
        ? callback({ success: true, data: { id: snap.id, ...snap.data() } })
        : callback({ success: false, error: "Crew profile not found" }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const subscribeToCrewBookings = (phone, callback) => {
  return onSnapshot(
    query(collection(db, "bookings"), where("crewId", "==", phoneToDocId(phone))),
    (snap) => callback({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const subscribeToEmployerBookings = (phone, callback) => {
  return onSnapshot(
    query(collection(db, "bookings"), where("employerId", "==", phoneToDocId(phone))),
    (snap) => callback({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const subscribeToOrganizerBookings = subscribeToEmployerBookings;

// ══════════════════════════════════════════════ ADMIN ═════════════════════════

export const subscribeToAllUsers = (callback) => {
  return onSnapshot(
    collection(db, "users"),
    (snap) => callback({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const approveUserAccess = async (phone) => {
  try {
    await dbCall({ op: "update", collection: "users", docId: phoneToDocId(phone), data: { approved: true, approvedAt: new Date().toISOString() } });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] approveUserAccess error:", error);
    return { success: false, error: error.message };
  }
};

export const revokeUserAccess = async (phone) => {
  try {
    await dbCall({ op: "update", collection: "users", docId: phoneToDocId(phone), data: { approved: false, revokedAt: new Date().toISOString() } });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] revokeUserAccess error:", error);
    return { success: false, error: error.message };
  }
};

export const promoteToAdmin = async (phone) => {
  try {
    await dbCall({ op: "update", collection: "users", docId: phoneToDocId(phone), data: { role: "admin", promotedAt: new Date().toISOString() } });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] promoteToAdmin error:", error);
    return { success: false, error: error.message };
  }
};

export const getSuperAdminStats = async () => {
  try {
    const [usersRes, crewRes, employersRes, bookingsRes] = await Promise.all([
      dbCall({ op: "query", collection: "users", filters: [] }),
      dbCall({ op: "query", collection: "crew", filters: [] }),
      dbCall({ op: "query", collection: "employers", filters: [] }),
      dbCall({ op: "query", collection: "bookings", filters: [] }),
    ]);
    const users = usersRes.data;
    const crew = crewRes.data;
    return {
      success: true,
      data: {
        totalUsers: users.length,
        pendingApproval: users.filter((u) => u.approved === false).length,
        approvedUsers: users.filter((u) => u.approved === true).length,
        totalCrew: crew.length,
        approvedCrew: crew.filter((c) => c.status === "approved").length,
        pendingCrew: crew.filter((c) => c.status === "pending").length,
        employers: employersRes.data.length,
        totalBookings: bookingsRes.data.length,
        activeBookings: bookingsRes.data.filter((b) => b.status === "accepted").length,
      },
    };
  } catch (error) {
    console.error("[Firestore] getSuperAdminStats error:", error);
    return { success: false, error: error.message };
  }
};
