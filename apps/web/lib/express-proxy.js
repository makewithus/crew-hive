/**
 * lib/express-proxy.js — SERVER-SIDE thin proxy used by the Next.js /api/* routes.
 *
 * The Express backend (/api/v1) is the only place CrewHive business logic and Firestore access live.
 * These Next routes exist solely to keep the website's existing request/response contract working while the pages
 * move to the canonical client (see lib/api-client.js). They contain NO business rules and NO Firebase Admin access:
 * they forward the caller's Firebase ID token and reshape { success, data } into the legacy payloads the pages expect.
 */
import { NextResponse } from "next/server";

const BASE = () =>
  (
    process.env.EXPRESS_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");

/** Calls Express. Returns { status, ok, body } where body is the parsed envelope (or null). Never throws. */
export async function callExpress(request, { method = "GET", path, body, query }) {
  const base = BASE();
  if (!base) return { status: 503, ok: false, body: { success: false, error: { code: "CONFIG", message: "Backend URL is not configured" } } };
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""))}` : "";
  const headers = { "Content-Type": "application/json", "X-Client": "web" };
  const auth = request.headers.get("authorization");
  if (auth) headers.Authorization = auth;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) headers["X-Forwarded-For"] = fwd;
  try {
    const res = await fetch(`${base}/api/v1${path}${qs}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000), cache: "no-store" });
    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body: json };
  } catch {
    return { status: 502, ok: false, body: { success: false, error: { code: "UPSTREAM", message: "Backend unavailable. Please try again." } } };
  }
}

/** Legacy error shape the pages read: { success:false, error:"message" }. */
export const legacyError = (r) => NextResponse.json({ success: false, error: r.body?.error?.message || "Request failed", code: r.body?.error?.code }, { status: r.status || 500 });

/**
 * proxy(request, spec) — forward and reshape.
 *   spec.map(data, status, envelope) → legacy JSON object (default: { success:true, data })
 */
export async function proxy(request, { method, path, body, query, map, status }) {
  const r = await callExpress(request, { method, path, body, query });
  if (!r.ok) return legacyError(r);
  const data = r.body?.data ?? {};
  return NextResponse.json(map ? map(data, r.status, r.body) : { success: true, data }, { status: status || r.status });
}

export const readJson = async (request) => { try { return await request.json(); } catch { return {}; } };
export const digits = (v) => String(v || "").replace(/\D/g, "");
export { NextResponse };
