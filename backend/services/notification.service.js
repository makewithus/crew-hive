import { getDb } from "../config/firebase.js";
import { Errors } from "../middleware/error.middleware.js";
import { pushToUser } from "../integrations/push/expo-push.js";

const col = () => getDb().collection("notifications");

/** In-app record + best-effort push. In-app is the guaranteed channel; push/WhatsApp are additive. */
export async function notify(userId, { type, title, body, data = {} }) {
  const ref = await col().add({ userId, type, title, body, data, read: false, createdAt: new Date().toISOString() });
  pushToUser(userId, { title, body, data: { ...data, notificationId: ref.id } }).catch(() => {});
  return ref.id;
}
export async function list(user) {
  const s = await col().where("userId", "==", user.id).get();
  const items = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 100);
  return { items, unread: items.filter((i) => !i.read).length };
}
export async function markRead(user, id) {
  const ref = col().doc(id); const s = await ref.get();
  if (!s.exists || s.data().userId !== user.id) throw Errors.notFound("Notification not found"); // ownership enforced
  await ref.update({ read: true });
}
export async function registerDevice(user, { deviceToken, platform }) {
  const id = Buffer.from(deviceToken).toString("base64url").slice(0, 100);
  await getDb().collection("user_devices").doc(id).set({ userId: user.id, deviceToken, platform: platform || "android", updatedAt: new Date().toISOString() }, { merge: true });
}
export async function unregisterDevice(user, deviceToken) {
  const id = Buffer.from(deviceToken).toString("base64url").slice(0, 100);
  const ref = getDb().collection("user_devices").doc(id); const s = await ref.get();
  if (s.exists && s.data().userId === user.id) await ref.delete();
}
