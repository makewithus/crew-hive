/**
 * backend/services/crew.service.js — crew onboarding, profile, availability, search, booking responses.
 * Data model = existing production schema (users/crew keyed by digits-only phone, crew.status, rateVisible, pastCredits…).
 */
import { CURRENT_CONSENT_VERSION } from "@crew-hive/shared";
import { getDb } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { audit } from "../lib/audit.js";
import { publicCrew, ownerCrew, isCurrentlyAvailable } from "../lib/crew-dto.js";
import { completeness } from "../lib/completeness.js";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const isUrl = (s) => { try { const u = new URL(String(s).trim()); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } };
const now = () => new Date().toISOString();
const crewCol = () => getDb().collection("crew");

export async function getCrewDoc(id) {
  const s = await crewCol().doc(id).get();
  return s.exists ? { id: s.id, ...s.data() } : null;
}

function consentRecord(c) {
  if (!c || c.termsAccepted !== true || c.privacyAccepted !== true || c.acceptableBehaviorAccepted !== true)
    throw Errors.badRequest("Consent to Terms, Privacy Policy and Acceptable Behaviour is required.");
  return { version: c.version || CURRENT_CONSENT_VERSION, termsAccepted: true, privacyAccepted: true, acceptableBehaviorAccepted: true, recordedAt: now() };
}

export async function onboard(user, p) {
  if (user.role && !["crew"].includes(user.role)) throw Errors.conflict("This number is already registered with a different account type.");
  const consent = consentRecord(p.consent);
  const db = getDb();
  const prev = await getCrewDoc(user.id);
  const roles = p.roles?.length ? p.roles : [p.role];
  const ts = now();
  const crew = {
    id: user.id, phone: user.phone, name: p.name, role: roles[0], roles,
    specialisations: p.specialisations || [], city: p.city, ...(p.district ? { district: p.district } : {}),
    consent, status: prev?.status || "pending", approved: prev?.approved === true, available: prev?.available ?? false,
    availableExpiresAt: prev?.availableExpiresAt || null, signupSource: prev?.signupSource || p.signupSource || "app",
    updatedAt: ts, ...(prev?.createdAt ? {} : { createdAt: ts }),
  };
  Object.assign(crew, completeness({ ...prev, ...crew }));
  const batch = db.batch();
  batch.set(db.collection("users").doc(user.id), { phone: user.phone, role: "crew", name: p.name, consent, approved: crew.approved, signupSource: crew.signupSource, updatedAt: ts, ...(prev?.createdAt ? {} : { createdAt: ts }) }, { merge: true });
  batch.set(crewCol().doc(user.id), crew, { merge: true });
  await batch.commit();
  await audit("crew_onboarded", user.id, user.id, { role: crew.role, city: crew.city });
  return { crew: ownerCrew({ ...prev, ...crew }), created: !prev };
}

export async function getMe(user) {
  const c = await getCrewDoc(user.id);
  if (!c) throw Errors.notFound("Crew profile not found");
  return { ...ownerCrew(c), ...completeness(c), available: isCurrentlyAvailable(c) };
}

export async function getPublic(id, viewer) {
  const c = await getCrewDoc(id);
  const mine = viewer && (viewer.id === id || viewer.isAdmin);
  if (!c || (!mine && (c.status !== "approved" || c.hidden === true))) throw Errors.notFound("Crew profile not found");
  return viewer?.id === id || viewer?.isAdmin ? { ...ownerCrew(c), ...completeness(c) } : publicCrew(c);
}

