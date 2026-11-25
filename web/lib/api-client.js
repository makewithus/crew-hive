/**
 * lib/api-client.js — the website's single HTTP client.
 *  - apiFetch(): drop-in for fetch() on same-origin /api/* calls; adds the Firebase ID token (identity comes from the token, never from a phone in the body).
 *  - api: canonical client for the shared Express backend (NEXT_PUBLIC_API_BASE_URL, /api/v1) used by new code.
 * Public base URL only; no secrets here.
 */
import { auth } from "./firebase";

async function idToken() {
  try {
    await auth.authStateReady?.();
    return (await auth.currentUser?.getIdToken()) || null;
  } catch { return null; }
}

export async function apiFetch(input, init = {}) {
  const token = await idToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  const ctrl = init.signal ? null : new AbortController();
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 20000) : null;
  try { return await fetch(input, { ...init, headers, signal: init.signal || ctrl.signal }); }
  finally { if (timer) clearTimeout(timer); }
}

export class ApiError extends Error {
  constructor(message, status, code, details) { super(message); this.status = status; this.code = code; this.details = details; }
}

const base = () =>
  (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.EXPRESS_API_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");

async function request(method, path, { body, query, signal } = {}) {
  const currentBase = base();
  if (!currentBase) throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not configured", 0, "CONFIG");
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""))}` : "";
  const token = await idToken();
  let res;
  try {
    res = await fetch(`${currentBase}/api/v1${path}${qs}`, { method, headers: { "Content-Type": "application/json", "X-Client": "web", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
  } catch (e) { throw new ApiError(e.name === "AbortError" ? "Request cancelled" : "Cannot reach CrewHive. Check your connection.", 0, "NETWORK_ERROR"); }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(json?.error?.message || "Request failed", res.status, json?.error?.code, json?.error?.details);
  return json?.data ?? {};
}
export const api = {
  get: (p, o) => request("GET", p, o), post: (p, body, o) => request("POST", p, { ...o, body }),
  put: (p, body, o) => request("PUT", p, { ...o, body }), patch: (p, body, o) => request("PATCH", p, { ...o, body }),
  delete: (p, o) => request("DELETE", p, o),
};
export default api;
