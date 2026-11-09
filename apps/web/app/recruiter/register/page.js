/**
 * /app/recruiter/register/page.js
 * Complete Recruiter Registration Flow
 *
 * Implements Prompt 3 Section 3:
 * STEP 1: Phone number + country code
 * STEP 2: OTP (Send, Verify, 30s resend timer, error handling, rate limiting)
 * STEP 3: Recruiter details (Company or individual name, City from taxonomy)
 * STEP 4: Consent (Terms, Privacy, Acceptable conduct, recorded with consent version)
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendOtp, verifyOtp, isValidPhone, prewarmRecaptcha } from "@/lib/auth";
import { CURRENT_CONSENT_VERSION } from "@/utils/taxonomy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";
import {
  Phone,
  ShieldCheck,
  Building2,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";

const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
];

export default function RecruiterRegisterPage() {
  const router = useRouter();
  const { locale, isMalayalam } = useLanguage();

  // Wizard Steps: 1 (Phone), 2 (OTP), 3 (Details), 4 (Consent), 5 (Success)
  const [step, setStep] = useState(1);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Recruiter Details
  const [companyOrName, setCompanyOrName] = useState("");
  const [city, setCity] = useState("Kochi");
  const [availableCities, setAvailableCities] = useState([]);

  // Consent
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeConduct, setAgreeConduct] = useState(false);

  // Pre-warm reCAPTCHA
  useEffect(() => {
    prewarmRecaptcha();
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Load backend cities
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch("/api/taxonomy/cities");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAvailableCities(json.data);
        }
      } catch (_) {}
    }
    loadCities();
  }, []);

  const fullPhone = `${countryCode}${phoneDigits.replace(/\D/g, "")}`;

  // ── STEP 1: Submit Phone & Send OTP ───────────────────────────────────────
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");

    const digits = phoneDigits.replace(/\D/g, "");
    if (digits.length < 10) {
      setError(
        isMalayalam
          ? "ദയവായി സാധുവായ 10 അക്ക ഫോൺ നമ്പർ നൽകുക."
          : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (!isValidPhone(fullPhone)) {
      setError(
        isMalayalam
          ? "അസാധുവായ ഫോൺ നമ്പർ ഫോർമാറ്റ്."
          : "Invalid phone number format."
      );
      return;
    }

    setLoading(true);
    const result = await sendOtp(fullPhone);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success(
      isMalayalam
        ? "പരിശോധനാ കോഡ് അയച്ചു."
        : "Verification code sent via SMS."
    );
    setResendTimer(30);
    setStep(2);
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setError("");
    setLoading(true);
    const result = await sendOtp(fullPhone);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.info(
        isMalayalam ? "പുതിയ OTP അയച്ചിട്ടുണ്ട്." : "A new OTP code has been sent."
      );
      setResendTimer(30);
    }
  };

  // ── STEP 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (otp.trim().length !== 6) {
      const msg = isMalayalam
        ? "ദയവായി 6 അക്ക OTP നൽകുക."
        : "Please enter the complete 6-digit verification code.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    const result = await verifyOtp(otp.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success(
      isMalayalam
        ? "ഫോൺ നമ്പർ സ്ഥിരീകരിച്ചു!"
        : "Phone number verified successfully!"
    );
    // OTP verified successfully → advance to Recruiter Details
    setStep(3);
  };

  // ── STEP 3: Recruiter Details ─────────────────────────────────────────────
  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!companyOrName.trim()) {
      setError(
        isMalayalam
          ? "കമ്പനി അല്ലെങ്കിൽ വ്യക്തിഗത പേര് നൽകുക."
          : "Company or individual name is required."
      );
      return;
    }
    if (!city) {
      setError(isMalayalam ? "നഗരം തിരഞ്ഞെടുക്കുക." : "City is required.");
      return;
    }

    setStep(4);
  };

  // ── STEP 4: Consent & Complete Registration ───────────────────────────────
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agreeTerms || !agreeConduct) {
      setError(
        isMalayalam
          ? "തുടരാൻ സേവന നിബന്ധനകളും പെരുമാറ്റച്ചട്ടവും അംഗീകരിക്കണം."
          : "You must accept the terms, privacy policy, and acceptable behaviour to continue."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          role: "organizer",
          organizerData: {
            name: companyOrName.trim(),
            companyName: companyOrName.trim(),
            city,
            consentAccepted: true,
            consentVersion: CURRENT_CONSENT_VERSION,
            consentTimestamp: new Date().toISOString(),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Registration failed.");
      }

      toast.success(
        isMalayalam
          ? "റിക്രൂട്ടർ പ്രൊഫൈൽ വിജയകരമായി നിർമ്മിച്ചു!"
          : "Recruiter profile created successfully! Redirecting to dashboard…"
      );
      setStep(5);
      setTimeout(() => {
        router.push("/organizer/dashboard");
      }, 2000);
    } catch (err) {
      const msg = err.message || "Registration failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Top navigation / Lang switcher */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">
              {isMalayalam ? "റിക്രൂട്ടർ രജിസ്ട്രേഷൻ" : "Recruiter Registration"}
            </span>
            <LanguageToggle compact />
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center justify-between mb-8">
            {[
              { num: 1, label: isMalayalam ? "ഫോൺ" : "Phone" },
              { num: 2, label: "OTP" },
              { num: 3, label: isMalayalam ? "വിവരങ്ങൾ" : "Details" },
              { num: 4, label: isMalayalam ? "സമ്മതം" : "Consent" },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step >= s.num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.num}
                </div>
                <span className="text-[11px] text-muted-foreground mt-1">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 1: PHONE NUMBER ─────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold">
                  {isMalayalam
                    ? "റിക്രൂട്ടർ അക്കൗണ്ട് ആരംഭിക്കുക"
                    : "Create Your Recruiter Account"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMalayalam
                    ? "നിങ്ങളുടെ മൊബൈൽ നമ്പർ നൽകുക. ഞങ്ങൾ ഒരു സ്ഥിരീകരണ കോഡ് അയയ്ക്കും."
                    : "Enter your phone number. We will send an SMS verification OTP."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isMalayalam ? "മൊബൈൽ നമ്പർ" : "Mobile Number"}
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:border-primary outline-none"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="tel"
                    placeholder="9876543210"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value)}
                    className="flex-1 bg-muted border-border"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-5"
              >
                {loading
                  ? isMalayalam
                    ? "അയയ്ക്കുന്നു..."
                    : "Sending OTP..."
                  : isMalayalam
                  ? "OTP അയയ്ക്കുക"
                  : "Send OTP"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {isMalayalam ? "ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?" : "Already registered?"}{" "}
                <Link href="/login" className="text-primary hover:underline">
                  {isMalayalam ? "ലോഗിൻ ചെയ്യുക" : "Sign In"}
                </Link>
              </p>
            </form>
          )}

          {/* ── STEP 2: VERIFY OTP ────────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold">
                  {isMalayalam ? "OTP നൽകുക" : "Verify OTP"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMalayalam
                    ? `${fullPhone} എന്ന നമ്പറിലേക്ക് അയച്ച 6 അക്ക കോഡ് നൽകുക.`
                    : `Enter the 6-digit verification code sent to ${fullPhone}.`}
                </p>
              </div>

              <div>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="text-center tracking-widest text-xl font-bold bg-muted py-6"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  (Dev local bypass: code 123456)
                </p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  {isMalayalam ? "നമ്പർ മാറ്റുക" : "Change phone"}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className={`inline-flex items-center font-medium ${
                    resendTimer > 0
                      ? "text-muted-foreground cursor-not-allowed"
                      : "text-primary hover:underline"
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5 mr-1" />
                  {resendTimer > 0
                    ? `${isMalayalam ? "വീണ്ടും അയയ്ക്കാം" : "Resend in"} (${resendTimer}s)`
                    : isMalayalam
                    ? "വീണ്ടും അയയ്ക്കുക"
                    : "Resend Code"}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-5"
              >
                {loading
                  ? isMalayalam
                    ? "സ്ഥിരീകരിക്കുന്നു..."
                    : "Verifying..."
                  : isMalayalam
                  ? "സ്ഥിരീകരിച്ച് തുടരുക"
                  : "Verify & Continue"}
              </Button>
            </form>
          )}

          {/* ── STEP 3: RECRUITER DETAILS ─────────────────────────────────── */}
          {step === 3 && (
            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold">
                  {isMalayalam ? "നിങ്ങളുടെ വിവരങ്ങൾ" : "Recruiter Details"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMalayalam
                    ? "ക്രൂ അംഗങ്ങൾക്ക് കാണാൻ കഴിയുന്ന കമ്പനി അല്ലെങ്കിൽ വ്യക്തിഗത പേര് നൽകുക."
                    : "Provide your company or individual name and primary operating hub."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isMalayalam
                    ? "കമ്പനി അല്ലെങ്കിൽ വ്യക്തിഗത പേര് *"
                    : "Company or Individual Name *"}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g. Cochin Events & Productions"
                    value={companyOrName}
                    onChange={(e) => setCompanyOrName(e.target.value)}
                    className="pl-9 bg-muted"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isMalayalam ? "പ്രവർത്തന നഗരം *" : "Operating City / Hub *"}
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:border-primary outline-none"
                >
                  {availableCities.length > 0 ? (
                    availableCities.map((c) => (
                      <option key={c.id || c.nameEn} value={c.nameEn}>
                        {isMalayalam && c.nameMl ? c.nameMl : c.nameEn}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Kochi">Kochi / കൊച്ചി</option>
                      <option value="Thiruvananthapuram">
                        Thiruvananthapuram / തിരുവനന്തപുരം
                      </option>
                      <option value="Kozhikode">Kozhikode / കോഴിക്കോട്</option>
                      <option value="Thrissur">Thrissur / തൃശ്ശൂർ</option>
                      <option value="Kannur">Kannur / കണ്ണൂർ</option>
                    </>
                  )}
                </select>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-5"
              >
                {isMalayalam ? "തുടരുക" : "Continue to Consent"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {/* ── STEP 4: CONSENT ───────────────────────────────────────────── */}
          {step === 4 && (
            <form onSubmit={handleFinalSubmit} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold">
                  {isMalayalam
                    ? "നിബന്ധനകളും സമ്മതവും"
                    : "Terms & Professional Consent"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMalayalam
                    ? "ക്രൂഹൈവിൽ പ്രൊഫഷണൽ രീതിയിൽ പ്രവർത്തിക്കാനുള്ള കരാർ അംഗീകരിക്കുക."
                    : "Please review and accept CrewHive's professional recruiter conduct terms."}
                </p>
              </div>

              <div className="space-y-4 bg-muted/50 p-4 rounded-xl border border-border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-primary border-border focus:ring-primary"
                  />
                  <span className="text-xs text-foreground leading-relaxed">
                    {isMalayalam
                      ? "ഞാൻ ക്രൂഹൈവിന്റെ സേവന നിബന്ധനകളും സ്വകാര്യതാ നയവും വായിച്ച് അംഗീകരിക്കുന്നു."
                      : "I agree to the Terms of Service and Privacy Policy for recruiters."}
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeConduct}
                    onChange={(e) => setAgreeConduct(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-primary border-border focus:ring-primary"
                  />
                  <span className="text-xs text-foreground leading-relaxed">
                    {isMalayalam
                      ? "ഞാൻ ന്യായമായ വേതനവും പ്രൊഫഷണൽ തൊഴിൽ അന്തരീക്ഷവും വാഗ്ദാനം ചെയ്യുമെന്നും ക്രൂ അംഗങ്ങളോട് മാന്യമായി പെരുമാറുമെന്നും സമ്മതിക്കുന്നു."
                      : "I agree to professional acceptable behavior, fair timely compensation, and respectful conduct towards technicians on CrewHive."}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                  <FileCheck2 className="w-3 h-3" />
                  Consent Version {CURRENT_CONSENT_VERSION}
                </span>
                <span>Audit recorded on submit</span>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {isMalayalam ? "തിരികെ" : "Back"}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !agreeTerms || !agreeConduct}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading
                    ? isMalayalam
                      ? "രജിസ്റ്റർ ചെയ്യുന്നു..."
                      : "Completing..."
                    : isMalayalam
                    ? "രജിസ്ട്രേഷൻ പൂർത്തിയാക്കുക"
                    : "Complete Registration"}
                </Button>
              </div>
            </form>
          )}

          {/* ── STEP 5: SUCCESS REDIRECT ──────────────────────────────────── */}
          {step === 5 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">
                {isMalayalam ? "സ്വാഗതം ക്രൂഹൈവിലേക്ക്!" : "Welcome to CrewHive!"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isMalayalam
                  ? "നിങ്ങളുടെ റിക്രൂട്ടർ പ്രൊഫൈൽ സജീവമാക്കി. ഡാഷ്‌ബോർഡിലേക്ക് മാറ്റുന്നു..."
                  : "Your recruiter profile is ready. Redirecting to your dashboard..."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

