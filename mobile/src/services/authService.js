/**
 * apps/mobile/src/services/authService.js
 * OTP login → Firebase ID/refresh token session (same identity as the website). No dev tokens, no client-chosen roles.
 */
import { api, saveSession, loadSession, clearSession, ApiError, getDeviceId } from "./api.js";

let rnfAuth = null;
try {
  // Dynamically require so Node/backend contract tests and Expo Go do not crash
  const mod = require("@react-native-firebase/auth");
  rnfAuth = mod?.default || mod;
} catch {
  rnfAuth = null;
}

let notificationHandler = null;
export function setNotificationHandler(handler) {
  notificationHandler = handler;
}

const toAppUser = (u) => (u ? { ...u, role: u.role === "organizer" ? "recruiter" : u.role } : u);

const FRIENDLY_FIREBASE_ERRORS = {
  "auth/invalid-phone-number": "Please enter a valid 10-digit Indian mobile number.",
  "auth/too-many-requests": "Too many OTP requests. Please wait a few minutes and try again.",
  "auth/invalid-verification-code": "Incorrect OTP. Please check the code and try again.",
  "auth/code-expired": "OTP has expired. Please request a new one.",
  "auth/session-expired": "Session expired. Please request a new OTP.",
  "auth/network-request-failed": "Network error. Please check your internet connection.",
};

class MobileAuthService {
  cachedUser = null;
  _firebaseConfirmation = null;

  async sendOtp(phone, explicitDeviceId) {
    if (rnfAuth) {
      try {
        this._firebaseConfirmation = await rnfAuth().signInWithPhoneNumber(phone);
        return { channel: "firebase", delivered: true, cooldownSeconds: 30 };
      } catch (err) {
        // If native module isn't linked (e.g. Expo Go), fall back to backend OTP endpoint
        const msg = String(err?.message || "");
        const isUnlinked = msg.includes("NativeModule") || msg.includes("RNFBAppModule") || msg.includes("not installed natively");
        if (!isUnlinked) {
          const friendly = FRIENDLY_FIREBASE_ERRORS[err?.code] || err?.message || "Failed to send OTP";
          throw new ApiError(friendly, { status: 400, code: err?.code || "FIREBASE_AUTH_ERROR" });
        }
      }
    }
    this._firebaseConfirmation = null;
    const devId = explicitDeviceId || (await getDeviceId().catch(() => null));
    return api.post("/auth/otp/send", { phone }, { auth: false, headers: devId ? { "X-Device-Id": devId } : {} });
  }

  async verifyOtp(phone, otp) {
    let d;
    if (this._firebaseConfirmation) {
      try {
        const cred = await this._firebaseConfirmation.confirm(String(otp).trim());
        const idToken = await cred.user.getIdToken();
        d = await api.post("/auth/firebase-login", { idToken }, { auth: false });
        this._firebaseConfirmation = null;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        const friendly = FRIENDLY_FIREBASE_ERRORS[err?.code] || err?.message || "Incorrect OTP. Please check and try again.";
        throw new ApiError(friendly, { status: 401, code: err?.code || "INVALID_OTP" });
      }
    } else {
      d = await api.post("/auth/otp/verify", { phone, otp }, { auth: false });
    }
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
    this._firebaseConfirmation = null;
    await notificationHandler?.unregister?.().catch(() => {});
    try { await rnfAuth?.().signOut(); } catch {}
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
