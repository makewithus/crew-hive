/**
 * backend/services/request.service.js — availability requests (recruiter side) and crew pings.
 * Collections: availability_requests (with embedded crewPings), bookings (one per pinged crew), notifications.
 */
import { getDb } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { audit } from "../lib/audit.js";
import { isCurrentlyAvailable } from "../lib/crew-dto.js";
import { notify } from "./notification.service.js";
import { whatsAppAdapter } from "../integrations/whatsapp/adapter.js";

const MAX_PINGS = 10, MAX_DAILY_PER_CREW = 3, DEFAULT_WINDOW_MIN = 120;
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const now = () => new Date().toISOString();

export async function createRequest(user, p) {
  const db = getDb();
  const rec = (await db.collection("organizers").doc(user.id).get()).data() || {};
  const ts = now();
  const recent = await db.collection("availability_requests").where("recruiterId", "==", user.id).get();
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  for (const d of recent.docs) {
    const r = d.data();
    if ((r.createdAt || "") >= cutoff && r.role === p.role && r.date === p.date && norm(r.location) === norm(p.location)) throw Errors.rateLimited("Duplicate request detected. A matching request was sent less than 2 minutes ago.");
  }
  const maxPings = rec.subscriptionTier === "paid" ? 50 : rec.subscriptionTier === "trial" ? 20 : MAX_PINGS;
  let pool = [];
  if (p.targetCrewIds?.length) {
    for (const id of [...new Set(p.targetCrewIds.map((x) => String(x).replace(/\D/g, "")))].slice(0, maxPings)) {
      const s = await db.collection("crew").doc(id).get();
      // Direct targets must still be approved, visible, and currently available.
      if (s.exists) pool.push({ id: s.id, ...s.data() });
    }
    pool = pool.filter((c) => c.status === "approved" && !c.hidden && isCurrentlyAvailable(c));
  } else {
    const snap = await db.collection("crew").where("status", "==", "approved").get();
    const roleN = norm(p.role), cityN = norm(p.location);
    pool = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => {
      if (c.hidden || !isCurrentlyAvailable(c)) return false;
      const rn = [c.role, ...(c.roles || []), ...(c.specialisations || [])].map(norm);
      if (!rn.some((x) => x && (x.includes(roleN) || roleN.includes(x)))) return false;
      return !cityN || norm(c.city).includes(cityN) || norm(c.district).includes(cityN) || c.travelWillingness === "kerala";
    });
  }
  // Exclude crew who blocked this recruiter.
  const blocks = (await db.collection("blocks").where("blockedId", "==", user.id).get()).docs.map((d) => d.data().blockerId);
  pool = pool.filter((c) => !blocks.includes(c.id));
  if (!pool.length) throw Errors.notFound("No available crew found matching the specified role and criteria.");

  // Daily per-crew cap, counted from the last 24h of requests.
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const counts = {};
  (await db.collection("availability_requests").where("createdAt", ">=", since).get()).docs.forEach((d) => (d.data().crewPings || []).forEach((x) => { counts[x.crewId] = (counts[x.crewId] || 0) + 1; }));
  const eligible = pool.filter((c) => (counts[c.id] || 0) < MAX_DAILY_PER_CREW).slice(0, maxPings);
  if (!eligible.length) throw Errors.rateLimited("Matching crew members have reached their daily request limit. Try again tomorrow or broaden criteria.");

  const windowMin = p.responseWindowMinutes || DEFAULT_WINDOW_MIN;
  const expiresAt = new Date(Date.now() + windowMin * 60_000).toISOString();
  const crewPings = eligible.map((c) => ({ crewId: c.id, name: c.name || "Technician", role: c.role || p.role, city: c.city || p.location, status: "pending", pingedAt: ts, respondedAt: null }));
  const payload = { recruiterId: user.id, recruiterPhone: user.phone, recruiterName: rec.companyName || rec.name || "Recruiter", role: p.role, specialisation: p.specialisation || "", date: p.date, location: p.location, workType: p.workType, notes: p.notes || "", status: "pending", responseWindowMinutes: windowMin, expiresAt, crewPings, totalPings: crewPings.length, acceptedCount: 0, declinedCount: 0, noResponseCount: 0, createdAt: ts, updatedAt: ts };
  const ref = await db.collection("availability_requests").add(payload);

  const deliveries = [];
  for (const c of eligible) {
    const b = await db.collection("bookings").add({ requestId: ref.id, crewId: c.id, organizerId: user.id, recruiterName: payload.recruiterName, crewName: c.name || "", date: p.date, location: p.location, workType: p.workType, notes: p.notes || "", status: "pending", responseDeadline: expiresAt, createdAt: ts, updatedAt: ts });
    await notify(c.id, { type: "request", title: "New availability request", body: `Available for ${p.workType} at ${p.location} on ${p.date}? Reply Yes / No.`, data: { requestId: ref.id, bookingId: b.id } });
    // WhatsApp ping (approved template). Non-blocking; failure is recorded, in-app notification already exists as the fallback.
    const wa = await whatsAppAdapter.sendTemplate(c.phone || `+${c.id}`, "availability_request", [payload.recruiterName, p.workType, p.location, p.date]);
    deliveries.push({ crewId: c.id, whatsapp: wa.success ? "accepted" : wa.reason || "failed" });
  }
  await audit("request_created", user.id, ref.id, { role: p.role, pings: eligible.length });
  return { id: ref.id, ...payload, pingsSent: eligible.length, deliveries };
}

