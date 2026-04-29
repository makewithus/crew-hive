"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendOtp, verifyOtp, fetchUserRole, isValidPhone } from "@/lib/auth";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
];

// Numbers trusted as super admins client-side (fallback when server env vars not set)
const clientSuperAdminNumbers = (process.env.NEXT_PUBLIC_ADMIN_PHONES || "")
  .split(",")
  .map((p) => p.trim().replace(/\D/g, ""))
  .filter(Boolean);

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback(
    (type, message) => setToast({ type, message }),
    [],
  );

  const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      showToast(
        "error",
        "Please enter a valid phone number (without country code).",
      );
      return;
    }

    if (!isValidPhone(fullPhone)) {
      showToast(
        "error",
        "Invalid phone number. Check country code and digits.",
      );
      return;
    }

    setLoading(true);

    // Check number exists + approval before firing OTP
    try {
      const checkRes = await fetch("/api/auth/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, checkOnly: true }),
      });
      const checkData = await checkRes.json();

      if (!checkData.exists && checkData.role !== "super_admin") {
        setLoading(false);
        showToast(
          "error",
          "Number not found. Please register via WhatsApp first.",
        );
        return;
      }
      // Only CREW needs admin approval — organizers and super_admin are always allowed
      if (checkData.role === "crew" && checkData.approved === false) {
        setLoading(false);
        showToast(
          "error",
          "Admin has not approved your profile yet. Please try again later.",
        );
        return;
      }
    } catch (_) {}

    const result = await sendOtp(fullPhone);
    setLoading(false);
    if (!result.success) {
      showToast("error", result.error);
      return;
    }
    setStep("otp");
    // Show hint on localhost (next dev or next start locally)
    const isLocal = typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const devHint = isLocal ? " (use 123456)" : "";
    showToast("info", `OTP sent to ${countryCode} ${digits}${devHint}`);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      showToast("error", "Please enter the 6-digit OTP.");
      return;
    }
    setLoading(true);

    const verifyResult = await verifyOtp(otp);
    if (!verifyResult.success) {
      setLoading(false);
      showToast("error", verifyResult.error);
      if (
        verifyResult.code === "auth/code-expired" ||
        verifyResult.code === "auth/session-expired"
      ) {
        setStep("phone");
        setOtp("");
      }
      return;
    }

    try {
      // In dev mode verifyOtp returns role/approved directly; prod fetches from server
      const userData =
        verifyResult.role != null
          ? { role: verifyResult.role, approved: verifyResult.approved }
          : await fetchUserRole(
              verifyResult.phone || verifyResult.user?.phoneNumber,
            );

      const role = userData.role === "employer" ? "organizer" : userData.role;
      // Fallback: if server didn't recognise the role but number is in NEXT_PUBLIC_ADMIN_PHONES, treat as super_admin
      const phoneDigits = (verifyResult.phone || verifyResult.user?.phoneNumber || "").replace(/\D/g, "");
      const isSuperAdminPhone = clientSuperAdminNumbers.includes(phoneDigits);

      if (role === "super_admin" || isSuperAdminPhone) {
        router.replace("/super-admin/dashboard");
      } else if (role === "crew") {
        if (!userData.approved) {
          setLoading(false);
          showToast(
            "error",
            "Admin has not approved your profile yet. Please try again later.",
          );
          return;
        }
        router.replace("/crew/dashboard");
      } else if (role === "organizer") {
        router.replace("/organizer/dashboard");
      } else {
        showToast(
          "error",
          "Profile not found. Please register via WhatsApp first.",
        );
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      showToast(
        "error",
        err.message || "Failed to load profile. Please try again.",
      );
    }
  };

  const handleBack = () => {
    setStep("phone");
    setOtp("");
    // Clean up reCAPTCHA so it can be re-rendered fresh on next OTP request
    if (typeof window !== "undefined") {
      try { window._recaptchaVerifier?.clear(); } catch (_) {}
      window._recaptchaVerifier = null;
      const el = document.getElementById("recaptcha-container");
      if (el) el.innerHTML = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      {/* Hidden reCAPTCHA anchor — Firebase Phone Auth requires this DOM node */}
      <div
        id="recaptcha-container"
        style={{
          position: "absolute",
          bottom: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-sm w-full px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-start gap-3 border ${
            toast.type === "error"
              ? "bg-red-950/95 border-red-800 text-red-200"
              : toast.type === "success"
                ? "bg-green-950/95 border-green-800 text-green-200"
                : "bg-zinc-900/95 border-zinc-700 text-zinc-200"
          }`}
        >
          <span className="mt-0.5 shrink-0">
            {toast.type === "error" ? (
              <AlertTriangle className="w-4 h-4" />
            ) : toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="opacity-50 hover:opacity-100 shrink-0 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#F5A623] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">CH</span>
            </div>
            <span className="text-white text-xl font-bold">CrewHive</span>
          </div>
          <p className="text-zinc-400 text-sm">
            Professional crew for every production
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-8">
          {step === "phone" && (
            <>
              <h1 className="text-white text-2xl font-semibold mb-1">
                Sign in
              </h1>
              <p className="text-zinc-400 text-sm mb-6">
                Enter your registered phone number
              </p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                    Country Code
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#F5A623]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.country}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))
                    }
                    placeholder="98765 43210"
                    className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5A623] placeholder-zinc-600"
                    autoFocus
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                  <p className="text-zinc-600 text-xs mt-1.5">
                    Without leading 0 or country code
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {loading ? <Spinner text="Checking…" /> : "Send OTP →"}
                </button>
              </form>
              <p className="text-zinc-500 text-xs text-center mt-6">
                No account?{" "}
                <a
                  href="https://wa.me/918139002826?text=Hi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F5A623] hover:underline"
                >
                  Register on WhatsApp
                </a>
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <button
                onClick={handleBack}
                className="text-zinc-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
              <h1 className="text-white text-2xl font-semibold mb-1">
                Enter OTP
              </h1>
              <p className="text-zinc-400 text-sm mb-6">
                Code sent to {countryCode} {phone}
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                    className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-4 py-3 text-lg text-center tracking-[0.4em] focus:outline-none focus:border-[#F5A623] placeholder-zinc-600"
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {loading ? (
                    <Spinner text="Verifying…" />
                  ) : (
                    "Verify & Sign In →"
                  )}
                </button>
              </form>
              <button
                onClick={async () => {
                  setOtp("");
                  setLoading(true);
                  const result = await sendOtp(fullPhone);
                  setLoading(false);
                  showToast(result.success ? "info" : "error",
                    result.success ? `OTP resent to ${countryCode} ${phone}` : result.error);
                }}
                disabled={loading}
                className="w-full text-zinc-500 hover:text-zinc-300 text-xs mt-4 transition-colors disabled:opacity-50"
              >
                Resend OTP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner({ text }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      {text}
    </span>
  );
}