export async function updateMe(user, u) {
  const c = await getCrewDoc(user.id);
  if (!c) throw Errors.notFound("Crew profile not found");
  const patch = {};
  const str = (k, max = 200) => { if (u[k] !== undefined) patch[k] = String(u[k]).trim().slice(0, max); };
  ["name", "city", "district", "experience", "bio", "profileImage"].forEach((k) => str(k, k === "bio" ? 1000 : 200));
  if (patch.name !== undefined && patch.name.length < 2) throw Errors.badRequest("Name must be at least 2 characters");
  if (Array.isArray(u.roles) && u.roles.length) { patch.roles = u.roles.map(String).slice(0, 10); patch.role = patch.roles[0]; }
  if (u.role !== undefined && !patch.role) patch.role = String(u.role);
  if (Array.isArray(u.specialisations)) patch.specialisations = u.specialisations.map(String).slice(0, 40);
  if (Array.isArray(u.languages)) patch.languages = u.languages.map(String).slice(0, 12);
  if (u.ratePerDay !== undefined) {
    if (u.ratePerDay === null || u.ratePerDay === "") patch.ratePerDay = null;
    else { const n = Number(u.ratePerDay); if (!Number.isFinite(n) || n < 0) throw Errors.badRequest("Day rate must be a positive number"); patch.ratePerDay = n; }
  }
  if (u.rateVisible !== undefined) patch.rateVisible = Boolean(u.rateVisible);
  if (u.portfolioLinks !== undefined) {
    const l = u.portfolioLinks || {}; const v = {};
    for (const k of ["instagram", "youtube", "drive"]) if (l[k]) { if (!isUrl(l[k])) throw Errors.badRequest(`${k} link must be a valid http(s) URL`); v[k] = String(l[k]).trim(); }
    patch.portfolioLinks = v;
  }
  if (Array.isArray(u.pastCredits)) patch.pastCredits = u.pastCredits.filter((x) => x?.eventName?.toString().trim()).slice(0, 50).map((x) => ({ eventName: String(x.eventName).trim(), role: String(x.role || "").trim(), year: String(x.year || "").trim() }));
  if (Array.isArray(u.equipmentOwned)) patch.equipmentOwned = u.equipmentOwned.filter((x) => x && (x.name || x.category)).slice(0, 100).map((x) => ({ name: String(x.name || "").trim(), category: String(x.category || "other").trim(), model: String(x.model || "").trim() }));
  if (u.travelWillingness !== undefined) {
    if (!["local", "district", "kerala"].includes(u.travelWillingness)) throw Errors.badRequest("travelWillingness must be local, district or kerala");
    patch.travelWillingness = u.travelWillingness;
  }
  // associationMembership.verified can never be self-set; only the association join-code flow or an admin sets it.
  if (u.associationMembership?.name !== undefined) patch.associationMembership = { name: String(u.associationMembership.name).trim(), verified: c.associationMembership?.verified === true, verifiedAt: c.associationMembership?.verifiedAt || null };
  patch.updatedAt = now();
  Object.assign(patch, completeness({ ...c, ...patch }));
  await crewCol().doc(user.id).update(patch);
  if (patch.name) await getDb().collection("users").doc(user.id).set({ name: patch.name, updatedAt: patch.updatedAt }, { merge: true });
  return { ...ownerCrew({ ...c, ...patch }), available: isCurrentlyAvailable({ ...c, ...patch }) };
}

export async function getAvailability(user) {
  const c = await getCrewDoc(user.id);
  if (!c) throw Errors.notFound("Crew profile not found");
  let available = c.available === true, autoExpired = false;
  const exp = c.availableExpiresAt || c.availableUntil;
  if (available && exp && Date.now() >= new Date(exp).getTime()) {
    available = false; autoExpired = true;
    await crewCol().doc(user.id).update({ available: false, autoExpired: true, coarseLocation: null, updatedAt: now() });
  }
  return { available, autoExpired: autoExpired || c.autoExpired === true, availableAt: c.availableAt || null, availableExpiresAt: exp || null, coarseCity: c.coarseLocation?.city || c.city || null, locationConsent: c.locationConsent || null, needsReconfirmation: autoExpired };
}

export async function setAvailability(user, p) {
  const c = await getCrewDoc(user.id);
  if (!c) throw Errors.notFound("Crew profile not found");
  if (c.status === "rejected" || c.hidden) throw Errors.forbidden("Your profile is not active");
  const ts = now();
  if (p.available !== true) {
    await crewCol().doc(user.id).update({ available: false, autoExpired: false, availableExpiresAt: null, availableUntil: null, coarseLocation: null, updatedAt: ts });
    return { available: false, availableExpiresAt: null };
  }
  if (p.consentGranted === false) throw Errors.unprocessable("Location consent is required to switch availability on");
  const exp = new Date(Date.now() + SEVEN_DAYS).toISOString(); // server-controlled; client cannot choose the duration
  let loc = null, method = "manual_city";
  const cc = p.coarseCoords;
  if (cc && Number.isFinite(Number(cc.lat)) && Number.isFinite(Number(cc.lng))) {
    loc = { lat: Math.round(Number(cc.lat) * 100) / 100, lng: Math.round(Number(cc.lng) * 100) / 100, city: p.coarseCity || c.city, precision: "coarse_1km", updatedAt: ts }; method = "gps_coarse";
  } else loc = { city: p.coarseCity || c.city, precision: "manual_city", updatedAt: ts };
  await crewCol().doc(user.id).update({ available: true, autoExpired: false, availableAt: ts, availableExpiresAt: exp, availableUntil: exp, coarseLocation: loc, locationConsent: { granted: true, method, consentedAt: ts, version: CURRENT_CONSENT_VERSION }, updatedAt: ts });
  return { available: true, availableExpiresAt: exp, locationLabel: loc.city };
}

export async function withdrawLocationConsent(user) {
  const ts = now();
  await crewCol().doc(user.id).update({ locationConsent: { granted: false, withdrawnAt: ts }, coarseLocation: null, available: false, availableExpiresAt: null, availableUntil: null, updatedAt: ts });
  await audit("location_consent_withdrawn", user.id, user.id);
  return { consentWithdrawn: true, available: false };
}

