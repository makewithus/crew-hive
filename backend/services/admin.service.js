import { PARENT_ROLES, LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";
import { getDb } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { audit } from "../lib/audit.js";
import { isCurrentlyAvailable } from "../lib/crew-dto.js";
import { notify } from "./notification.service.js";
import { whatsAppAdapter } from "../integrations/whatsapp/adapter.js";

const now = () => new Date().toISOString();
const digits = (v) => String(v || "").replace(/\D/g, "");
const all = async (c) => (await getDb().collection(c).get()).docs.map((d) => ({ id: d.id, ...d.data() }));

/* ---- profiles ---- */
export async function listProfiles(filter = "all") {
  const rows = (await all("crew")).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (filter === "pending") return rows.filter((p) => p.status === "pending");
  if (filter === "approved") return rows.filter((p) => p.status === "approved" && !p.hidden);
  if (filter === "hidden") return rows.filter((p) => p.hidden === true);
  return rows;
}

export async function profileAction(admin, rawId, action, updates = {}) {
  const id = digits(rawId), db = getDb(), ts = now();
  const crew = db.collection("crew").doc(id), user = db.collection("users").doc(id);
  const s = await crew.get();
  if (!s.exists) throw Errors.notFound("Crew profile not found");
  let message;
  if (action === "approve") { await crew.update({ status: "approved", approved: true, updatedAt: ts }); await user.set({ approved: true, step: "crew_complete", updatedAt: ts }, { merge: true }); await notify(id, { type: "approval", title: "Profile approved", body: "Your CrewHive profile is live. Switch availability on to be found." }); message = "Profile approved."; }
  else if (action === "reject") { await crew.update({ status: "rejected", approved: false, available: false, updatedAt: ts }); await user.set({ approved: false, updatedAt: ts }, { merge: true }); message = "Profile rejected."; }
  else if (action === "toggle_hide") { const hidden = !s.data().hidden; await crew.update({ hidden, updatedAt: ts }); await audit(hidden ? "profile_hidden" : "profile_unhidden", admin.id, id); return { hidden, message: hidden ? "Profile hidden from search." : "Profile unhidden." }; }
  else if (action === "update_classification") {
    const patch = { updatedAt: ts };
    for (const k of ["role", "city", "experience"]) if (updates[k]) patch[k] = String(updates[k]);
    if (Array.isArray(updates.specialisations)) patch.specialisations = updates.specialisations.map(String);
    await crew.update(patch); await audit("classification_updated", admin.id, id, { changes: patch }); return { message: "Profile classifications updated.", data: patch };
  } else throw Errors.badRequest(`Unknown action: ${action}`);
  await audit(`profile_${action === "approve" ? "approved" : "rejected"}`, admin.id, id);
  return { message };
}

export async function listUsers() {
  const [users, crew, orgs] = await Promise.all([all("users"), all("crew"), all("organizers")]);
  const cm = Object.fromEntries(crew.map((c) => [c.id, c])), om = Object.fromEntries(orgs.map((o) => [o.id, o]));
  return users.filter((u) => u.role).map((u) => { const p = cm[u.id] || om[u.id] || {}; return { id: u.id, phone: u.phone, role: u.role, approved: u.approved, name: p.name || u.name || null, city: p.city || null, createdAt: u.createdAt || null }; })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** Only a super admin may change roles; the target can never be a super_admin (that comes from env only). */
export async function setUserRole(admin, rawId, role) {
  if (!["crew", "organizer", "admin"].includes(role)) throw Errors.badRequest("role must be crew, organizer or admin");
  const id = digits(rawId);
  await getDb().collection("users").doc(id).set({ role, updatedAt: now() }, { merge: true });
  await audit("role_changed", admin.id, id, { role });
  return { id, role };
}

/* ---- metrics ---- */
export async function metrics() {
  const [users, crew, orgs, requests, bookings] = await Promise.all(["users", "crew", "organizers", "availability_requests", "bookings"].map(all));
  const tally = (rows, f) => Object.entries(rows.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const pings = requests.flatMap((r) => r.crewPings || []);
  const n = (s) => pings.filter((p) => p.status === s).length;
  return {
    totals: { users: users.length, crew: crew.length, approvedCrew: crew.filter((c) => c.status === "approved").length, pendingCrew: crew.filter((c) => c.status === "pending").length, organizers: orgs.length, bookings: bookings.length },
    signupsByCity: tally([...crew, ...orgs], (r) => r.city?.trim() || "Unspecified").map(([city, count]) => ({ city, count })),
    signupsByRole: tally(crew, (c) => c.role || "Unassigned").map(([role, count]) => ({ role, count })),
    activeAvailability: crew.filter((c) => c.status === "approved" && !c.hidden && isCurrentlyAvailable(c)).length,
    requests: { sent: requests.length, accepted: n("accepted"), declined: n("declined"), noResponse: n("no_response"), pending: n("pending") },
  };
}

/* ---- taxonomy ---- */
export async function getRoles() { const s = await getDb().collection("settings").doc("roles").get(); return s.exists && Array.isArray(s.data().roles) ? s.data().roles : PARENT_ROLES; }
export async function saveRole(admin, role) {
  if (!role?.id || !role.nameEn) throw Errors.badRequest("role.id and role.nameEn are required");
  const roles = [...(await getRoles())]; const i = roles.findIndex((r) => r.id === role.id);
  if (i >= 0) roles[i] = { ...roles[i], ...role }; else roles.push(role);
  roles.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
  await getDb().collection("settings").doc("roles").set({ roles, updatedAt: now(), updatedBy: admin.id });
  await audit("taxonomy_role_saved", admin.id, role.id);
  return roles;
}
export async function getCities() { const s = await getDb().collection("settings").doc("cities").get(); return s.exists ? s.data() : { launchCities: LAUNCH_CITIES, districts: KERALA_DISTRICTS }; }
export async function saveCities(admin, body) {
  if (!Array.isArray(body.launchCities)) throw Errors.badRequest("launchCities array required");
  await getDb().collection("settings").doc("cities").set({ launchCities: body.launchCities, districts: body.districts || KERALA_DISTRICTS, updatedAt: now(), updatedBy: admin.id });
  await audit("taxonomy_cities_saved", admin.id, "cities");
  return getCities();
}

/* ---- associations ---- */
export async function listAssociations() {
  const out = [];
  for (const a of await all("associations")) {
    const m = (await getDb().collection("association_members").where("associationId", "==", a.id).get()).docs.map((d) => d.data());
    out.push({ ...a, totalImported: m.length, verifiedMembers: m.filter((x) => x.status === "verified").length });
  }
  return out;
}
export async function createAssociation(admin, { name, code, contactPerson, contactPhone, city, description = "" }) {
  const clean = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!name || !clean) throw Errors.badRequest("Association name and unique code are required.");
  if (!(await getDb().collection("associations").where("code", "==", clean).get()).empty) throw Errors.conflict(`Join code "${clean}" is already in use.`);
  const ref = await getDb().collection("associations").add({ name, code: clean, contactPerson: contactPerson || "", contactPhone: contactPhone || "", city: city || "", description, createdAt: now(), createdBy: admin.id });
  await audit("association_created", admin.id, ref.id);
  return { id: ref.id, code: clean };
}
export async function verifyJoinCode(user, code) {
  const clean = String(code || "").trim().toUpperCase();
  const s = await getDb().collection("associations").where("code", "==", clean).limit(1).get();
  if (s.empty) throw Errors.notFound("Invalid association join code.");
  const a = s.docs[0]; const ts = now();
  const crew = await getDb().collection("crew").doc(user.id).get();
  if (!crew.exists) throw Errors.unprocessable("Create your crew profile first");
  await getDb().collection("crew").doc(user.id).update({ associationMember: true, isAssociationVerified: true, associationId: a.id, associationName: a.data().name, associationMembership: { name: a.data().name, verified: true, verifiedAt: ts }, badgeGrantedAt: ts, updatedAt: ts });
  await getDb().collection("association_members").doc(user.id).set({ associationId: a.id, associationName: a.data().name, docId: user.id, status: "verified", verifiedAt: ts, updatedAt: ts }, { merge: true });
  return { associationName: a.data().name };
}

export function parseCsv(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw Errors.badRequest("CSV must contain a header row and at least one data row.");
  const h = lines[0].split(",").map((x) => x.trim().toLowerCase().replace(/['"]/g, ""));
  const ni = h.findIndex((x) => x.includes("name")), pi = h.findIndex((x) => /phone|mobile|whatsapp/.test(x));
  if (ni < 0 || pi < 0) throw Errors.badRequest(`CSV needs Name and Phone columns (found: ${h.join(", ")})`);
  const ri = h.findIndex((x) => /role|category|skill/.test(x)), ci = h.findIndex((x) => /city|district|location/.test(x));
  return lines.slice(1).map((l, i) => { const c = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((x) => x.trim().replace(/^["']|["']$/g, "")); return { rowNumber: i + 2, name: c[ni] || "", phone: c[pi] || "", role: ri >= 0 ? c[ri] || "Technician" : "Technician", city: ci >= 0 ? c[ci] || "Kerala" : "Kerala" }; });
}

export async function importMembers(admin, { associationId, csvText, rows, action = "preview", sendInvites = false }) {
  const db = getDb();
  const a = await db.collection("associations").doc(associationId).get();
  if (!a.exists) throw Errors.notFound("Association not found.");
  const raw = csvText ? parseCsv(csvText) : Array.isArray(rows) ? rows : null;
  if (!raw) throw Errors.badRequest("csvText or rows array required.");
  if (raw.length > 2000) throw Errors.badRequest("Maximum 2000 rows per import");
  const [users, members] = await Promise.all([all("users"), db.collection("association_members").where("associationId", "==", associationId).get()]);
  const userIds = new Set(users.map((u) => u.id)), memberIds = new Set(members.docs.map((d) => d.id)), seen = new Set();
  const preview = raw.map((r, i) => {
    const d = digits(r.phone); const id = d.length === 10 ? `91${d}` : d;
    let status = "valid", reason = null;
    if (!String(r.name || "").trim()) { status = "invalid"; reason = "Missing name"; }
    else if (!/^91[6-9]\d{9}$/.test(id)) { status = "invalid"; reason = "Invalid phone number"; }
    else if (seen.has(id)) { status = "duplicate_csv"; reason = "Duplicate phone number in this CSV"; }
    else if (memberIds.has(id)) { status = "already_member"; reason = "Already an association member"; }
    else if (userIds.has(id)) { status = "existing_user"; reason = "Existing CrewHive user (badge pending their confirmation)"; seen.add(id); }
    else seen.add(id);
    return { rowNumber: r.rowNumber || i + 2, name: r.name, phone: r.phone, id, role: r.role, city: r.city, status, reason };
  });
  const summary = Object.fromEntries(["valid", "existing_user", "invalid", "duplicate_csv", "already_member"].map((k) => [k, preview.filter((p) => p.status === k).length]));
  if (action !== "commit") return { action: "preview", summary, rows: preview };
  const importable = preview.filter((p) => p.status === "valid" || p.status === "existing_user");
  let invited = 0;
  for (const p of importable) {
    // "invited" → becomes "verified" only when the member confirms via the join-code flow. No badge is granted by import.
    await db.collection("association_members").doc(p.id).set({ associationId, associationName: a.data().name, docId: p.id, name: p.name, role: p.role, city: p.city, status: "invited", importedAt: now(), importedBy: admin.id }, { merge: true });
    if (sendInvites) { const r = await whatsAppAdapter.sendTemplate(`+${p.id}`, "association_invite", [p.name, a.data().name, a.data().code]); if (r.success) invited++; }
  }
  await audit("association_import", admin.id, associationId, { imported: importable.length, invited });
  return { action: "commit", imported: importable.length, invited, invitesAttempted: sendInvites, summary };
}
