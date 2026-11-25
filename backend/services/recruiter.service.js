import { CURRENT_CONSENT_VERSION } from "@crew-hive/shared";
import { getDb } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { audit } from "../lib/audit.js";
import { publicCrew } from "../lib/crew-dto.js";
import { checkAccess } from "./feature.service.js";

const now = () => new Date().toISOString();
const orgRef = (id) => getDb().collection("organizers").doc(id);

export async function onboard(user, p) {
  if (user.role && !["organizer"].includes(user.role)) throw Errors.conflict("This number is already registered with a different account type.");
  const c = p.consent;
  if (!c || c.termsAccepted !== true || c.privacyAccepted !== true || c.acceptableBehaviorAccepted !== true) throw Errors.badRequest("Consent to Terms, Privacy Policy and Acceptable Behaviour is required.");
  const consent = { version: c.version || CURRENT_CONSENT_VERSION, termsAccepted: true, privacyAccepted: true, acceptableBehaviorAccepted: true, recordedAt: now() };
  const prev = (await orgRef(user.id).get()).data();
  const ts = now();
  const db = getDb();
  const batch = db.batch();
  batch.set(orgRef(user.id), { id: user.id, phone: user.phone, name: p.name, companyName: p.companyName || "", city: p.city, requirements: p.requirements || "", consent, signupSource: prev?.signupSource || "app", trialStartedAt: prev?.trialStartedAt || ts, updatedAt: ts, ...(prev?.createdAt ? {} : { createdAt: ts }) }, { merge: true });
  // Recruiters are free at launch → approved immediately (matches existing web behaviour).
  batch.set(db.collection("users").doc(user.id), { phone: user.phone, role: "organizer", approved: true, name: p.name, consent, updatedAt: ts, ...(prev?.createdAt ? {} : { createdAt: ts }) }, { merge: true });
  await batch.commit();
  await audit("recruiter_onboarded", user.id, user.id, { city: p.city });
  return (await orgRef(user.id).get()).data();
}

export async function getMe(user) {
  let s = await orgRef(user.id).get();
  if (!s.exists) s = await getDb().collection("employers").doc(user.id).get(); // legacy alias
  if (!s.exists) throw Errors.notFound("Recruiter profile not found");
  return { id: user.id, ...s.data() };
}

async function gate(user, feature) {
  const org = (await orgRef(user.id).get()).data() || {};
  const access = await checkAccess(feature, org);
  if (!access.allowed) throw Errors.forbidden(access.reason || "This feature is not available on your plan");
  return access;
}

export async function listShortlist(user) {
  const access = await gate(user, "shortlists");
  const snap = await orgRef(user.id).collection("shortlist").orderBy("savedAt", "desc").get();
  const items = [];
  for (const d of snap.docs) {
    const c = await getDb().collection("crew").doc(d.id).get();
    if (!c.exists || c.data().hidden || c.data().status !== "approved") continue; // hidden/removed profiles drop out
    items.push({ ...publicCrew({ id: d.id, ...c.data() }), savedAt: d.data().savedAt });
  }
  return { items, access };
}
export async function addShortlist(user, crewId) {
  await gate(user, "shortlists");
  const id = String(crewId).replace(/\D/g, "");
  const c = await getDb().collection("crew").doc(id).get();
  if (!c.exists || c.data().status !== "approved" || c.data().hidden) throw Errors.notFound("Crew profile not found");
  const ref = orgRef(user.id).collection("shortlist").doc(id);
  if ((await ref.get()).exists) return { alreadySaved: true };
  await ref.set({ crewId: id, savedAt: now() });
  return { saved: true };
}
export async function removeShortlist(user, crewId) { await orgRef(user.id).collection("shortlist").doc(String(crewId).replace(/\D/g, "")).delete(); }

export async function listShows(user, showId) {
  const access = await gate(user, "show_lists");
  const col = orgRef(user.id).collection("shows");
  if (showId) { const s = await col.doc(showId).get(); if (!s.exists) throw Errors.notFound("Show not found"); return { show: { id: s.id, ...s.data() }, access }; }
  const snap = await col.orderBy("createdAt", "desc").get();
  return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), access };
}
export async function saveShow(user, { id, title, location, date, roles = [], crewSlots = [] }) {
  await gate(user, "show_lists");
  if (!title) throw Errors.badRequest("title is required");
  const col = orgRef(user.id).collection("shows");
  const payload = { title: String(title).slice(0, 120), location: String(location || "").slice(0, 120), date: String(date || ""), roles: roles.slice(0, 20), crewSlots: crewSlots.slice(0, 100).map((s) => ({ crewId: String(s.crewId || "").replace(/\D/g, ""), role: String(s.role || ""), status: String(s.status || "planned") })), updatedAt: now() };
  if (id) { if (!(await col.doc(id).get()).exists) throw Errors.notFound("Show not found"); await col.doc(id).set(payload, { merge: true }); return { id }; }
  const ref = await col.add({ ...payload, createdAt: now() });
  return { id: ref.id };
}
export async function deleteShow(user, id) { await orgRef(user.id).collection("shows").doc(id).delete(); }
