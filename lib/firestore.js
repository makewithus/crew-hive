/**
 * Firestore helpers — CrewHive
 * All document IDs are phone digits (e.g. "919876543210").
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Phone helper ─────────────────────────────────────────────────────────────
export const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

// ══════════════════════════════════════════════ USERS ═════════════════════════

export const createUser = async (phone, userData) => {
  try {
    const id = phoneToDocId(phone);
    await setDoc(doc(db, "users", id), {
      phone: `+${id}`,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] createUser error:", error);
    return { success: false, error: error.message };
  }
};

export const getUser = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    const snap = await getDoc(doc(db, "users", id));
    if (snap.exists())
      return { success: true, data: { id: snap.id, ...snap.data() } };
    return { success: false, error: "User not found" };
  } catch (error) {
    console.error("[Firestore] getUser error:", error);
    return { success: false, error: error.message };
  }
};

export const updateUser = async (phone, userData) => {
  try {
    await updateDoc(doc(db, "users", phoneToDocId(phone)), {
      ...userData,
      updatedAt: new Date().toISOString(),
    });
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
    const ref = doc(db, "crew", id);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : {};
    await setDoc(ref, {
      id,
      phone: `+${id}`,
      ...crewData,
      // Preserve existing status/availability if profile already exists
      status: existingData.status || "pending",
      available: existingData.available ?? false,
      createdAt: existingData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] createCrewProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const getCrewProfile = async (phone) => {
  try {
    const snap = await getDoc(doc(db, "crew", phoneToDocId(phone)));
    if (snap.exists())
      return { success: true, data: { id: snap.id, ...snap.data() } };
    return { success: false, error: "Crew profile not found" };
  } catch (error) {
    console.error("[Firestore] getCrewProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const updateCrewProfile = async (phone, crewData) => {
  try {
    await updateDoc(doc(db, "crew", phoneToDocId(phone)), {
      ...crewData,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] updateCrewProfile error:", error);
    return { success: false, error: error.message };
  }
};

/** Approve a crew member, update both crew + users docs. */
export const approveCrewMember = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    const ts = new Date().toISOString();
    await Promise.all([
      updateDoc(doc(db, "crew", id), {
        status: "approved",
        approvedAt: ts,
        updatedAt: ts,
      }),
      updateDoc(doc(db, "users", id), {
        approved: true,
        approvedAt: ts,
        updatedAt: ts,
      }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("[Firestore] approveCrewMember error:", error);
    return { success: false, error: error.message };
  }
};

/** Reject a crew member. */
export const rejectCrewMember = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    const ts = new Date().toISOString();
    await updateDoc(doc(db, "crew", id), {
      status: "rejected",
      rejectedAt: ts,
      updatedAt: ts,
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] rejectCrewMember error:", error);
    return { success: false, error: error.message };
  }
};

