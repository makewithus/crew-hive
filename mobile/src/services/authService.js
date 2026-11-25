/**
 * apps/mobile/src/services/authService.js
 * OTP login → Firebase ID/refresh token session (same identity as the website). No dev tokens, no client-chosen roles.
 */
import { api, saveSession, loadSession, clearSession, ApiError, getDeviceId } from "./api.js";

let notificationHandler = null;
export function setNotificationHandler(handler) {
  notificationHandler = handler;
}

const toAppUser = (u) => (u ? { ...u, role: u.role === "organizer" ? "recruiter" : u.role } : u);

class MobileAuthService {
  cachedUser = null;

  async sendOtp(phone, explicitDeviceId) {
    const devId = explicitDeviceId || (await getDeviceId().catch(() => null));
    return api.post("/auth/otp/send", { phone }, { auth: false, headers: devId ? { "X-Device-Id": devId } : {} });
  }

  async verifyOtp(phone, otp) {
    const d = await api.post("/auth/otp/verify", { phone, otp }, { auth: false });
    const user = toAppUser(d.user);
    await saveSession({ idToken: d.idToken, refreshToken: d.refreshToken, expiresAt: Date.now() + (Number(d.expiresIn) || 3600) * 1000, user });
    this.cachedUser = user;
    notificationHandler?.register?.().catch(() => {});
    return { user, isNewUser: d.isNewUser };
  }

  /** Called at app start. Returns the user, or null when there is no valid session. Offline → last known user. */
  async restoreSession() {
    const s = await loadSession();
    if (!s?.refreshToken) return null;
    try {
      const me = toAppUser(await api.get("/auth/me"));
      this.cachedUser = me;
      await saveSession({ ...(await loadSession()), user: me });
      notificationHandler?.register?.().catch(() => {});
      return me.role ? me : null; // authenticated but not onboarded yet → back to welcome flow
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork) { this.cachedUser = s.user || null; return this.cachedUser?.role ? this.cachedUser : null; }
      this.cachedUser = null;
      return null;
    }
  }

  getCachedUser() { return this.cachedUser; }

  async signOut() {
    await notificationHandler?.unregister?.().catch(() => {});
    try { await api.post("/auth/logout", {}); } catch { /* offline: still clear locally */ }
    await clearSession();
    this.cachedUser = null;
  }
  logout() { return this.signOut(); }

  async deleteAccount() {
    await notificationHandler?.unregister?.().catch(() => {});
    await api.delete("/account");
    await clearSession();
    this.cachedUser = null;
  }
}
export const authService = new MobileAuthService();
export default authService;
