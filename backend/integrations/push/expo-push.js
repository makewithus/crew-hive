/** Expo Push dispatch. Skipped in test mode; invalid tokens are removed (DeviceNotRegistered). */
import env from "../../config/env.js";
import { getDb } from "../../config/firebase.js";

export async function pushToUser(userId, { title, body, data = {} }) {
  const col = getDb().collection("user_devices");
  const devs = (await col.where("userId", "==", userId).get()).docs;
  if (!devs.length) return { sent: 0 };
  if (env.isTest || env.firebase.mode === "mock") return { sent: 0, reason: "test-mode" };
  const msgs = devs.map((d) => ({ to: d.data().deviceToken, sound: "default", title, body, data }));
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(msgs), signal: AbortSignal.timeout(8000) });
    const j = await res.json();
    (j.data || []).forEach((t, i) => { if (t.details?.error === "DeviceNotRegistered") devs[i].ref.delete().catch(() => {}); });
    return { sent: msgs.length };
  } catch (e) { return { sent: 0, error: e.message }; }
}