export const getPendingCrew = async () => {
  try {
    const snap = await getDocs(
      query(collection(db, "crew"), where("status", "==", "pending")),
    );
    return {
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  } catch (error) {
    console.error("[Firestore] getPendingCrew error:", error);
    return { success: false, error: error.message };
  }
};

export const getApprovedCrew = async (filters = {}) => {
  try {
    const snap = await getDocs(
      query(collection(db, "crew"), where("status", "==", "approved")),
    );
    let crews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (filters.role) crews = crews.filter((c) => c.role === filters.role);
    if (filters.city)
      crews = crews.filter((c) =>
        c.city?.toLowerCase().includes(filters.city.toLowerCase()),
      );
    if (filters.available) crews = crews.filter((c) => c.available === true);
    return { success: true, data: crews };
  } catch (error) {
    console.error("[Firestore] getApprovedCrew error:", error);
    return { success: false, error: error.message };
  }
};

// ══════════════════════════════════════════════ EMPLOYER ══════════════════════

export const createEmployerProfile = async (phone, employerData) => {
  try {
    const id = phoneToDocId(phone);
    await setDoc(doc(db, "employers", id), {
      id,
      phone: `+${id}`,
      ...employerData,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] createEmployerProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const getEmployerProfile = async (phone) => {
  try {
    const id = phoneToDocId(phone);
    // Check organizers collection first (new), fallback to employers (legacy),
    // then fallback to users collection (WhatsApp-only onboarded users)
    let snap = await getDoc(doc(db, "organizers", id));
    if (!snap.exists()) snap = await getDoc(doc(db, "employers", id));
    if (!snap.exists()) snap = await getDoc(doc(db, "users", id));
    if (snap.exists())
      return { success: true, data: { id: snap.id, ...snap.data() } };
    return { success: false, error: "Organizer profile not found" };
  } catch (error) {
    console.error("[Firestore] getEmployerProfile error:", error);
    return { success: false, error: error.message };
  }
};

export const updateEmployerProfile = async (phone, data) => {
  try {
    await updateDoc(doc(db, "employers", phoneToDocId(phone)), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] updateEmployerProfile error:", error);
    return { success: false, error: error.message };
  }
};

// Backward-compat aliases
export const createOrganizerProfile = createEmployerProfile;
export const getOrganizerProfile = getEmployerProfile;

// ══════════════════════════════════════════════ BOOKINGS ══════════════════════

export const createBooking = async (bookingData) => {
  try {
    const ref = await addDoc(collection(db, "bookings"), {
      ...bookingData,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return { success: true, bookingId: ref.id };
  } catch (error) {
    console.error("[Firestore] createBooking error:", error);
    return { success: false, error: error.message };
  }
};

export const getBooking = async (bookingId) => {
  try {
    const snap = await getDoc(doc(db, "bookings", bookingId));
    if (snap.exists())
      return { success: true, data: { id: snap.id, ...snap.data() } };
    return { success: false, error: "Booking not found" };
  } catch (error) {
    console.error("[Firestore] getBooking error:", error);
    return { success: false, error: error.message };
  }
};

export const updateBooking = async (bookingId, bookingData) => {
  try {
    await updateDoc(doc(db, "bookings", bookingId), bookingData);
    return { success: true };
  } catch (error) {
    console.error("[Firestore] updateBooking error:", error);
    return { success: false, error: error.message };
  }
};

export const getCrewBookings = async (phone) => {
  try {
    const snap = await getDocs(
      query(
        collection(db, "bookings"),
        where("crewId", "==", phoneToDocId(phone)),
      ),
    );
    return {
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  } catch (error) {
    console.error("[Firestore] getCrewBookings error:", error);
    return { success: false, error: error.message };
  }
};

export const getEmployerBookings = async (phone) => {
  try {
    const snap = await getDocs(
      query(
        collection(db, "bookings"),
        where("employerId", "==", phoneToDocId(phone)),
      ),
    );
    return {
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  } catch (error) {
    console.error("[Firestore] getEmployerBookings error:", error);
    return { success: false, error: error.message };
  }
};

// Backward-compat alias
export const getOrganizerBookings = getEmployerBookings;

// ══════════════════════════════════════════════ REAL-TIME ═════════════════════

export const subscribeToPendingCrew = (callback) => {
  return onSnapshot(
    query(collection(db, "crew"), where("status", "==", "pending")),
    (snap) =>
      callback({
        success: true,
        data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const subscribeToApprovedCrew = (filters = {}, callback) => {
  return onSnapshot(
    query(collection(db, "crew"), where("status", "==", "approved")),
    (snap) => {
      let crews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (filters.role) crews = crews.filter((c) => c.role === filters.role);
      if (filters.city)
        crews = crews.filter((c) =>
          c.city?.toLowerCase().includes(filters.city.toLowerCase()),
        );
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
    query(
      collection(db, "bookings"),
      where("crewId", "==", phoneToDocId(phone)),
    ),
    (snap) =>
      callback({
        success: true,
        data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const subscribeToEmployerBookings = (phone, callback) => {
  return onSnapshot(
    query(
      collection(db, "bookings"),
      where("employerId", "==", phoneToDocId(phone)),
    ),
    (snap) =>
      callback({
        success: true,
        data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const subscribeToOrganizerBookings = subscribeToEmployerBookings;

// ══════════════════════════════════════════════ ADMIN ═════════════════════════

export const subscribeToAllUsers = (callback) => {
  return onSnapshot(
    collection(db, "users"),
    (snap) =>
      callback({
        success: true,
        data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      }),
    (err) => callback({ success: false, error: err.message }),
  );
};

export const approveUserAccess = async (phone) => {
  try {
    await updateDoc(doc(db, "users", phoneToDocId(phone)), {
      approved: true,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] approveUserAccess error:", error);
    return { success: false, error: error.message };
  }
};

export const revokeUserAccess = async (phone) => {
  try {
    await updateDoc(doc(db, "users", phoneToDocId(phone)), {
      approved: false,
      revokedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] revokeUserAccess error:", error);
    return { success: false, error: error.message };
  }
};

export const promoteToAdmin = async (phone) => {
  try {
    await updateDoc(doc(db, "users", phoneToDocId(phone)), {
      role: "admin",
      promotedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("[Firestore] promoteToAdmin error:", error);
    return { success: false, error: error.message };
  }
};

export const getSuperAdminStats = async () => {
  try {
    const [usersSnap, crewSnap, employersSnap, bookingsSnap] =
      await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "crew")),
        getDocs(collection(db, "employers")),
        getDocs(collection(db, "bookings")),
      ]);
    const users = usersSnap.docs.map((d) => d.data());
    const crew = crewSnap.docs.map((d) => d.data());
    return {
      success: true,
      data: {
        totalUsers: users.length,
        pendingApproval: users.filter((u) => u.approved === false).length,
        approvedUsers: users.filter((u) => u.approved === true).length,
        totalCrew: crew.length,
        approvedCrew: crew.filter((c) => c.status === "approved").length,
        pendingCrew: crew.filter((c) => c.status === "pending").length,
        employers: employersSnap.size,
        totalBookings: bookingsSnap.size,
      },
    };
  } catch (error) {
    console.error("[Firestore] getSuperAdminStats error:", error);
    return { success: false, error: error.message };
  }
};
