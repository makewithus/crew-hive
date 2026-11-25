"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { sendOtp, verifyOtp, prewarmRecaptcha } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { isValidPhone } from "@/utils/validators";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import LanguageToggle from "@/components/LanguageToggle";
import {
  PARENT_ROLES,
  CITIES,
  CURRENT_CONSENT_VERSION,
} from "@/utils/taxonomy";

import {
  Lightbulb,
  Volume2,
  Layers,
  Flame,
  Camera,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  MapPin,
  User,
  Lock,
  Clock,
  Zap,
  FileText,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const ICON_MAP = {
  Lightbulb,
  Volume2,
  Layers,
  Flame,
  Camera,
};

export default function CrewOnboardingPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { refreshUser, updateUserRole } = useAuth();
  const isMl = locale === "ml";

  // 5-step flow:
  // 1: Phone -> 2: OTP -> 3: Roles -> 4: City -> 5: Name -> 6: Live (Success)
  const [step, setStep] = useState(1);
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedSpecialisations, setSelectedSpecialisations] = useState([]);
  const [selectedCity, setSelectedCity] = useState("Kochi");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCrewId, setCreatedCrewId] = useState(null);

  const otpInputRefs = useRef([]);

  useEffect(() => {
    prewarmRecaptcha();
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

  // Step 1 -> Step 2: Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "");

    if (!digits) {
      const msg = isMl ? "സാധുവായ ഫോൺ നമ്പർ നൽകുക." : "Please enter a valid phone number.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (countryCode === "+91") {
      if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
        const msg = isMl
          ? "സാധുവായ 10 അക്ക ഇന്ത്യൻ മൊബൈൽ നമ്പർ നൽകുക (6-9 ൽ തുടങ്ങുന്നത്)."
          : "Please provide a valid 10-digit Indian mobile number";
        setError(msg);
        toast.error(msg);
        return;
      }
    } else {
      if (digits.length < 7 || !isValidPhone(fullPhone)) {
        const msg = isMl ? "ഫോൺ നമ്പർ ഫോർമാറ്റ് ശരിയല്ല." : "Invalid phone format. Please check digits.";
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await sendOtp(fullPhone);
      if (res.success) {
        setError("");
        toast.success(isMl ? "പരിശോധനാ കോഡ് അയച്ചു." : "Verification code sent via SMS.");
        setStep(2);
        setResendTimer(30);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
      } else {
        const msg = res.error || (isMl ? "OTP അയക്കാൻ സാധിച്ചില്ല. വീണ്ടും ശ്രമിക്കുക." : "Failed to send OTP. Please try again.");
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || (isMl ? "കണക്ഷൻ തകരാർ." : "Network error. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await sendOtp(fullPhone);
      if (res.success) {
        setResendTimer(30);
        toast.info(isMl ? "പുതിയ OTP അയച്ചിട്ടുണ്ട്." : "A new OTP code has been sent.");
      } else {
        const msg = res.error || "Resend failed.";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // OTP inputs handling
  const handleOtpDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = cleaned ? cleaned[cleaned.length - 1] : "";
    setOtp(newOtp);
    setError("");

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    if (pasted.length === 6) {
      otpInputRefs.current[5]?.focus();
    }
  };

  // Step 2 -> Step 3: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      const msg = isMl ? "6 അക്ക OTP പൂർണ്ണമായി നൽകുക." : "Please enter the complete 6-digit OTP.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await verifyOtp(code);
      if (!res.success) {
        const msg = res.error || (isMl ? "നൽകിയ OTP തെറ്റാണ്." : "Invalid OTP code. Please try again.");
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }
      toast.success(isMl ? "ഫോൺ നമ്പർ സ്ഥിരീകരിച്ചു!" : "Phone number verified successfully!");

      // Check if user already had a registered crew profile
      try {
        const checkRes = await apiFetch(`/api/crew/profile?phone=${encodeURIComponent(fullPhone)}`);
        if (checkRes.ok) {
          const checkJson = await checkRes.json();
          if (checkJson.data?.name) {
            setName(checkJson.data.name || "");
            if (checkJson.data.roles?.length) setSelectedRoles(checkJson.data.roles);
            if (checkJson.data.city) setSelectedCity(checkJson.data.city);
          }
        }
      } catch (_) {}

      // Proceed directly to Role Selection (Step 3)
      setStep(3);
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Role multi-selection
  const toggleParentRole = (roleId) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
    setError("");
  };

  const toggleSpecialisation = (specId) => {
    setSelectedSpecialisations((prev) =>
      prev.includes(specId) ? prev.filter((s) => s !== specId) : [...prev, specId]
    );
  };

  // Step 6 -> Step 7: Final Submission
  const handleCompleteRegistration = async (e) => {
    e?.preventDefault();
    setError("");

    if (!name.trim()) {
      const msg = isMl ? "നിങ്ങളുടെ പേര് നൽകുക." : "Please enter your name.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const selectedCityObj = CITIES.find((c) => c.id === selectedCity || c.nameEn === selectedCity);
      const cityName = selectedCityObj?.nameEn || selectedCity;

      const payload = {
        phone: fullPhone,
        name: name.trim(),
        roles: selectedRoles,
        role: selectedRoles[0] || "general_crew",
        specialisations: selectedSpecialisations,
        city: cityName,
        consent: {
          version: CURRENT_CONSENT_VERSION,
          termsAccepted: true,
          privacyAccepted: true,
          acceptableBehaviorAccepted: true,
        },
      };

      const res = await apiFetch("/api/crew/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create profile.");
      }

      toast.success(
        isMl
          ? "ക്രൂ പ്രൊഫൈൽ വിജയകരമായി രജിസ്റ്റർ ചെയ്തു!"
          : "Crew profile created successfully! Welcome to CrewHive."
      );
      setCreatedCrewId(data.crewId);
      if (updateUserRole) updateUserRole("crew", false);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("crewhive_user_role", "crew");
          sessionStorage.setItem("crewhive_user_phone", fullPhone);
          sessionStorage.setItem(
            "crewhive_cached_crew_profile",
            JSON.stringify({
              id: data.crewId || fullPhone.replace(/\D/g, ""),
              phone: fullPhone,
              name: name.trim(),
              role: selectedRoles[0] || "general_crew",
              roles: selectedRoles,
              specialisations: selectedSpecialisations,
              city: cityName,
            })
          );
        } catch (_) {}
      }

      setStep(6);
    } catch (err) {
      const msg = err.message || "Failed to complete onboarding.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md sticky top-0 z-30 py-2.5 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary text-zinc-950 flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
              CH
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight leading-none text-foreground">
                CrewHive
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Crew Network
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted"
            >
              {isMl ? "സൈൻ ഇൻ" : "Sign In"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto px-4 py-2 sm:py-3.5 flex flex-col justify-center max-w-xl">
        {/* Modern Segmented Progress Tracker (Steps 1 to 5) */}
        {step >= 1 && step <= 5 && (
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 text-primary font-black text-[11px] inline-flex items-center justify-center">
                  {step}
                </span>
                <span className="text-foreground font-semibold">
                  {step === 1 && (isMl ? "ഫോൺ പരിശോധന" : "Phone Number")}
                  {step === 2 && (isMl ? "OTP സ്ഥിരീകരണം" : "Verify Code")}
                  {step === 3 && (isMl ? "പ്രൊഫഷണൽ റോളുകൾ" : "Role Selection")}
                  {step === 4 && (isMl ? "നഗരം / ജില്ല" : "Base Location")}
                  {step === 5 && (isMl ? "പ്രൊഫൈൽ വിവരങ്ങൾ" : "Full Name & Go Live")}
                </span>
              </span>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                {isMl ? `ഘട്ടം ${step}/5` : `Step ${step} of 5`}
              </span>
            </div>

            {/* 5 Segmented Bars */}
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s < step
                      ? "bg-primary"
                      : s === step
                      ? "bg-primary shadow-xs shadow-primary/60"
                      : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── SCREEN 1: PHONE NUMBER ─── */}
        {step === 1 && (
          <div className="bg-card/95 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-sm space-y-4">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="flex items-start gap-3 pb-2 border-b border-border/40">
              <Link
                href="/"
                className="w-8 h-8 rounded-lg border border-border/80 bg-zinc-900/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 shadow-2xs"
                aria-label="Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  {t("onboarding.step1Title", "Step 1: Phone Number")}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("onboarding.step1Desc", "We'll send an OTP to verify your WhatsApp/mobile number.")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {isMl ? "കൺട്രി കോഡ്" : "Country Code"}
                </label>
                <CountryCodeSelect
                  value={countryCode}
                  onChange={(code) => setCountryCode(code)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {t("onboarding.phoneLabel", "Mobile / WhatsApp Number")}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setError("");
                    }}
                    placeholder={t("onboarding.phonePlaceholder", "9876543210")}
                    autoFocus
                    className="w-full bg-muted border border-border text-foreground rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold outline-none focus:border-primary placeholder:text-muted-foreground/60 tracking-wider transition-colors"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {isMl
                      ? "പാസ്‌വേഡ് ആവശ്യമില്ല. WhatsApp അല്ലെങ്കിൽ SMS OTP വഴി നേരിട്ട് സൈൻ ഇൻ ചെയ്യാം."
                      : "Password-free sign in via WhatsApp or SMS OTP. Zero spam guaranteed."}
                  </span>
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  (countryCode === "+91"
                    ? phone.replace(/\D/g, "").length !== 10
                    : phone.replace(/\D/g, "").length < 7)
                }
                className="w-full h-11 bg-primary hover:bg-primary/90 active:scale-[0.99] text-zinc-950 font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t("onboarding.sendOtp", "Send Verification Code")}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ─── SCREEN 2: OTP VERIFICATION ─── */}
        {step === 2 && (
          <div className="bg-card/95 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-sm space-y-4">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="flex items-start gap-3 pb-2 border-b border-border/40">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-8 h-8 rounded-lg border border-border/80 bg-zinc-900/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 shadow-2xs"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  {t("onboarding.step2Title", "Step 2: Enter Verification Code")}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed flex flex-wrap items-center gap-1.5">
                  <span>{t("onboarding.step2Desc", "Enter the 6-digit code sent to")}</span>
                  <span className="font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/50">
                    {fullPhone}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-primary hover:underline font-semibold text-xs ml-1"
                  >
                    {isMl ? "മാറ്റുക" : "Edit"}
                  </button>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div
                className="grid grid-cols-6 gap-2 sm:gap-2.5 max-w-sm mx-auto"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-full h-11 sm:h-12 text-center text-lg sm:text-xl font-black bg-muted/70 border border-border rounded-xl text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                <span>
                  {resendTimer > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {t("onboarding.resendIn", "Resend in")} {resendTimer}s
                    </span>
                  ) : (
                    <span>Didn't receive the code?</span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className="font-bold text-primary hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                >
                  {t("onboarding.resendOtp", "Resend Code")}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="w-full h-11 bg-primary hover:bg-primary/90 active:scale-[0.99] text-zinc-950 font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t("onboarding.verifyOtp", "Verify & Continue")}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ─── SCREEN 3: PROFESSIONAL ROLE SELECTION ─── */}
        {step === 3 && (
          <div className="bg-card/95 border border-border/80 rounded-2xl p-3.5 sm:p-4.5 shadow-2xl relative overflow-hidden backdrop-blur-sm space-y-3">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="flex items-start gap-3 pb-2 border-b border-border/40">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-8 h-8 rounded-lg border border-border/80 bg-zinc-900/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 shadow-2xs"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  {t("onboarding.step3Title", "Step 3: Select Your Roles")}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("onboarding.step3Desc", "Choose all categories you work in. Select specialisations below each role.")}
                </p>
              </div>
            </div>

            {/* Parent Roles Grid */}
            <div className="grid grid-cols-2 gap-2">
              {PARENT_ROLES.map((role) => {
                const IconComponent = ICON_MAP[role.icon] || Lightbulb;
                const isSelected = selectedRoles.includes(role.id);

                return (
                  <div
                    key={role.id}
                    className={`rounded-xl border p-2 sm:p-2.5 transition-all text-left flex items-center justify-between gap-2 cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs"
                        : "bg-muted/40 border-border hover:border-zinc-600 hover:bg-muted/60"
                    }`}
                    onClick={() => toggleParentRole(role.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-primary text-black font-semibold" : "bg-card border border-border/80 text-muted-foreground"
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-semibold text-xs text-foreground leading-tight truncate">
                        {isMl ? role.nameMl : role.nameEn}
                      </h4>
                    </div>

                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                        isSelected ? "bg-primary border-primary text-black" : "border-border/80 bg-card/40"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Specialisations */}
            {selectedRoles.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {isMl ? "സ്പെഷ്യലൈസേഷനുകൾ (ഓപ്ഷണൽ)" : "Specialisations (Optional)"}
                  </h4>
                  {selectedSpecialisations.length > 0 && (
                    <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      {selectedSpecialisations.length} {isMl ? "തിരഞ്ഞെടുത്തു" : "selected"}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                  {PARENT_ROLES.filter((r) => selectedRoles.includes(r.id)).map((parent) => (
                    <div key={parent.id} className="p-2 bg-muted/30 border border-border/50 rounded-lg space-y-1">
                      <span className="text-[11px] font-semibold text-foreground/90 block">
                        {isMl ? parent.nameMl : parent.nameEn}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {parent.specialisations.map((spec) => {
                          const isSpecSelected = selectedSpecialisations.includes(spec.id);
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => toggleSpecialisation(spec.id)}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                                isSpecSelected
                                  ? "bg-primary text-black font-semibold shadow-xs"
                                  : "bg-card text-muted-foreground hover:text-foreground border border-border hover:border-zinc-500"
                              }`}
                            >
                              {isMl ? spec.nameMl : spec.nameEn}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (selectedRoles.length === 0) {
                  const msg = isMl ? "കുറഞ്ഞത് ഒരു വിഭാഗമെങ്കിലും തിരഞ്ഞെടുക്കുക." : "Please select at least one role.";
                  setError(msg);
                  toast.error(msg);
                  return;
                }
                setStep(4);
              }}
              disabled={selectedRoles.length === 0}
              className="w-full h-10 sm:h-11 bg-primary hover:bg-primary/90 active:scale-[0.99] text-zinc-950 font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span>{isMl ? "നഗരം തിരഞ്ഞെടുക്കുക" : "Select City"}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* ─── SCREEN 4: CITY SELECTION ─── */}
        {step === 4 && (
          <div className="bg-card/95 border border-border/80 rounded-2xl p-3.5 sm:p-4.5 shadow-2xl relative overflow-hidden backdrop-blur-sm space-y-3">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="flex items-start gap-3 pb-2 border-b border-border/40">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-8 h-8 rounded-lg border border-border/80 bg-zinc-900/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 shadow-2xs"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  {t("onboarding.step4Title", "Step 4: Select Your Base City")}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("onboarding.step4Desc", "Where are you primarily based for event work in Kerala?")}
                </p>
              </div>
            </div>

            {/* Launch Cities */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{t("onboarding.launchCities", "Launch Hubs")}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  CITIES.find((c) => c.id === "kochi"),
                  CITIES.find((c) => c.id === "thiruvananthapuram"),
                  CITIES.find((c) => c.id === "kozhikode"),
                ]
                  .filter(Boolean)
                  .map((city) => {
                    const isSelected = selectedCity === city.nameEn;
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => {
                          setSelectedCity(city.nameEn);
                          setError("");
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[44px] ${
                          isSelected
                            ? "bg-primary text-black border-primary font-bold shadow-md shadow-primary/20 scale-[1.02]"
                            : "bg-muted/60 border-border text-foreground hover:border-zinc-500 font-medium"
                        }`}
                      >
                        <span className="text-xs font-semibold truncate max-w-full">
                          {isMl ? city.nameMl : city.nameEn}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Other Districts */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("onboarding.otherDistricts", "All Kerala Districts")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {CITIES.filter((c) => !c.isLaunchCity).map((city) => {
                  const isSelected = selectedCity === city.nameEn;
                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        setSelectedCity(city.nameEn);
                        setError("");
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-center text-xs transition-all cursor-pointer font-medium truncate ${
                        isSelected
                          ? "bg-primary text-black border-primary font-bold shadow-xs scale-[1.02]"
                          : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:border-zinc-600"
                      }`}
                    >
                      {isMl ? city.nameMl : city.nameEn}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                if (!selectedCity) {
                  const msg = isMl ? "ഒരു നഗരം തിരഞ്ഞെടുക്കുക." : "Please select your city.";
                  setError(msg);
                  toast.error(msg);
                  return;
                }
                setStep(5);
              }}
              className="w-full h-10 sm:h-11 bg-primary hover:bg-primary/90 active:scale-[0.99] text-zinc-950 font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isMl ? "പേര് നൽകുക" : "Enter Name"}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* ─── SCREEN 5: NAME ENTRY (GO LIVE) ─── */}
        {step === 5 && (
          <div className="bg-card/95 border border-border/80 rounded-2xl p-3.5 sm:p-4.5 shadow-2xl relative overflow-hidden backdrop-blur-sm space-y-3">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="flex items-start gap-3 pb-2 border-b border-border/40">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-8 h-8 rounded-lg border border-border/80 bg-zinc-900/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 shadow-2xs"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  {t("onboarding.step5Title", "Step 5: Enter Your Full Name")}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    "onboarding.step5Desc",
                    "Enter your name to complete onboarding. You can add more portfolio and bio details anytime."
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleCompleteRegistration} className="space-y-3.5">
              {/* Profile Summary Pill */}
              <div className="p-2.5 bg-muted/50 border border-border rounded-xl text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-foreground">{fullPhone}</span>
                  <span>·</span>
                  <span>{selectedCity}</span>
                  <span>·</span>
                  <span>
                    {selectedRoles.length} {isMl ? "വിഭാഗങ്ങൾ" : selectedRoles.length === 1 ? "role" : "roles"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-primary font-bold hover:underline text-xs shrink-0 ml-2 cursor-pointer"
                >
                  {isMl ? "മാറ്റുക" : "Change"}
                </button>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {t("onboarding.nameLabel", "Your Full Name")} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    placeholder={t("onboarding.namePlaceholder", "e.g. Rahul Menon")}
                    autoFocus
                    className="w-full bg-muted border border-border text-foreground rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold outline-none focus:border-primary placeholder:text-muted-foreground/60 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {isMl
                    ? "ഫോൺ, റോൾ, സിറ്റി, പേര് എന്നിവ മാത്രം മതി പ്രൊഫൈൽ ലൈവാകാൻ. ബാക്കി വിവരങ്ങൾ പിന്നീട് ചേർക്കാം."
                    : "Only phone, role, city, and name are required. You can add more details later."}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full h-10 sm:h-11 bg-primary hover:bg-primary/90 active:scale-[0.99] text-zinc-950 font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t("onboarding.completeProfile", "Create Profile & Go Live")}</span>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ─── SCREEN 6: SUCCESS CELEBRATION (LIVE) ─── */}
        {step === 6 && (
          <div className="bg-card/95 border border-border/80 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto animate-in zoom-in">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {t("onboarding.successTitle", "Profile Created Successfully!")}
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed">
                {t(
                  "onboarding.successDesc",
                  "Your searchable profile is now live. Complete optional details anytime to get top priority in searches."
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isMl ? "പേര്:" : "Name:"}</span>
                <span className="font-bold text-foreground">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isMl ? "ഫോൺ:" : "Phone:"}</span>
                <span className="font-semibold text-foreground">{fullPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isMl ? "നഗരം:" : "City:"}</span>
                <span className="font-semibold text-foreground">{selectedCity}</span>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => router.push("/crew/dashboard")}
                className="w-full sm:w-auto min-w-56 h-11 px-6 bg-primary hover:bg-primary/90 active:scale-[0.99] text-zinc-950 font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t("onboarding.goToDashboard", "Go to Crew Dashboard")}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-2.5 text-center text-[11px] text-muted-foreground">
        © 2026–2027 CrewHive · Kerala AV & Event Technician Network
      </footer>
    </div>
  );
}
