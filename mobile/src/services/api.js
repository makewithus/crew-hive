/**
 * apps/mobile/src/services/api.js
 * The ONE HTTP client for the shared Express backend (/api/v1). Same contract the website uses.
 *  - base URL from EXPO_PUBLIC_API_BASE_URL (never hard-coded; Metro-host fallback only in __DEV__)
 *  - Firebase ID token + refresh token in expo-secure-store; one automatic refresh on 401 (single-flight)
 *  - unwraps the { success, data, message } envelope; throws ApiError with a user-safe message
 *  - persistent cache of GET responses (per user) so search/profile survive restarts and weak networks
 */
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";

const SESSION_KEY = "crewhive_session"; // { idToken, refreshToken, expiresAt, user }
const DEVICE_ID_KEY = "crewhive_device_id";
const CACHE_DIR = `${FileSystem.documentDirectory || ""}api-cache/`;

let cachedDeviceId = null;
export async function getDeviceId() {
  if (cachedDeviceId && process.env.APP_ENV !== "test") return cachedDeviceId;
  try {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id || process.env.APP_ENV === "test") {
      id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  } catch {
    cachedDeviceId = cachedDeviceId || `temp_${Date.now()}`;
    return cachedDeviceId;
  }
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR", details } = {}) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
  get isNetwork() { return this.status === 0; }
}

export function getBaseUrl() {
  const configured =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl;
  if (configured) return configured.replace(/\/$/, "");
  if (__DEV__) {
    const host = (Constants.expoConfig?.hostUri || "").split(":")[0];
    if (host) return `http://${host}:4000/api/v1`;
  }
  return "https://crew-hive.onrender.com/api/v1";
}

const http = axios.create({ timeout: 65000, headers: { "Content-Type": "application/json", "X-Client": "app" } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isTransientColdStart = (err) => {
  if (!err?.response) return true; // network error / timeout while Render wakes up
  const s = err.response.status;
  return s === 502 || s === 503 || s === 504;
};

/** Pre-warm the Render backend on app launch so subsequent requests are instant. */
export async function wakeBackend() {
  const rootUrl = getBaseUrl().replace(/\/api\/v1$/, "");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await axios.get(`${rootUrl}/health`, { timeout: 65000 });
      return true;
    } catch {
      if (attempt < 2) await sleep(2000);
    }
  }
  return false;
}

/* ---------- session ---------- */
let session = null; // in-memory copy
const listeners = new Set();
export const onSessionExpired = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export async function loadSession() {
  if (session) return session;
  try { const raw = await SecureStore.getItemAsync(SESSION_KEY); session = raw ? JSON.parse(raw) : null; } catch { session = null; }
  return session;
}
export async function saveSession(s) { session = s; await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s)); }
export async function clearSession() {
  session = null;
  try { await SecureStore.deleteItemAsync(SESSION_KEY); } catch {}
  try { await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true }); } catch {}
}

function toApiError(err) {
  if (err instanceof ApiError) return err;
  const b = err.response?.data;
  if (b?.error) return new ApiError(b.error.message, { status: err.response.status, code: b.error.code, details: b.error.details });
  if (err.response) return new ApiError("Something went wrong. Please try again.", { status: err.response.status, code: "HTTP_" + err.response.status });
  return new ApiError(err.code === "ECONNABORTED" ? "The request timed out. Check your connection." : "Cannot reach CrewHive. Check your connection.", { status: 0, code: "NETWORK_ERROR" });
}

let refreshing = null;
async function refreshSession() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const s = await loadSession();
    if (!s?.refreshToken) throw new ApiError("Session expired", { status: 401, code: "UNAUTHORIZED" });
    try {
      const res = await axios.post(`${getBaseUrl()}/auth/refresh`, { refreshToken: s.refreshToken }, { timeout: 65000 });
      const d = res.data.data;
      await saveSession({ ...s, idToken: d.idToken, refreshToken: d.refreshToken || s.refreshToken, expiresAt: Date.now() + (Number(d.expiresIn) || 3600) * 1000 });
      return session;
    } catch (e) {
      if (e.response?.status === 401) { await clearSession(); listeners.forEach((fn) => fn()); throw new ApiError("Session expired. Please sign in again.", { status: 401, code: "UNAUTHORIZED" }); }
      throw toApiError(e);
    }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

/* ---------- cache (GET only, per user) ---------- */
const cacheFile = (path) => `${CACHE_DIR}${(session?.user?.id || "anon")}_${encodeURIComponent(path).slice(0, 150)}.json`;
async function cacheWrite(path, data) { try { await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }); await FileSystem.writeAsStringAsync(cacheFile(path), JSON.stringify({ data, cachedAt: Date.now() })); } catch {} }
export async function cacheRead(path) { try { return JSON.parse(await FileSystem.readAsStringAsync(cacheFile(path))); } catch { return null; } }

/* ---------- request ---------- */
async function request(method, path, { body, params, auth = true, cache = false, headers: customHeaders, _retried = false, _coldRetries = 0 } = {}) {
  const headers = { ...(customHeaders || {}) };
  const deviceId = await getDeviceId().catch(() => null);
  if (deviceId) headers["X-Device-Id"] = deviceId;
  if (auth) {
    let s = await loadSession();
    if (s && s.expiresAt && s.expiresAt - Date.now() < 60_000) s = await refreshSession().catch(() => s);
    if (s?.idToken) headers.Authorization = `Bearer ${s.idToken}`;
  }
  try {
    const res = await http.request({ baseURL: getBaseUrl(), url: path, method, data: body, params, headers });
    const data = res.data?.data ?? {};
    if (cache && method === "GET") cacheWrite(path + (params ? `?${new URLSearchParams(params)}` : ""), data);
    return data;
  } catch (err) {
    if (err.response?.status === 401 && auth && !_retried) {
      await refreshSession(); // throws + notifies listeners if the session is truly dead
      return request(method, path, { body, params, auth, cache, headers: customHeaders, _retried: true, _coldRetries });
    }
    if (isTransientColdStart(err) && _coldRetries < 2) {
      await sleep(2500);
      return request(method, path, { body, params, auth, cache, headers: customHeaders, _retried, _coldRetries: _coldRetries + 1 });
    }
    const apiErr = toApiError(err);
    if (apiErr.isNetwork && cache && method === "GET") {
      const hit = await cacheRead(path + (params ? `?${new URLSearchParams(params)}` : ""));
      if (hit) { if (hit.data && typeof hit.data === "object") Object.defineProperty(hit.data, "__stale", { value: { cachedAt: hit.cachedAt }, enumerable: false }); return hit.data; }
    }
    throw apiErr;
  }
}

export const api = {
  get: (path, opts) => request("GET", path, opts),
  post: (path, body, opts) => request("POST", path, { ...opts, body }),
  put: (path, body, opts) => request("PUT", path, { ...opts, body }),
  patch: (path, body, opts) => request("PATCH", path, { ...opts, body }),
  delete: (path, opts) => request("DELETE", path, opts),
};
export default api;
