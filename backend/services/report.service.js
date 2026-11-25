import { getDb } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { audit } from "../lib/audit.js";

const now = () => new Date().toISOString();

export async function submitReport(user, { reportedProfileId, reason, details }) {
  const target = String(reportedProfileId).replace(/\D/g, "");
  if (target === user.id) throw Errors.unprocessable("You cannot report yourself");
  const db = getDb();
  const dup = await db.collection("reports").where("reporterId", "==", user.id).where("reportedProfileId", "==", target).get();
  if (dup.docs.some((d) => d.data().status === "pending")) throw Errors.conflict("You already have an open report for this profile");
  const crew = (await db.collection("crew").doc(target).get()).data() || {};
  const ref = await db.collection("reports").add({ reportedProfileId: target, reportedName: crew.name || "Technician", reportedRole: crew.role || "Crew", reporterId: user.id, reporterPhone: user.phone, reason, details: details || "", status: "pending", moderationAction: null, moderationNotes: "", createdAt: now(), updatedAt: now() });
  return { reportId: ref.id };
}
export async function listReports(status) {
  const s = await getDb().collection("reports").orderBy("createdAt", "desc").get();
  const items = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  return status && status !== "all" ? items.filter((r) => r.status === status) : items;
}
export async function moderate(admin, reportId, { moderationAction, moderationNotes = "" }) {
  const db = getDb();
  const ref = db.collection("reports").doc(reportId); const s = await ref.get();
  if (!s.exists) throw Errors.notFound("Report not found");
  if (moderationAction === "hide_profile") await db.collection("crew").doc(s.data().reportedProfileId).update({ hidden: true, updatedAt: now() });
  const status = moderationAction === "dismiss" ? "dismissed" : "resolved";
  await ref.update({ status, moderationAction: moderationAction || "resolved", moderationNotes, resolvedAt: now(), resolvedBy: admin.id, updatedAt: now() });
  await audit("report_moderated", admin.id, reportId, { moderationAction, reportedProfileId: s.data().reportedProfileId });
  return { status };
}

/* Blocking: a block hides the blocked profile from the blocker's searches and stops pings in either direction. */
export async function block(user, targetId) {
  const id = String(targetId).replace(/\D/g, "");
  if (id === user.id) throw Errors.unprocessable("You cannot block yourself");
  await getDb().collection("blocks").doc(`${user.id}_${id}`).set({ blockerId: user.id, blockedId: id, createdAt: now() });
  return { blocked: true };
}
export async function unblock(user, targetId) { await getDb().collection("blocks").doc(`${user.id}_${String(targetId).replace(/\D/g, "")}`).delete(); }
export async function listBlocks(user) { return (await getDb().collection("blocks").where("blockerId", "==", user.id).get()).docs.map((d) => d.data().blockedId); }
