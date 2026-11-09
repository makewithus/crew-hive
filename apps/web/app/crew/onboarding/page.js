"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  PARENT_ROLES,
  CITIES,
  CURRENT_CONSENT_VERSION,
} from "@/utils/taxonomy";
import { sendOtp, verifyOtp, isValidPhone, prewarmRecaptcha } from "@/lib/auth";
import LanguageToggle from "@/components/LanguageToggle";
import {
  Lightbulb,
  Volume2,
  Boxes,
  Flame,
  Camera,
  Clapperboard,
  Palette,
  Video,
  Sliders,
  Tv,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  MapPin,
  User,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const ICON_MAP = {
  Lightbulb,
  Volume2,
  Boxes,
  Flame,
  Camera,
  Clapperboard,
  Palette,
  Video,
  Sliders,
  Tv,
};

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", flag: "🇮🇳" },
  { code: "+971", label: "UAE (+971)", flag: "🇦🇪" },
  { code: "+1", label: "USA / Canada (+1)", flag: "🇺🇸" },
  { code: "+44", label: "UK (+44)", flag: "🇬🇧" },
  { code: "+65", label: "Singapore (+65)", flag: "🇸🇬" },
  { code: "+60", label: "Malaysia (+60)", flag: "🇲🇾" },
];

export default function CrewOnboardingPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const isMl = locale === "ml";

  // Flow steps: 1: Intro -> 2: Phone -> 3: OTP -> 4: Roles -> 5: City -> 6: Name & Consent -> 7: Success
  const [step, setStep] = useState(1);
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedSpecialisations, setSelectedSpecialisations] = useState([]);
  const [selectedCity, setSelectedCity] = useState("kochi");
  const [name, setName] = useState("");
  const [consentAgreed, setConsentAgreed] = useState(true);

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

  // Step 2 -> Step 3: Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      setError(isMl ? "സാധുവായ ഫോൺ നമ്പർ നൽകുക." : "Please enter a valid phone number.");
      return;
    }
    if (!isValidPhone(fullPhone)) {
      setError(isMl ? "ഫോൺ നമ്പർ ഫോർമാറ്റ് ശരിയല്ല." : "Invalid phone format. Please check digits.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(fullPhone);
      if (res.success) {
        toast.success(isMl ? "പരിശോധനാ കോഡ് അയച്ചു." : "Verification code sent via SMS.");
        setStep(3);
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

  // Step 3 -> Step 4: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError(isMl ? "6 അക്ക OTP പൂർണ്ണമായി നൽകുക." : "Please enter the complete 6-digit OTP.");
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
        const checkRes = await fetch(`/api/crew/profile?phone=${encodeURIComponent(fullPhone)}`);
        if (checkRes.ok) {
          const checkJson = await checkRes.json();
          if (checkJson.data?.name) {
            // Already has profile! Preload and take to step 4 or dashboard
            setName(checkJson.data.name || "");
            if (checkJson.data.roles?.length) setSelectedRoles(checkJson.data.roles);
            if (checkJson.data.city) setSelectedCity(checkJson.data.city);
          }
        }
      } catch (_) {}

      setStep(4);
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

  // Step 6: Final Submission (under 30s)
  const handleCompleteRegistration = async (e) => {
    e?.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(isMl ? "നിങ്ങളുടെ പേര് നൽകുക." : "Please enter your name.");
      return;
    }

    if (!consentAgreed) {
      setError(
        isMl
          ? "സേവന വ്യവസ്ഥകളും നിബന്ധനകളും അംഗീകരിക്കേണ്ടതുണ്ട്."
          : "You must agree to the Terms, Privacy Policy, and Community Conduct."
      );
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

      const res = await fetch("/api/crew/onboarding", {
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
      setStep(7); // Success!
    } catch (err) {
      console.error("[onboarding] Submit error:", err);
      const msg = err.message || "Failed to create crew profile. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center font-bold text-black text-sm shadow-md shadow-primary/30">
              CH
            </div>
            <span className="font-bold text-lg tracking-tight">CrewHive</span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {isMl ? "സൈൻ ഇൻ" : "Sign In"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col justify-center">
        {/* Progress Bar (Visible for steps 2 to 6) */}
        {step >= 2 && step <= 6 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
              <span>{isMl ? `ഘട്ടം ${step - 1} / 5` : `Step ${step - 1} of 5`}</span>
              <span className="text-primary font-bold">
                {Math.round(((step - 1) / 5) * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${((step - 1) / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Global Error Notice */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-sm flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* ─── SCREEN 1: CREATE FREE PROFILE (INTRO) ─── */}
        {step === 1 && (
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>{t("onboarding.badge", "Crew Onboarding")} · 30 Seconds</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {t("onboarding.title", "Create your free crew profile in 30 seconds")}
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              {t(
                "onboarding.subtitle",
                "Join Kerala's dedicated AV & event technician network. Get discovered by event organizers and production houses."
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 text-left">
              <div className="p-4 rounded-xl bg-card border border-border">
                <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                <h4 className="font-semibold text-sm">
                  {isMl ? "നേരിട്ടുള്ള ബുക്കിംഗ്" : "Direct Bookings"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMl
                    ? "ഇടനിലക്കാരില്ലാതെ ഓർഗനൈസർമാരിൽ നിന്ന് നേരിട്ട് വർക്ക് ഓഫറുകൾ."
                    : "No commissions or middlemen. Deal directly with recruiters."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border">
                <MapPin className="w-5 h-5 text-primary mb-2" />
                <h4 className="font-semibold text-sm">
                  {isMl ? "സ്വന്തം പ്രദേശത്ത്" : "Kerala-Wide Reach"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMl
                    ? "കൊച്ചി, തിരുവനന്തപുരം, കോഴിക്കോട് ഉൾപ്പെടെയുള്ള ജില്ലകളിൽ."
                    : "Connect with events across Kochi, Trivandrum, and all districts."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border">
                <ShieldCheck className="w-5 h-5 text-blue-400 mb-2" />
                <h4 className="font-semibold text-sm">
                  {isMl ? "സുരക്ഷിത സ്വകാര്യത" : "Privacy First"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMl
                    ? "ലൊക്കേഷൻ പൂർണ്ണ സുരക്ഷിതം. ആവശ്യമുള്ളപ്പോൾ മാത്രം ലഭ്യത ഓൺ ചെയ്യാം."
                    : "Strict coarse location privacy. You control when you are visible."}
                </p>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:w-auto min-w-64 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 cursor-pointer"
              >
                <span>{t("onboarding.startCta", "Create Free Profile")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── SCREEN 2: PHONE NUMBER ─── */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep(1)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold">
                  {t("onboarding.step1Title", "Step 1: Phone Number")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("onboarding.step1Desc", "We'll send an OTP to verify your WhatsApp/mobile number.")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t("onboarding.phoneLabel", "Mobile / WhatsApp Number")}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-muted border border-border text-foreground rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-primary shrink-0"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
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
                      className="w-full bg-muted border border-border text-foreground rounded-xl pl-10 pr-4 py-3 text-sm font-semibold outline-none focus:border-primary placeholder:text-muted-foreground/60 tracking-wider"
                    />
                  </div>
                </div>
              </div>

              {isLocalDev && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                  {t("onboarding.devHint", "Dev mode: Use code 123456")}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, "").length < 7}
                className="w-full py-3.5 px-4 bg-primary text-black font-bold rounded-xl text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t("onboarding.sendOtp", "Send Verification Code")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ─── SCREEN 3: OTP VERIFICATION ─── */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep(2)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold">
                  {t("onboarding.step2Title", "Step 2: Enter Verification Code")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("onboarding.step2Desc", "Enter the 6-digit code sent to")}{" "}
                  <span className="font-semibold text-foreground">{fullPhone}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* 6 Digit Input Boxes */}
              <div
                className="flex items-center justify-between gap-2 sm:gap-3"
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
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-muted border border-border rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                ))}
              </div>

              {/* Resend Timer & Action */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  {resendTimer > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
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
                  className="font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                >
                  {t("onboarding.resendOtp", "Resend Code")}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="w-full py-3.5 px-4 bg-primary text-black font-bold rounded-xl text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t("onboarding.verifyOtp", "Verify & Continue")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ─── SCREEN 4: PROFESSIONAL ROLE SELECTION ─── */}
        {step === 4 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep(3)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold">
                  {t("onboarding.step3Title", "Step 3: Select Your Roles")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("onboarding.step3Desc", "Choose all categories you work in. Select specialisations below each role.")}
                </p>
              </div>
            </div>

            {/* Parent Roles Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {PARENT_ROLES.map((role) => {
                const IconComponent = ICON_MAP[role.icon] || Lightbulb;
                const isSelected = selectedRoles.includes(role.id);

                return (
                  <div
                    key={role.id}
                    className={`rounded-xl border p-3.5 transition-all text-left flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-muted/50 border-border hover:border-zinc-600"
                    }`}
                    onClick={() => toggleParentRole(role.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-primary text-black" : "bg-card text-muted-foreground"
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected ? "bg-primary border-primary text-black" : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {isMl ? role.nameMl : role.nameEn}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {isMl ? role.nameEn : role.nameMl}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Specialisations for selected roles */}
            {selectedRoles.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {isMl ? "സ്പെഷ്യലൈസേഷനുകൾ (ആവശ്യമെങ്കിൽ തിരഞ്ഞെടുക്കുക):" : "Specialisations (Optional):"}
                </h4>
                <div className="space-y-3">
                  {PARENT_ROLES.filter((r) => selectedRoles.includes(r.id)).map((parent) => (
                    <div key={parent.id} className="space-y-1.5">
                      <span className="text-xs font-medium text-foreground">
                        {isMl ? parent.nameMl : parent.nameEn}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {parent.specialisations.map((spec) => {
                          const isSpecSelected = selectedSpecialisations.includes(spec.id);
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => toggleSpecialisation(spec.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                isSpecSelected
                                  ? "bg-primary text-black"
                                  : "bg-muted text-muted-foreground hover:text-foreground border border-border"
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
                  setError(isMl ? "കുറഞ്ഞത് ഒരു വിഭാഗമെങ്കിലും തിരഞ്ഞെടുക്കുക." : "Please select at least one role.");
                  return;
                }
                setStep(5);
              }}
              disabled={selectedRoles.length === 0}
              className="mt-6 w-full py-3.5 px-4 bg-primary text-black font-bold rounded-xl text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20 cursor-pointer"
            >
              <span>{isMl ? "അടുത്തത്: നഗരം തിരഞ്ഞെടുക്കുക" : "Next: Select City"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── SCREEN 5: CITY SELECTION ─── */}
        {step === 5 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep(4)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold">
                  {t("onboarding.step4Title", "Step 4: Select Your Base City")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("onboarding.step4Desc", "Where are you primarily based for event work in Kerala?")}
                </p>
              </div>
            </div>

            {/* Launch Cities */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-2.5">
                ★ {t("onboarding.launchCities", "Launch Hubs")}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {CITIES.filter((c) => c.isLaunchCity).map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      setSelectedCity(city.nameEn);
                      setError("");
                    }}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedCity === city.nameEn
                        ? "bg-primary text-black border-primary font-bold shadow-md shadow-primary/20"
                        : "bg-muted border-border text-foreground hover:border-zinc-500 font-medium"
                    }`}
                  >
                    <div className="text-sm">{isMl ? city.nameMl : city.nameEn}</div>
                    <div className={`text-[11px] ${selectedCity === city.nameEn ? "text-black/70" : "text-muted-foreground"}`}>
                      {isMl ? city.nameEn : city.nameMl}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Other Districts */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                {t("onboarding.otherDistricts", "All Kerala Districts")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {CITIES.filter((c) => !c.isLaunchCity).map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      setSelectedCity(city.nameEn);
                      setError("");
                    }}
                    className={`px-3 py-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      selectedCity === city.nameEn
                        ? "bg-primary text-black border-primary font-bold"
                        : "bg-muted/70 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isMl ? city.nameMl : city.nameEn}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (!selectedCity) {
                  setError(isMl ? "ഒരു നഗരം തിരഞ്ഞെടുക്കുക." : "Please select your city.");
                  return;
                }
                setStep(6);
              }}
              className="mt-8 w-full py-3.5 px-4 bg-primary text-black font-bold rounded-xl text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 cursor-pointer"
            >
              <span>{isMl ? "അടുത്തത്: പേരും സമ്മതപത്രവും" : "Next: Name & Consent"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── SCREEN 6: NAME & CONSENT ─── */}
        {step === 6 && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep(5)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold">
                  {t("onboarding.step5Title", "Step 5: Name & Quick Consent")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("onboarding.step5Desc", "Almost done! Enter your name and agree to terms to activate your profile.")}
                </p>
              </div>
            </div>

            <form onSubmit={handleCompleteRegistration} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
                    className="w-full bg-muted border border-border text-foreground rounded-xl pl-10 pr-4 py-3 text-sm font-semibold outline-none focus:border-primary placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* One-Tap Consent Agreement */}
              <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>{t("onboarding.consentHeading", "One-Tap Community Agreement")}</span>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAgreed}
                    onChange={(e) => setConsentAgreed(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-primary mt-0.5"
                  />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <p>
                      {t(
                        "onboarding.consentTerms",
                        "I agree to the Terms of Service and Privacy Policy."
                      )}{" "}
                      {t(
                        "onboarding.consentConduct",
                        "I agree to professional acceptable behaviour on CrewHive."
                      )}
                    </p>
                    <p className="text-[11px] text-primary/80 mt-1 font-mono">
                      {t("onboarding.consentVersion", "Consent Version 1.0 (Recorded)")}
                    </p>
                  </div>
                </label>
              </div>

              {/* Summary pill */}
              <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {fullPhone} · {selectedCity} · {selectedRoles.length} {isMl ? "വിഭാഗങ്ങൾ" : "roles"}
                </span>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-primary font-semibold hover:underline"
                >
                  {isMl ? "മാറ്റുക" : "Change"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim() || !consentAgreed}
                className="w-full py-4 px-4 bg-primary text-black font-extrabold rounded-xl text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-primary/25 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t("onboarding.completeProfile", "Create Profile (Under 30s)")}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ─── SCREEN 7: SUCCESS CELEBRATION ─── */}
        {step === 7 && (
          <div className="bg-card border border-border rounded-2xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto animate-in zoom-in">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {t("onboarding.successTitle", "Profile Created Successfully!")}
              </h2>
              <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
                {t(
                  "onboarding.successDesc",
                  "Your searchable profile is now live. Complete optional details anytime to get top priority in searches."
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/60 border border-border text-left text-xs space-y-1.5 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isMl ? "പേര്:" : "Name:"}</span>
                <span className="font-semibold">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isMl ? "ഫോൺ:" : "Phone:"}</span>
                <span className="font-semibold">{fullPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isMl ? "നഗരം:" : "City:"}</span>
                <span className="font-semibold">{selectedCity}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push("/crew/dashboard")}
                className="w-full sm:w-auto min-w-64 py-3.5 px-6 bg-primary text-black font-extrabold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>{t("onboarding.goToDashboard", "Go to Crew Dashboard")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground">
        © 2026–2027 CrewHive · Kerala AV & Event Technician Network
      </footer>
    </div>
  );
}
