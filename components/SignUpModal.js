"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendOtp, verifyOtp, isValidPhone } from "@/lib/auth";
import {
  X,
  Users,
  Film,
  ClipboardList,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronLeft,
  Loader2,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CITIES = ["Kochi", "Trivandrum", "Kozhikode", "Other"];

const CREW_ROLES = [
  "Sound Engineer",
  "Lighting Operator",
  "LED Wall Tech",
  "Stage Manager",
  "Rigger",
  "Other",
];

const EXPERIENCE_OPTIONS = [
  { value: "0-2", label: "0–2 years", desc: "Fresher / Early career" },
  { value: "3-5", label: "3–5 years", desc: "Intermediate" },
  { value: "5-10", label: "5–10 years", desc: "Experienced" },
  { value: "10+", label: "10+ years", desc: "Senior / Expert" },
];

const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
];

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const styles = {
    error: "bg-red-950/95 border-red-800 text-red-200",
    success: "bg-green-950/95 border-green-800 text-green-200",
    info: "bg-zinc-900/95 border-zinc-700 text-zinc-200",
  };
  const icons = {
    error: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 shrink-0 mt-0.5" />,
  };
  return (
    <div
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium mb-4 ${styles[toast.type] || styles.info}`}
    >
      {icons[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground";
const selectCls =
  "w-full bg-muted border border-border text-foreground rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/60 transition-colors appearance-none cursor-pointer";

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function SignUpModal({ open, onClose }) {
  const router = useRouter();

  // Steps: "role" | "phone" | "otp" | "profile" | "success"
  const [step, setStep] = useState("role");
  const [role, setRole] = useState(null); // "crew" | "organizer"
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState(""); // digits only, no country code
  const [fullPhone, setFullPhone] = useState(""); // full phone with country code
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Crew form
  const [crewForm, setCrewForm] = useState({
    name: "",
    city: "",
    cityOther: "",
    crewRole: "",
    crewRoleOther: "",
    experience: "",
  });

  // Organizer form
  const [orgForm, setOrgForm] = useState({
    name: "",
    companyName: "",
    city: "",
    cityOther: "",
    requirements: "",
  });

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setStep("role");
      setRole(null);
      setPhone("");
      setOtp("");
      setLoading(false);
      setToast(null);
      setResendTimer(0);
      setCrewForm({ name: "", city: "", cityOther: "", crewRole: "", crewRoleOther: "", experience: "" });
      setOrgForm({ name: "", companyName: "", city: "", cityOther: "", requirements: "" });
    }
  }, [open]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const showToast = useCallback((type, message) => setToast({ type, message }), []);

  // ── Step: Role Selection ────────────────────────────────────────────────────
  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep("phone");
  };

  // ── Step: Phone ─────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      showToast("error", "Please enter a valid phone number.");
      return;
    }
    const fp = `${countryCode}${digits}`;
    if (!isValidPhone(fp)) {
      showToast("error", "Invalid phone number. Include country code.");
      return;
    }
    setLoading(true);

    const result = await sendOtp(fp);
    setLoading(false);
    if (!result.success) {
      showToast("error", result.error);
      return;
    }
    setFullPhone(fp);
    setStep("otp");
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    showToast("info", `OTP sent to ${countryCode} ${digits}${isLocal ? " (use 123456)" : ""}`);
    setResendTimer(60);
  };

  // ── Step: OTP ────────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      showToast("error", "Please enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    const res = await verifyOtp(otp);
    setLoading(false);
    if (!res.success) {
      setOtp("");
      if (res.code === "auth/code-expired" || res.code === "auth/session-expired") {
        setStep("phone");
        showToast("error", "OTP expired. Please request a new one.");
      } else {
        showToast("error", res.error || "Invalid OTP. Please try again.");
      }
      return;
    }
    setStep("profile");
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp("");
    setLoading(true);
    const result = await sendOtp(fullPhone);
    setLoading(false);
    if (!result.success) {
      showToast("error", result.error);
      return;
    }
    setResendTimer(60);
    showToast("info", "OTP resent successfully.");
  };

  // ── Step: Profile Form ────────────────────────────────────────────────────
  const handleCrewSubmit = async (e) => {
    e.preventDefault();
    if (!crewForm.name.trim()) return showToast("error", "Full name is required.");
    if (!crewForm.city) return showToast("error", "City is required.");
    if (crewForm.city === "Other" && !crewForm.cityOther.trim())
      return showToast("error", "Please enter your city.");
    if (!crewForm.crewRole) return showToast("error", "Please select your role.");
    if (crewForm.crewRole === "Other" && !crewForm.crewRoleOther.trim())
      return showToast("error", "Please specify your role.");
    if (!crewForm.experience) return showToast("error", "Please select your experience level.");

    setLoading(true);
    try {
      const finalCity = crewForm.city === "Other" ? crewForm.cityOther.trim() : crewForm.city;
      const finalRole = crewForm.crewRole === "Other" ? crewForm.crewRoleOther.trim() : crewForm.crewRole;

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          role: "crew",
          crewData: {
            name: crewForm.name.trim(),
            city: finalCity,
            crewRole: finalRole,
            experience: crewForm.experience,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create profile.");
      setStep("success");
    } catch (err) {
      showToast("error", err.message || "Failed to create profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizerSubmit = async (e) => {
    e.preventDefault();
    if (!orgForm.name.trim()) return showToast("error", "Full name is required.");
    if (!orgForm.companyName.trim()) return showToast("error", "Company / organization name is required.");
    if (!orgForm.city) return showToast("error", "City is required.");
    if (orgForm.city === "Other" && !orgForm.cityOther.trim())
      return showToast("error", "Please enter your city.");

    setLoading(true);
    try {
      const finalCity = orgForm.city === "Other" ? orgForm.cityOther.trim() : orgForm.city;

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          role: "organizer",
          organizerData: {
            name: orgForm.name.trim(),
            companyName: orgForm.companyName.trim(),
            city: finalCity,
            requirements: orgForm.requirements.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create profile.");
      setStep("success");
    } catch (err) {
      showToast("error", err.message || "Failed to create profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step: Success → Redirect ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => {
      onClose();
      if (role === "crew") {
        router.push("/pending-approval");
      } else {
        router.push("/organizer/dashboard");
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [step, role, router, onClose]);

  if (!open) return null;

  // ── Step labels / progress ──────────────────────────────────────────────────
  const steps = ["role", "phone", "otp", "profile", "success"];
  const stepIndex = steps.indexOf(step);

  const canGoBack =
    (step === "phone") ||
    (step === "otp") ||
    (step === "profile" && false); // don't allow going back after OTP (auth session active)

  const handleBack = () => {
    if (step === "phone") setStep("role");
    else if (step === "otp") {
      setOtp("");
      setStep("phone");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={step !== "success" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Hidden reCAPTCHA */}
        <div
          id="recaptcha-container"
          style={{ position: "absolute", bottom: 0, opacity: 0, pointerEvents: "none" }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                onClick={handleBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-foreground">Create Account</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        {step !== "success" && (
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        )}

        <div className="px-6 py-6">
          <Toast toast={toast} onClose={() => setToast(null)} />

          {/* ── STEP: Role Selection ── */}
          {step === "role" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Join CrewHive</h2>
              <p className="text-muted-foreground text-sm mb-6">Are you joining as crew or an organizer?</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleRoleSelect("crew")}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <Film className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Crew</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sound, Lighting, Stage & more</p>
                  </div>
                </button>
                <button
                  onClick={() => handleRoleSelect("organizer")}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                    <ClipboardList className="w-7 h-7 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Organizer</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Find & hire verified crew</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Phone ── */}
          {step === "phone" && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {role === "crew" ? <Film className="w-3 h-3" /> : <ClipboardList className="w-3 h-3" />}
                  {role === "crew" ? "Crew" : "Organizer"}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1 mt-2">Enter your phone</h2>
              <p className="text-muted-foreground text-sm mb-6">We'll send an OTP to verify your number.</p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Field label="Phone Number" required>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-muted border border-border text-foreground rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/60 transition-colors"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      maxLength={12}
                      className={`flex-1 ${inputCls}`}
                      autoFocus
                    />
                  </div>
                </Field>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  {loading ? "Sending OTP…" : "Send OTP"}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP: OTP ── */}
          {step === "otp" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Verify OTP</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Enter the 6-digit code sent to{" "}
                <span className="text-foreground font-medium">{fullPhone}</span>
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Field label="OTP Code" required>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full text-center text-3xl tracking-[0.6em] bg-muted border border-border text-foreground h-16 rounded-xl outline-none focus:border-primary/50 transition-colors font-bold"
                    autoFocus
                  />
                </Field>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={handleResend}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP: Crew Profile Form ── */}
          {step === "profile" && role === "crew" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Complete your profile</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Fill in your details — your phone{" "}
                <span className="text-foreground font-medium">{fullPhone}</span> is verified.
              </p>
              <form onSubmit={handleCrewSubmit} className="space-y-4">
                <Field label="Full Name" required>
                  <input
                    type="text"
                    value={crewForm.name}
                    onChange={(e) => setCrewForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Rahul Nair"
                    className={inputCls}
                    autoFocus
                  />
                </Field>

                <Field label="City" required>
                  <select
                    value={crewForm.city}
                    onChange={(e) => setCrewForm((p) => ({ ...p, city: e.target.value, cityOther: "" }))}
                    className={selectCls}
                  >
                    <option value="">Select your city</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                {crewForm.city === "Other" && (
                  <Field label="Your City" required>
                    <input
                      type="text"
                      value={crewForm.cityOther}
                      onChange={(e) => setCrewForm((p) => ({ ...p, cityOther: e.target.value }))}
                      placeholder="Enter your city"
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field label="Your Role" required>
                  <select
                    value={crewForm.crewRole}
                    onChange={(e) => setCrewForm((p) => ({ ...p, crewRole: e.target.value, crewRoleOther: "" }))}
                    className={selectCls}
                  >
                    <option value="">Select your primary role</option>
                    {CREW_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                {crewForm.crewRole === "Other" && (
                  <Field label="Specify Your Role" required>
                    <input
                      type="text"
                      value={crewForm.crewRoleOther}
                      onChange={(e) => setCrewForm((p) => ({ ...p, crewRoleOther: e.target.value }))}
                      placeholder="e.g. Videographer"
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field label="Experience" required>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setCrewForm((p) => ({ ...p, experience: opt.value }))}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                          crewForm.experience === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-xs opacity-70 mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Phone display (read-only) */}
                <Field label="Phone Number">
                  <input
                    type="text"
                    value={fullPhone}
                    readOnly
                    className={`${inputCls} opacity-60 cursor-not-allowed`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">This is your verified phone number.</p>
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Creating profile…" : "Submit for Approval"}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Crew profiles are reviewed by our admin team. You'll be notified once approved.
                </p>
              </form>
            </div>
          )}

          {/* ── STEP: Organizer Profile Form ── */}
          {step === "profile" && role === "organizer" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Complete your profile</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Fill in your details — your phone{" "}
                <span className="text-foreground font-medium">{fullPhone}</span> is verified.
              </p>
              <form onSubmit={handleOrganizerSubmit} className="space-y-4">
                <Field label="Your Full Name" required>
                  <input
                    type="text"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Priya Menon"
                    className={inputCls}
                    autoFocus
                  />
                </Field>

                <Field label="Company / Organization Name" required>
                  <input
                    type="text"
                    value={orgForm.companyName}
                    onChange={(e) => setOrgForm((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder="e.g. StarEvents Kochi"
                    className={inputCls}
                  />
                </Field>

                <Field label="City" required>
                  <select
                    value={orgForm.city}
                    onChange={(e) => setOrgForm((p) => ({ ...p, city: e.target.value, cityOther: "" }))}
                    className={selectCls}
                  >
                    <option value="">Select your city</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                {orgForm.city === "Other" && (
                  <Field label="Your City" required>
                    <input
                      type="text"
                      value={orgForm.cityOther}
                      onChange={(e) => setOrgForm((p) => ({ ...p, cityOther: e.target.value }))}
                      placeholder="Enter your city"
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field label="Crew Requirements">
                  <textarea
                    value={orgForm.requirements}
                    onChange={(e) => setOrgForm((p) => ({ ...p, requirements: e.target.value }))}
                    placeholder="e.g. We regularly need sound engineers and lighting operators for corporate events…"
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Describe the kind of crew you typically need.</p>
                </Field>

                {/* Phone display (read-only) */}
                <Field label="Phone Number">
                  <input
                    type="text"
                    value={fullPhone}
                    readOnly
                    className={`${inputCls} opacity-60 cursor-not-allowed`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">This is your verified phone number.</p>
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Creating profile…" : "Create Account & Continue"}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP: Success ── */}
          {step === "success" && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {role === "crew" ? "Profile Submitted!" : "Welcome to CrewHive!"}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {role === "crew"
                  ? "Your crew profile has been submitted for admin review. You'll be notified once approved."
                  : "Your organizer account is ready. Redirecting to your dashboard…"}
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Redirecting…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