export async function search(f, viewer) {
  const snap = await crewCol().where("status", "==", "approved").get();
  const roleN = norm(f.role), specN = norm(f.specialisation), cityN = norm(f.city), langN = norm(f.language), expN = norm(f.experience);
  // exclude profiles the viewer blocked
  const blocked = viewer ? new Set((await getDb().collection("blocks").where("blockerId", "==", viewer.id).get()).docs.map((d) => d.data().blockedId)) : new Set();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => !c.hidden && !blocked.has(c.id));
  const nowIso = now();
  rows = rows.filter((c) => {
    if (f.available && !isCurrentlyAvailable(c, nowIso)) return false;
    if (roleN && ![c.role, ...(c.roles || []), ...(c.specialisations || [])].some((x) => { const n = norm(x); return n && (n.includes(roleN) || roleN.includes(n)); })) return false;
    if (specN && !(c.specialisations || []).some((x) => norm(x).includes(specN))) return false;
    if (cityN && !(norm(c.city).includes(cityN) || norm(c.district).includes(cityN) || c.travelWillingness === "kerala")) return false;
    if (expN && !norm(c.experience).includes(expN)) return false;
    if (langN && !(c.languages || []).some((l) => norm(l).includes(langN))) return false;
    if (f.minRate != null || f.maxRate != null) {
      const pub = publicCrew(c).ratePerDay;
      if (pub == null || (f.minRate != null && pub < f.minRate) || (f.maxRate != null && pub > f.maxRate)) return false;
    }
    return true;
  });
  rows.sort((a, b) => (isCurrentlyAvailable(b) - isCurrentlyAvailable(a)) || (b.createdAt || "").localeCompare(a.createdAt || ""));
  const total = rows.length, start = (f.page - 1) * f.limit;
  return { items: rows.slice(start, start + f.limit).map(publicCrew), pagination: { total, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit), hasMore: start + f.limit < total } };
}

/** Contact disclosure flow: approved recruiters only, audited. */
export async function contactInfo(viewer, id) {
  const c = await getCrewDoc(id);
  if (!c || c.status !== "approved" || c.hidden) throw Errors.notFound("Crew profile not found");
  await audit("crew_contact_viewed", viewer.id, id);
  return { phone: c.phone || `+${id}`, whatsappUrl: `https://wa.me/${id}` };
}

/* ---------------- booking requests addressed to this crew member ---------------- */
export async function listMyRequests(user) {
  const snap = await getDb().collection("bookings").where("crewId", "==", user.id).get();
  const t = Date.now();
  let missed = 0;
  const items = snap.docs.map((d) => {
    const b = { id: d.id, ...d.data() };
    if (b.status === "pending" && b.responseDeadline && new Date(b.responseDeadline).getTime() < t) b.status = "expired";
    if (b.status === "declined" || b.status === "expired") missed++;
    const { recruiterPhone, ...safe } = b; // recruiter phone is not needed by crew UI
    return safe;
  }).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return { items, missedOrDeclinedCount: missed, shouldPromptAvailabilityReview: missed >= 3 };
}

export async function respond(user, bookingId, response, channel) {
  const db = getDb();
  const ref = db.collection("bookings").doc(bookingId);
  let notify = null;
  const result = await db.runTransaction(async (tx) => {
    // Firestore transactions require every read before any write.
    const snap = await tx.get(ref);
    if (!snap.exists) throw Errors.notFound("Request not found");
    const b = snap.data();
    if (b.crewId !== user.id) throw Errors.forbidden("This request does not belong to you");
    if (b.status !== "pending") throw Errors.conflict(`This request was already ${b.status}. Duplicate responses are not allowed.`);
    const rref = b.requestId ? db.collection("availability_requests").doc(b.requestId) : null;
    const rs = rref ? await tx.get(rref) : null;
    const cref = crewCol().doc(user.id);
    const cs = await tx.get(cref);
    const ts = now();
    if (b.responseDeadline && new Date(b.responseDeadline).getTime() < Date.now()) {
      tx.update(ref, { status: "expired", expiredAt: ts });
      return { expired: true };
    }
    tx.update(ref, { status: response, respondedAt: ts, responseChannel: channel, updatedAt: ts });
    if (rs?.exists) {
      const r = rs.data();
      const pings = (r.crewPings || []).map((p) => (p.crewId === user.id ? { ...p, status: response, respondedAt: ts, channel } : p));
      const count = (st) => pings.filter((p) => p.status === st).length;
      tx.update(rref, { crewPings: pings, acceptedCount: count("accepted"), declinedCount: count("declined"), status: count("accepted") ? "accepted" : r.status, updatedAt: ts });
      notify = { userId: r.recruiterId, requestId: b.requestId, role: r.role, date: r.date };
    }
    if (response === "accepted") tx.update(cref, { available: false, lastAcceptedBookingId: bookingId, updatedAt: ts });
    else tx.update(cref, { declinedCount: ((cs.exists && cs.data().declinedCount) || 0) + 1, lastDeclinedAt: ts, updatedAt: ts });
    return { status: response, respondedAt: ts, responseChannel: channel };
  });
  if (result.expired) throw Errors.gone("This request has expired and can no longer be answered.");
  if (notify?.userId) {
    await db.collection("notifications").add({ userId: notify.userId, type: "response", title: response === "accepted" ? "Crew member accepted" : "Crew member declined", body: `A technician responded ${response.toUpperCase()} for ${notify.role} on ${notify.date}.`, data: { requestId: notify.requestId }, read: false, createdAt: now() });
  }
  return result;
}