/** Request visible to its owner (and admins). Crew phone numbers are disclosed only for accepted pings. */
function view(id, r, { owner }) {
  const pings = (r.crewPings || []).map((p) => {
    const { phone, ...rest } = p;
    return p.status === "accepted" && owner ? { ...rest, phone: phone || `+${p.crewId}` } : rest;
  });
  const c = (s) => pings.filter((p) => p.status === s).length;
  const pending = c("pending");
  const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
  return { id, ...r, crewPings: pings, acceptedCount: c("accepted"), declinedCount: c("declined"), noResponseCount: c("no_response") + (expired ? pending : 0), pendingCount: expired ? 0 : pending, suggestWiden: !!expired && c("accepted") === 0 };
}

export async function listForRecruiter(user) {
  const db = getDb();
  const snap = await db.collection("availability_requests").where("recruiterId", "==", user.id).get();
  const t = new Date();
  const items = [];
  for (const d of snap.docs) {
    const r = d.data();
    if (r.expiresAt && new Date(r.expiresAt) < t && (r.crewPings || []).some((p) => p.status === "pending")) {
      // Persist the "no response" transition so it is consistent for every client.
      const pings = r.crewPings.map((p) => (p.status === "pending" ? { ...p, status: "no_response" } : p));
      const accepted = pings.filter((p) => p.status === "accepted").length;
      r.crewPings = pings; r.noResponseCount = pings.filter((p) => p.status === "no_response").length;
      r.status = accepted ? "accepted" : pings.some((p) => p.status === "declined") ? "declined" : "no_response";
      await d.ref.update({ crewPings: pings, noResponseCount: r.noResponseCount, status: r.status, updatedAt: now() });
    }
    items.push(view(d.id, r, { owner: true }));
  }
  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const sum = (k) => items.reduce((n, i) => n + (i[k] || 0), 0);
  return { items, aggregate: { totalRequests: items.length, pendingResponses: sum("pendingCount"), acceptedResponses: sum("acceptedCount"), declinedResponses: sum("declinedCount"), noResponses: sum("noResponseCount") } };
}

async function owned(user, id) {
  const s = await getDb().collection("availability_requests").doc(id).get();
  if (!s.exists) throw Errors.notFound("Availability request not found");
  const r = s.data();
  if (r.recruiterId !== user.id && !user.isAdmin) throw Errors.notFound("Availability request not found"); // 404, not 403: do not reveal existence
  return { ref: s.ref, r };
}

export async function getRequest(user, id) { const { r } = await owned(user, id); return view(id, r, { owner: true }); }

export async function updateRequest(user, id, { action, confirmedCrewId }) {
  const { ref, r } = await owned(user, id);
  const ts = now();
  if (action === "cancel") {
    await ref.update({ status: "cancelled", updatedAt: ts });
    const b = await getDb().collection("bookings").where("requestId", "==", id).get();
    for (const d of b.docs) if (d.data().status === "pending") await d.ref.update({ status: "cancelled", updatedAt: ts });
    return { status: "cancelled" };
  }
  if (action === "confirm_match") {
    const cid = String(confirmedCrewId || "").replace(/\D/g, "");
    const ping = (r.crewPings || []).find((p) => p.crewId === cid);
    if (!ping || ping.status !== "accepted") throw Errors.unprocessable("Only a crew member who accepted can be confirmed");
    await ref.update({ status: "confirmed_match", confirmedCrewId: cid, crewPings: r.crewPings.map((p) => (p.crewId === cid ? { ...p, status: "confirmed_match" } : p)), updatedAt: ts });
    const b = await getDb().collection("bookings").where("requestId", "==", id).where("crewId", "==", cid).get();
    if (!b.empty) await b.docs[0].ref.update({ status: "confirmed", updatedAt: ts });
    await notify(cid, { type: "confirmed", title: "You are confirmed", body: `${r.recruiterName} confirmed you for ${r.role} on ${r.date}.`, data: { requestId: id } });
    return { status: "confirmed_match" };
  }
  throw Errors.badRequest("action must be cancel or confirm_match");
}
