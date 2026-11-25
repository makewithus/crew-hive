/**
 * Account deletion (DPDP). Policy:
 *  - ERASED: users, crew/organizers/employers profiles (+shortlist/shows), devices, notifications, otp, blocks, associations membership,
 *    the person's availability_requests/bookings (as recruiter or crew), reports they filed; Firebase Auth user is deleted and sessions revoked.
 *  - PRESERVED: audit_logs (ids only, for dispute handling) and reports filed AGAINST the person (anonymised) for moderation history.
 */
import { getDb, getAuthAdmin } from "../config/firebase.js";
import { audit } from "../lib/audit.js";

async function delWhere(col, field, val) { const s = await getDb().collection(col).where(field, "==", val).get(); for (const d of s.docs) await d.ref.delete(); return s.size; }
async function delSub(parent, id, sub) { const s = await getDb().collection(parent).doc(id).collection(sub).get(); for (const d of s.docs) await d.ref.delete(); }

export async function deleteAccount(user) {
  const db = getDb(), id = user.id;
  const counts = {};
  for (const sub of ["shortlist", "shows"]) await delSub("organizers", id, sub);
  for (const c of ["users", "crew", "organizers", "employers", "association_members", "otpCodes"]) await db.collection(c).doc(id).delete();
  counts.notifications = await delWhere("notifications", "userId", id);
  counts.devices = await delWhere("user_devices", "userId", id);
  counts.bookingsAsCrew = await delWhere("bookings", "crewId", id);
  counts.bookingsAsRecruiter = await delWhere("bookings", "organizerId", id);
  counts.requests = await delWhere("availability_requests", "recruiterId", id);
  counts.blocksMade = await delWhere("blocks", "blockerId", id);
  counts.blocksReceived = await delWhere("blocks", "blockedId", id);
  counts.reportsFiled = await delWhere("reports", "reporterId", id);
  // anonymise reports against the deleted profile; keep the moderation record
  const against = await db.collection("reports").where("reportedProfileId", "==", id).get();
  for (const d of against.docs) await d.ref.update({ reportedName: "Deleted user", reporterPhone: null });
  // remove from other requests' pings
  const open = await db.collection("availability_requests").get();
  for (const d of open.docs) { const p = d.data().crewPings || []; if (p.some((x) => x.crewId === id)) await d.ref.update({ crewPings: p.filter((x) => x.crewId !== id) }); }
  try { await getAuthAdmin().revokeRefreshTokens(user.uid); await getAuthAdmin().deleteUser(user.uid); } catch (e) { if (e.code !== "auth/user-not-found") throw e; }
  await audit("account_deleted", id, id, { counts });
  return { deleted: true };
}
