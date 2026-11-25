/** ./admin/associations/import — thin proxy to the shared Express backend (no business logic, no Firestore access). */
import { proxy, readJson, digits, NextResponse, callExpress, legacyError } from "../../../../../lib/express-proxy.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const b = await readJson(request);
  return proxy(request, { method: "POST", path: "/admin/associations/import", body: { associationId: b.associationId, csvText: b.csvText, rows: b.rows, action: b.action === "execute" || b.action === "commit" ? "commit" : "preview", sendInvites: !!b.sendInvites },
    map: (d) => d.action === "preview"
      ? { success: true, action: "preview", summary: { totalRows: d.rows.length, validCount: d.summary.valid + d.summary.existing_user, invalidCount: d.summary.invalid, duplicateCsvCount: d.summary.duplicate_csv, duplicateDbCount: d.summary.already_member, ...d.summary }, rows: d.rows }
      : { success: true, action: "commit", importedCount: d.imported, invitesSent: d.invited, summary: d.summary } });
}
