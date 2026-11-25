import { getDb } from "../config/firebase.js";
/** Append-only audit trail (collection audit_logs, legacy field names kept: action/targetId/performedBy/timestamp). */
export async function audit(action, actor, targetId, extra = {}) {
  try { await getDb().collection("audit_logs").add({ action, targetId: targetId || null, performedBy: actor || "system", timestamp: new Date().toISOString(), ...extra }); }
  catch (e) { console.error("[audit] failed:", e.message); }
}
