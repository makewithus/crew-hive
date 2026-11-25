/**
 * lib/firestore.js — data helpers used by a few legacy pages.
 *
 * MIGRATED: these helpers no longer touch Firestore (neither the client SDK nor a generic Admin proxy). Every call goes
 * through the website's /api/* routes, which forward to the shared Express backend where authorization and business
 * rules live. Real-time "subscribe" helpers are implemented as short polling.
 * Export names are unchanged so existing pages keep working.
 */
import { apiFetch } from "./api-client";

export const phoneToDocId = (phone) => String(phone || "").replace(/\D/g, "");

async function call(path, init) {
  const res = await apiFetch(path, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}
const post = (path, body) => call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const wrap = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { return { success: false, error: e.message }; } };

function poll(fn, cb, ms = 15000) {
  let stop = false;
  const tick = async () => { try { const v = await fn(); if (!stop) cb(v); } catch { /* keep last value */ } };
  tick();
  const h = setInterval(tick, ms);
  return () => { stop = true; clearInterval(h); };
}

/* ── users / profiles ── */
// Roles are assigned server-side during onboarding; a client can no longer write its own role.
export const createUser = async () => ({ success: false, error: "Account type is set during signup. Please use the signup flow." });
export const getUser = wrap(async (phone) => ({ success: true, data: (await call(`/api/crew/profile?phone=${phoneToDocId(phone)}`)).data }));
export const updateUser = wrap(async (phone, data) => { await post("/api/crew/profile", { updates: { name: data?.name } }); return { success: true }; });
export const createCrewProfile = wrap(async (phone, d) => { await post("/api/crew/onboarding", { phone, name: d.name, role: d.role || d.crewRole, roles: d.roles, city: d.city, specialisations: d.specialisations, consent: d.consent }); return { success: true }; });
export const getCrewProfile = wrap(async (phone) => ({ success: true, data: (await call(`/api/crew/profile?phone=${phoneToDocId(phone)}`)).data }));
export const updateCrewProfile = wrap(async (phone, d) => { await post("/api/crew/profile", { phone, updates: d }); return { success: true }; });
export const createEmployerProfile = wrap(async (phone, d) => { await post("/api/auth/signup", { phone, role: "organizer", organizerData: d, consent: d.consent }); return { success: true }; });
export const createOrganizerProfile = createEmployerProfile;
export const getEmployerProfile = wrap(async () => ({ success: true, data: (await call("/api/organizer/profile")).data }));
export const getOrganizerProfile = getEmployerProfile;
export const updateEmployerProfile = async () => ({ success: false, error: "Not supported" });

/* ── moderation ── */
const decide = (action) => wrap(async (phone) => { await post("/api/admin/approve", { id: phoneToDocId(phone), role: "crew", action }); return { success: true }; });
export const approveCrewMember = decide("approve");
export const rejectCrewMember = decide("reject");
export const approveUserAccess = approveCrewMember;
export const revokeUserAccess = rejectCrewMember;
export const promoteToAdmin = wrap(async (phone) => { await post("/api/admin/users", { id: phoneToDocId(phone), role: "admin" }); return { success: true }; });
export const getPendingCrew = wrap(async () => ({ success: true, data: (await call("/api/admin/profiles?filter=pending")).data }));
export const getApprovedCrew = wrap(async (f = {}) => ({ success: true, data: (await call(`/api/crew/search?${new URLSearchParams({ ...(f.role ? { role: f.role } : {}), ...(f.city ? { city: f.city } : {}), ...(f.available ? { available: "true" } : {}) })}`)).data }));
export const getSuperAdminStats = wrap(async () => ({ success: true, data: (await call("/api/admin/stats")).data }));

/* ── bookings (direct requests) ── */
export const createBooking = wrap(async (b) => {
  const r = await post("/api/requests/create", { role: b.role || b.crewRole || "crew", date: b.date, location: b.location || b.city || "Kerala", workType: b.workType || "Direct booking", notes: b.notes, targetCrewIds: b.crewId ? [b.crewId] : undefined });
  return { success: true, id: r.requestId };
});
export const getBooking = wrap(async (id) => ({ success: true, data: (await call(`/api/requests/${id}`)).data }));
export const updateBooking = wrap(async (id, d) => { const r = await call(`/api/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }); return { success: true, ...r }; });
export const getCrewBookings = wrap(async () => ({ success: true, data: (await call("/api/crew/requests")).data }));
export const getEmployerBookings = wrap(async () => ({ success: true, data: (await call("/api/requests/list")).data }));
export const getOrganizerBookings = getEmployerBookings;

/* ── "subscriptions" (polling) ── */
export const subscribeToPendingCrew = (cb) => poll(async () => {
  try {
    const res = await call("/api/admin/profiles?filter=pending");
    return { success: true, data: res.data || [] };
  } catch (err) {
    return { success: false, error: err.message || "Failed to load pending crew" };
  }
}, cb);
export const subscribeToApprovedCrew = (filters, cb) => poll(async () => (await getApprovedCrew(filters)).data || [], typeof filters === "function" ? filters : cb);
export const subscribeToCrewProfile = (phone, cb) => poll(async () => (await call(`/api/crew/profile?phone=${phoneToDocId(phone)}`)).data, cb);
export const subscribeToCrewBookings = (phone, cb) => poll(async () => (await call("/api/crew/requests")).data, cb);
export const subscribeToEmployerBookings = (phone, cb) => poll(async () => (await call("/api/requests/list")).data, cb);
export const subscribeToOrganizerBookings = subscribeToEmployerBookings;
export const subscribeToAllUsers = (cb) => poll(async () => {
  try {
    const res = await call("/api/admin/users");
    return { success: true, data: res.data || [] };
  } catch (err) {
    return { success: false, error: err.message || "Failed to load users" };
  }
}, cb);
