"use client";

import { apiFetch } from "@/lib/api-client";
import { CURRENT_CONSENT_VERSION } from "@/utils/taxonomy";

const consentPayload = () => ({ version: CURRENT_CONSENT_VERSION, termsAccepted: true, privacyAccepted: true, acceptableBehaviorAccepted: true });
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendOtp, verifyOtp, isValidPhone } from "@/lib/auth";
import { useLanguage } from "@/context/LanguageContext";
import { toast as sonnerToast } from "sonner";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import ThemedSelect from "@/components/ThemedSelect";
import { COUNTRIES, COUNTRY_CODES } from "@/utils/countries";
import {
  X,
  Users,
  Film,
  ClipboardList,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronDown,
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
  { value: "0-2", labelKey: "modal.expFresher", defaultLabel: "0–2 years", descKey: "modal.expFresherDesc", defaultDesc: "Fresher / Early career" },
  { value: "3-5", labelKey: "modal.expIntermediate", defaultLabel: "3–5 years", descKey: "modal.expIntermediateDesc", defaultDesc: "Intermediate" },
  { value: "5-10", labelKey: "modal.expExperienced", defaultLabel: "5–10 years", descKey: "modal.expExperiencedDesc", defaultDesc: "Experienced" },
  { value: "10+", labelKey: "modal.expSenior", defaultLabel: "10+ years", descKey: "modal.expSeniorDesc", defaultDesc: "Senior / Expert" },
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
  "w-full bg-[#1A1A1A] border border-[#2A2A2A] text-foreground rounded-xl px-4 py-2.5 text-base sm:text-sm min-h-[44px] outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60";
const selectCls =
  "w-full bg-[#1A1A1A] border border-[#2A2A2A] text-foreground rounded-xl pl-4 pr-10 py-2.5 text-base sm:text-sm min-h-[44px] outline-none focus:border-primary transition-colors appearance-none cursor-pointer";

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function SignUpModal({ open, onClose, defaultRole = null }) {
  const router = useRouter();
  const { t, isMalayalam } = useLanguage();

  // Steps: "role" | "phone" | "otp" | "profile" | "success"
  const [step, setStep] = useState("role");
  const [role, setRole] = useState(null); // "crew" | "organizer"
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState(""); // digits only, no country code
  const [fullPhone, setFullPhone] = useState(""); // full phone with country code
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [consentOk, setConsentOk] = useState(true);
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
    } else if (defaultRole === "crew" || defaultRole === "organizer") {
      setRole(defaultRole);
      setStep("phone");
    }
  }, [open, defaultRole]);

  // Lock viewport & body scroll when modal is open
  useEffect(() => {
    if (open) {
      const origHtmlOverflow = document.documentElement.style.overflow;
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      const origBodyOverscroll = document.body.style.overscrollBehavior;

      document.documentElement.classList.add("modal-open");
      document.body.classList.add("modal-open");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overscrollBehavior = "none";

      return () => {
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
        document.documentElement.style.overflow = origHtmlOverflow;
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overscrollBehavior = origHtmlOverscroll;
        document.body.style.overscrollBehavior = origBodyOverscroll;
      };
    }
  }, [open]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    if (type === "error") sonnerToast.error(message);
    else if (type === "success") sonnerToast.success(message);
    else sonnerToast.info(message);
  }, []);

  // ── Step: Role Selection ────────────────────────────────────────────────────
  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep("phone");
  };

  // ── Step: Phone ─────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      showToast(
        "error",
        isMalayalam
          ? "ദയവായി സാധുവായ ഫോൺ നമ്പർ നൽകുക."
          : "Please enter a valid phone number."
      );
      return;
    }

    const fp = `${countryCode}${digits}`;
    if (countryCode === "+91") {
      if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
        showToast(
          "error",
          isMalayalam
            ? "സാധുവായ 10 അക്ക ഇന്ത്യൻ മൊബൈൽ നമ്പർ നൽകുക (6-9 ൽ തുടങ്ങുന്നത്)."
            : "Please provide a valid 10-digit Indian mobile number"
        );
        return;
      }
    } else if (digits.length < 7 || !isValidPhone(fp)) {
      showToast(
        "error",
        isMalayalam
          ? "അസാധുവായ ഫോൺ നമ്പർ. കൺട്രി കോഡ് പരിശോധിക്കുക."
          : "Invalid phone number. Include country code."
      );
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
    showToast(
      "info",
      isMalayalam
        ? `${countryCode} ${digits}-ലേക്ക് OTP അയച്ചു.`
        : `OTP sent to ${countryCode} ${digits}.`
    );
    setResendTimer(60);
  };

  // ── Step: OTP ────────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      showToast(
        "error",
        isMalayalam
          ? "ദയവായി 6 അക്ക OTP നൽകുക."
          : "Please enter the 6-digit OTP."
      );
      return;
    }
    setLoading(true);
    const res = await verifyOtp(otp);
    setLoading(false);
    if (!res.success) {
      setOtp("");
      if (res.code === "auth/code-expired" || res.code === "auth/session-expired") {
        setStep("phone");
        showToast(
          "error",
          isMalayalam
            ? "OTP കാലാവധി കഴിഞ്ഞു. പുതിയതൊന്ന് ആവശ്യപ്പെടുക."
            : "OTP expired. Please request a new one."
        );
      } else {
        showToast(
          "error",
          res.error ||
            (isMalayalam
              ? "തെറ്റായ OTP. വീണ്ടും ശ്രമിക്കുക."
              : "Invalid OTP. Please try again.")
        );
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
    showToast(
      "info",
      isMalayalam ? "OTP വീണ്ടും അയച്ചു." : "OTP resent successfully."
    );
  };

  // ── Step: Profile Form ────────────────────────────────────────────────────
  const handleCrewSubmit = async (e) => {
    e.preventDefault();
    if (!crewForm.name.trim())
      return showToast(
        "error",
        isMalayalam ? "പൂർണ്ണ പേര് നിർബന്ധമാണ്." : "Full name is required."
      );
    if (!crewForm.city)
      return showToast(
        "error",
        isMalayalam ? "നഗരം തിരഞ്ഞെടുക്കുക." : "City is required."
      );
    if (crewForm.city === "Other" && !crewForm.cityOther.trim())
      return showToast(
        "error",
        isMalayalam ? "നിങ്ങളുടെ നഗരം രേഖപ്പെടുത്തുക." : "Please enter your city."
      );
    if (!crewForm.crewRole)
      return showToast(
        "error",
        isMalayalam
          ? "പ്രധാന തൊഴിൽ വിഭാഗം തിരഞ്ഞെടുക്കുക."
          : "Please select your role."
      );
    if (crewForm.crewRole === "Other" && !crewForm.crewRoleOther.trim())
      return showToast(
        "error",
        isMalayalam
          ? "തൊഴിൽ വിഭാഗം വ്യക്തമാക്കുക."
          : "Please specify your role."
      );
    if (!crewForm.experience)
      return showToast(
        "error",
        isMalayalam
          ? "പരിചയസമ്പത്ത് തിരഞ്ഞെടുക്കുക."
          : "Please select your experience level."
      );

    setLoading(true);
    try {
      const finalCity = crewForm.city === "Other" ? crewForm.cityOther.trim() : crewForm.city;
      const finalRole = crewForm.crewRole === "Other" ? crewForm.crewRoleOther.trim() : crewForm.crewRole;

      const res = await apiFetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          role: "crew",
          consent: consentPayload(),
          crewData: {
            name: crewForm.name.trim(),
            city: finalCity,
            crewRole: finalRole,
            experience: crewForm.experience,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isMalayalam ? "പ്രൊഫൈൽ നിർമ്മിക്കാൻ കഴിഞ്ഞില്ല." : "Failed to create profile."));
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("crewhive_user_role", "crew");
          sessionStorage.setItem("crewhive_user_phone", fullPhone);
        } catch (_) {}
      }
      setStep("success");
    } catch (err) {
      showToast(
        "error",
        err.message ||
          (isMalayalam
            ? "പ്രൊഫൈൽ നിർമ്മിക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക."
            : "Failed to create profile. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizerSubmit = async (e) => {
    e.preventDefault();
    if (!orgForm.name.trim())
      return showToast(
        "error",
        isMalayalam ? "പൂർണ്ണ പേര് നിർബന്ധമാണ്." : "Full name is required."
      );
    if (!orgForm.companyName.trim())
      return showToast(
        "error",
        isMalayalam
          ? "കമ്പനി / സ്ഥാപനത്തിന്റെ പേര് നിർബന്ധമാണ്."
          : "Company / organization name is required."
      );
    if (!orgForm.city)
      return showToast(
        "error",
        isMalayalam ? "നഗരം തിരഞ്ഞെടുക്കുക." : "City is required."
      );
    if (orgForm.city === "Other" && !orgForm.cityOther.trim())
      return showToast(
        "error",
        isMalayalam ? "നിങ്ങളുടെ നഗരം രേഖപ്പെടുത്തുക." : "Please enter your city."
      );

    setLoading(true);
    try {
      const finalCity = orgForm.city === "Other" ? orgForm.cityOther.trim() : orgForm.city;

      const res = await apiFetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          role: "organizer",
          consent: consentPayload(),
          organizerData: {
            name: orgForm.name.trim(),
            companyName: orgForm.companyName.trim(),
            city: finalCity,
            requirements: orgForm.requirements.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isMalayalam ? "പ്രൊഫൈൽ നിർമ്മിക്കാൻ കഴിഞ്ഞില്ല." : "Failed to create profile."));
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("crewhive_user_role", "organizer");
          sessionStorage.setItem("crewhive_user_phone", fullPhone);
        } catch (_) {}
      }
      setStep("success");
    } catch (err) {
      showToast(
        "error",
        err.message ||
          (isMalayalam
            ? "പ്രൊഫൈൽ നിർമ്മിക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക."
            : "Failed to create profile. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step: Success → Redirect ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => {
      // Do not call onClose() before navigating, so the landing page doesn't flash
      if (role === "crew") {
        window.location.href = "/pending-approval";
      } else {
        window.location.href = "/organizer/search";
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [step, role]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-hidden overscroll-none"
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={step !== "success" ? onClose : undefined}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[94dvh] sm:max-h-[88vh] overflow-hidden overscroll-contain">
        {/* Hidden reCAPTCHA */}
        <div
          id="recaptcha-container"
          style={{ position: "absolute", bottom: 0, opacity: 0, pointerEvents: "none" }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 border-b border-border shrink-0 bg-card">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {canGoBack && (
              <button
                onClick={handleBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors min-h-[44px] min-w-[44px]"
                aria-label={isMalayalam ? "പിന്നിലേക്ക്" : "Go back"}
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-foreground text-sm sm:text-base">
              {t("modal.createAccount", "Create Account")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
            aria-label={t("common.actions.close", "Close dialog")}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        {step !== "success" && (
          <div className="h-1 bg-muted shrink-0">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-3.5 sm:py-4 overscroll-contain">
          <Toast toast={toast} onClose={() => setToast(null)} />

          {/* ── STEP: Role Selection ── */}
          {step === "role" && (
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                {t("modal.joinTitle", "Join CrewHive")}
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-5 sm:mb-6">
                {t("modal.joinSubtitle", "Are you joining as crew or an organizer?")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={() => handleRoleSelect("crew")}
                  className="group flex flex-col items-center gap-3 p-4 sm:p-6 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center min-h-[140px] justify-center cursor-pointer"
                >
                  <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all shrink-0">
                    <Film className="w-6 sm:w-7 h-6 sm:h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm sm:text-base">
                      {t("modal.crewRole", "Crew")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("modal.crewRoleDesc", "Sound, Lighting, Stage & more")}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleRoleSelect("organizer")}
                  className="group flex flex-col items-center gap-3 p-4 sm:p-6 rounded-2xl border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-center min-h-[140px] justify-center cursor-pointer"
                >
                  <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-all shrink-0">
                    <ClipboardList className="w-6 sm:w-7 h-6 sm:h-7 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm sm:text-base">
                      {t("modal.organizerRole", "Organizer")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("modal.organizerRoleDesc", "Find & contact skilled crew")}
                    </p>
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
                  {role === "crew" ? (isMalayalam ? "ക്രൂ" : "Crew") : (isMalayalam ? "ഓർഗനൈസർ" : "Organizer")}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1 mt-2">
                {t("modal.enterPhone", "Enter your phone")}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {t("modal.phoneSubtitle", "We'll send an OTP to verify your number.")}
              </p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Field label={isMalayalam ? "രാജ്യ കോഡ്" : "Country Code"}>
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={(code) => setCountryCode(code)}
                  />
                </Field>

                <Field label={t("modal.phoneLabel", "Phone Number")} required>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    className={`w-full ${inputCls}`}
                    autoFocus
                  />
                </Field>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 min-h-[46px] rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  {loading ? t("modal.sendingOtp", "Sending OTP…") : t("modal.sendOtp", "Send OTP")}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP: OTP ── */}
          {step === "otp" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                {t("modal.verifyOtp", "Verify OTP")}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {t("modal.otpSentTo", "Enter the 6-digit code sent to")}{" "}
                <span className="text-foreground font-medium">{fullPhone}</span>
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Field label={t("modal.otpCode", "OTP Code")} required>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full text-center text-2xl sm:text-3xl tracking-[0.25em] sm:tracking-[0.6em] bg-muted border border-border text-foreground h-14 sm:h-16 rounded-xl outline-none focus:border-primary/50 transition-colors font-bold"
                    autoFocus
                  />
                </Field>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 min-h-[46px] rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? t("modal.verifying", "Verifying…") : t("modal.verifyOtp", "Verify OTP")}
                </button>
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={handleResend}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0
                    ? isMalayalam
                      ? `${resendTimer} സെക്കൻഡിൽ വീണ്ടും അയയ്ക്കാം`
                      : `Resend OTP in ${resendTimer}s`
                    : t("modal.resendOtp", "Resend OTP")}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP: Crew Profile Form ── */}
          {step === "profile" && role === "crew" && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <Film className="w-3.5 h-3.5" />
                  {isMalayalam ? "ക്രൂ" : "Crew"}
                </span>
                <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                  {fullPhone}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5">
                {t("modal.completeCrewProfile", "Complete your profile")}
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                {isMalayalam
                  ? `വിവരങ്ങൾ നൽകുക — നിങ്ങളുടെ നമ്പർ സ്ഥിരീകരിച്ചു.`
                  : `Fill in your details to create your profile.`}
              </p>
              <form onSubmit={handleCrewSubmit} className="space-y-3">
                <Field label={t("modal.fullName", "Full Name")} required>
                  <input
                    type="text"
                    value={crewForm.name}
                    onChange={(e) => setCrewForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder={t("modal.namePlaceholderCrew", "e.g. Rahul Nair")}
                    className={inputCls}
                    autoFocus
                  />
                </Field>

                <Field label={t("modal.city", "City")} required>
                  <ThemedSelect
                    value={crewForm.city}
                    onChange={(val) => setCrewForm((p) => ({ ...p, city: val, cityOther: "" }))}
                    options={CITIES.map((c) => {
                      let label = c;
                      if (isMalayalam) {
                        if (c === "Kochi") label = "കൊച്ചി";
                        else if (c === "Trivandrum") label = "തിരുവനന്തപുരം";
                        else if (c === "Kozhikode") label = "കോഴിക്കോട്";
                        else if (c === "Other") label = "മറ്റുള്ളവ";
                      }
                      return { value: c, label };
                    })}
                    placeholder={t("modal.selectCity", "Select your city")}
                  />
                </Field>
                {crewForm.city === "Other" && (
                  <Field label={t("modal.yourCity", "Your City")} required>
                    <input
                      type="text"
                      value={crewForm.cityOther}
                      onChange={(e) => setCrewForm((p) => ({ ...p, cityOther: e.target.value }))}
                      placeholder={t("modal.enterCity", "Enter your city")}
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field label={t("modal.primaryRole", "Your Role")} required>
                  <ThemedSelect
                    value={crewForm.crewRole}
                    onChange={(val) => setCrewForm((p) => ({ ...p, crewRole: val, crewRoleOther: "" }))}
                    options={CREW_ROLES.map((r) => {
                      let rLabel = r;
                      if (isMalayalam) {
                        if (r === "Sound Engineer") rLabel = "സൗണ്ട് എൻജിനീയർ";
                        else if (r === "Lighting Operator") rLabel = "ലൈറ്റിംഗ് ഓപ്പറേറ്റർ";
                        else if (r === "LED Wall Tech") rLabel = "LED വാൾ ടെക്നീഷ്യൻ";
                        else if (r === "Stage Manager") rLabel = "സ്റ്റേജ് മാനേജർ";
                        else if (r === "Rigger") rLabel = "റിഗ്ഗർ";
                        else if (r === "Other") rLabel = "മറ്റുള്ളവ";
                      }
                      return { value: r, label: rLabel };
                    })}
                    placeholder={t("modal.selectRole", "Select your primary role")}
                  />
                </Field>
                {crewForm.crewRole === "Other" && (
                  <Field label={t("modal.specifyRole", "Specify Your Role")} required>
                    <input
                      type="text"
                      value={crewForm.crewRoleOther}
                      onChange={(e) => setCrewForm((p) => ({ ...p, crewRoleOther: e.target.value }))}
                      placeholder={t("modal.specifyRolePlaceholder", "e.g. Videographer")}
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field label={t("modal.experience", "Experience")} required>
                  <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setCrewForm((p) => ({ ...p, experience: opt.value }))}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          crewForm.experience === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <span className="text-sm font-semibold">
                          {opt.labelKey ? t(opt.labelKey, opt.defaultLabel) : opt.label}
                        </span>
                        <span className="text-[11px] opacity-70 mt-0.5">
                          {opt.descKey ? t(opt.descKey, opt.defaultDesc) : opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 min-h-[44px] rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? t("modal.creating", "Creating profile…") : t("modal.submitCrew", "Submit for Approval")}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  {t(
                    "modal.crewApprovalNotice",
                    "Crew profiles are reviewed by our admin team. You'll be notified once approved."
                  )}
                </p>
              </form>
            </div>
          )}

          {/* ── STEP: Organizer Profile Form ── */}
          {step === "profile" && role === "organizer" && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
                  {t("modal.roleOrganizer", "Organizer")}
                </span>
                <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                  {fullPhone}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5">
                {t("modal.completeOrgProfile", "Complete organizer profile")}
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                {isMalayalam
                  ? `വിവരങ്ങൾ നൽകുക — നിങ്ങളുടെ നമ്പർ സ്ഥിരീകരിച്ചു.`
                  : `Fill in your details — your phone is verified.`}
              </p>
              <form onSubmit={handleOrganizerSubmit} className="space-y-3">
                <Field label={t("modal.fullName", "Your Full Name")} required>
                  <input
                    type="text"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder={t("modal.namePlaceholderOrg", "e.g. Priya Menon")}
                    className={inputCls}
                    autoFocus
                  />
                </Field>

                <Field label={t("modal.companyName", "Company / Organization Name")} required>
                  <input
                    type="text"
                    value={orgForm.companyName}
                    onChange={(e) => setOrgForm((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder={t("modal.companyPlaceholder", "e.g. StarEvents Kochi")}
                    className={inputCls}
                  />
                </Field>

                <Field label={t("modal.city", "City")} required>
                  <ThemedSelect
                    value={orgForm.city}
                    onChange={(val) => setOrgForm((p) => ({ ...p, city: val, cityOther: "" }))}
                    options={CITIES.map((c) => {
                      let label = c;
                      if (isMalayalam) {
                        if (c === "Kochi") label = "കൊച്ചി";
                        else if (c === "Trivandrum") label = "തിരുവനന്തപുരം";
                        else if (c === "Kozhikode") label = "കോഴിക്കോട്";
                        else if (c === "Other") label = "മറ്റുള്ളവ";
                      }
                      return { value: c, label };
                    })}
                    placeholder={t("modal.selectCity", "Select your city")}
                  />
                </Field>
                {orgForm.city === "Other" && (
                  <Field label={t("modal.yourCity", "Your City")} required>
                    <input
                      type="text"
                      value={orgForm.cityOther}
                      onChange={(e) => setOrgForm((p) => ({ ...p, cityOther: e.target.value }))}
                      placeholder={t("modal.enterCity", "Enter your city")}
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field label={t("modal.requirements", "Crew Requirements")}>
                  <textarea
                    value={orgForm.requirements}
                    onChange={(e) => setOrgForm((p) => ({ ...p, requirements: e.target.value }))}
                    placeholder={t(
                      "modal.requirementsPlaceholder",
                      "e.g. We regularly need sound engineers and lighting operators for corporate events…"
                    )}
                    rows={2}
                    className={`${inputCls} resize-none min-h-[56px]`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 min-h-[44px] rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? t("modal.creating", "Creating profile…") : t("modal.submitOrg", "Create Account & Continue")}
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
                {role === "crew"
                  ? t("modal.successCrewTitle", "Profile Submitted!")
                  : t("modal.successOrgTitle", "Welcome to CrewHive!")}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {role === "crew"
                  ? t(
                      "modal.successCrewDesc",
                      "Your crew profile has been submitted for admin review. You'll be notified once approved."
                    )
                  : t(
                      "modal.successOrgDesc",
                      "Your organizer account is ready. Redirecting to your dashboard…"
                    )}
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("modal.redirecting", "Redirecting…")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
