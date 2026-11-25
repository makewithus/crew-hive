"use client";

import { apiFetch } from "@/lib/api-client";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

const KERALA_CITIES = [
  "Kochi",
  "Thiruvananthapuram",
  "Kozhikode",
  "Thrissur",
  "Kannur",
  "Kollam",
  "Alappuzha",
  "Palakkad",
  "Kottayam",
  "Malappuram",
  "Other Kerala District",
];

export default function AssociationForm({ onOpenSignUp = null }) {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    associationName: "",
    contactPerson: "",
    phone: "",
    email: "",
    city: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error' | 'duplicate'
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [submittedAssociations, setSubmittedAssociations] = useState([]);

  const validate = () => {
    const errs = {};
    if (!formData.associationName.trim()) {
      errs.associationName = t(
        "associations.form.validation.associationNameRequired",
        "Please enter the association name."
      );
    }

    if (!formData.contactPerson.trim()) {
      errs.contactPerson = t(
        "associations.form.validation.contactPersonRequired",
        "Please enter the contact person's name."
      );
    }

    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (!cleanPhone) {
      errs.phone = t(
        "associations.form.validation.phoneRequired",
        "Please enter an official phone number."
      );
    } else if (cleanPhone.length < 10 || cleanPhone.length > 12) {
      errs.phone = t(
        "associations.form.validation.phoneInvalid",
        "Please enter a valid 10-digit Indian phone number."
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = t(
        "associations.form.validation.emailRequired",
        "Please enter an official email address."
      );
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = t(
        "associations.form.validation.emailInvalid",
        "Please enter a valid email address."
      );
    }

    if (!formData.city.trim()) {
      errs.city = t(
        "associations.form.validation.cityRequired",
        "Please select or enter the primary city/district."
      );
    }

    return errs;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Duplicate submission protection
    const normalizedName = formData.associationName.trim().toLowerCase();
    if (submittedAssociations.includes(normalizedName)) {
      setSubmitStatus("duplicate");
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);
    setApiErrorMessage("");

    try {
      // Call the association inquiry boundary endpoint
      const response = await apiFetch("/api/associations/inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          associationName: formData.associationName.trim(),
          contactPerson: formData.contactPerson.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          city: formData.city.trim(),
          message: formData.message.trim(),
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        let errData = {};
        try {
          errData = await response.json();
        } catch (_) {}

        throw new Error(
          errData.message ||
            t(
              "associations.form.states.errorMessage",
              "The association inquiry service is undergoing setup for the 2027 launch. Please contact us directly via WhatsApp (+91 81390 02826) or email support@crewhive.in."
            )
        );
      }

      // Success
      setSubmittedAssociations((prev) => [...prev, normalizedName]);
      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      setApiErrorMessage(
        err.message ||
          t(
            "associations.form.states.errorMessage",
            "The association inquiry service is undergoing setup for the 2027 launch. Please contact us directly via WhatsApp (+91 81390 02826) or email support@crewhive.in."
          )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      associationName: "",
      contactPerson: "",
      phone: "",
      email: "",
      city: "",
      message: "",
    });
    setErrors({});
    setSubmitStatus(null);
    setApiErrorMessage("");
  };

  const handleMemberSignup = (e) => {
    if (onOpenSignUp) {
      e.preventDefault();
      onOpenSignUp("crew");
    }
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-xl relative overflow-hidden w-full max-w-full">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-60 h-60 sm:w-80 sm:h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-6 sm:mb-8 relative z-10">
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
          {t("associations.form.title", "Association Partnership Inquiry")}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t(
            "associations.form.subtitle",
            "Submit your association details to discuss partnership, member integration, or verification protocols ahead of our 2027 launch."
          )}
        </p>
      </div>

      {/* Success State */}
      {submitStatus === "success" ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-foreground mb-2">
            {t("associations.form.states.successTitle", "Partnership Inquiry Received")}
          </h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            {t(
              "associations.form.states.successMessage",
              "Thank you for reaching out. The CrewHive partnerships team has recorded your details and will get in touch with your leadership team."
            )}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-xs text-muted-foreground mb-6">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span>{t("associations.form.states.referenceNote", "Target Launch: January 1, 2027")}</span>
          </div>
          <div>
            <button
              onClick={handleReset}
              type="button"
              className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold transition-all cursor-pointer"
            >
              {t("associations.form.states.submitAnother", "Submit Another Inquiry")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5 relative z-10">
          {/* Duplicate Alert */}
          {submitStatus === "duplicate" && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold mb-1">Notice</p>
                <p>
                  {t(
                    "associations.form.states.duplicate",
                    "You have already submitted an inquiry for this association in this session."
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {submitStatus === "error" && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-200 text-xs animate-in fade-in duration-200"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">
                <p className="font-bold text-red-300 mb-1">
                  {t("associations.form.states.errorTitle", "Inquiry Submission Unavailable")}
                </p>
                <p className="leading-relaxed text-red-200/90">{apiErrorMessage}</p>
              </div>
            </div>
          )}

          {/* Grid fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Association Name */}
            <div>
              <label
                htmlFor="assoc-name"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {t("associations.form.associationName", "Association / Guild Name")}{" "}
                <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="assoc-name"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.associationName}
                  aria-describedby={errors.associationName ? "assoc-name-err" : undefined}
                  value={formData.associationName}
                  onChange={(e) => handleChange("associationName", e.target.value)}
                  placeholder={t(
                    "associations.form.associationNamePlaceholder",
                    "e.g., Kerala Sound Engineers Association"
                  )}
                  className={`w-full bg-muted/60 border rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-primary/30 min-h-[44px] ${
                    errors.associationName
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-border focus:border-primary/60"
                  }`}
                />
              </div>
              {errors.associationName && (
                <p id="assoc-name-err" className="text-red-400 text-xs mt-1">
                  {errors.associationName}
                </p>
              )}
            </div>

            {/* Contact Person */}
            <div>
              <label
                htmlFor="assoc-contact"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {t("associations.form.contactPerson", "Contact Person & Designation")}{" "}
                <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="assoc-contact"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.contactPerson}
                  aria-describedby={errors.contactPerson ? "assoc-contact-err" : undefined}
                  value={formData.contactPerson}
                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                  placeholder={t(
                    "associations.form.contactPersonPlaceholder",
                    "e.g., Rajesh Kumar (General Secretary)"
                  )}
                  className={`w-full bg-muted/60 border rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-primary/30 min-h-[44px] ${
                    errors.contactPerson
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-border focus:border-primary/60"
                  }`}
                />
              </div>
              {errors.contactPerson && (
                <p id="assoc-contact-err" className="text-red-400 text-xs mt-1">
                  {errors.contactPerson}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="assoc-phone"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {t("associations.form.phone", "Official Phone Number")}{" "}
                <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="assoc-phone"
                  type="tel"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "assoc-phone-err" : undefined}
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder={t("associations.form.phonePlaceholder", "e.g., 9876543210")}
                  className={`w-full bg-muted/60 border rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-primary/30 min-h-[44px] ${
                    errors.phone
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-border focus:border-primary/60"
                  }`}
                />
              </div>
              {errors.phone && (
                <p id="assoc-phone-err" className="text-red-400 text-xs mt-1">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="assoc-email"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {t("associations.form.email", "Official Email Address")}{" "}
                <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="assoc-email"
                  type="email"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "assoc-email-err" : undefined}
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder={t(
                    "associations.form.emailPlaceholder",
                    "e.g., contact@association.org"
                  )}
                  className={`w-full bg-muted/60 border rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-primary/30 min-h-[44px] ${
                    errors.email
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-border focus:border-primary/60"
                  }`}
                />
              </div>
              {errors.email && (
                <p id="assoc-email-err" className="text-red-400 text-xs mt-1">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* City / District */}
          <div>
            <label
              htmlFor="assoc-city"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              {t("associations.form.city", "Primary City / District")}{" "}
              <span className="text-red-400" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="assoc-city"
                required
                aria-required="true"
                aria-invalid={!!errors.city}
                aria-describedby={errors.city ? "assoc-city-err" : undefined}
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className={`w-full bg-muted/60 border rounded-xl pl-10 pr-10 py-3 text-base sm:text-sm text-foreground outline-none transition-all appearance-none cursor-pointer focus:ring-2 focus:ring-primary/30 min-h-[44px] ${
                  errors.city
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-border focus:border-primary/60"
                }`}
              >
                <option value="">
                  {t("associations.form.cityPlaceholder", "Select primary district")}
                </option>
                {KERALA_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {errors.city && (
              <p id="assoc-city-err" className="text-red-400 text-xs mt-1">
                {errors.city}
              </p>
            )}
          </div>

          {/* Additional Message */}
          <div>
            <label
              htmlFor="assoc-message"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              {t(
                "associations.form.message",
                "Additional Message / Member Count (Optional)"
              )}
            </label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
              <textarea
                id="assoc-message"
                rows={3}
                value={formData.message}
                onChange={(e) => handleChange("message", e.target.value)}
                placeholder={t(
                  "associations.form.messagePlaceholder",
                  "Tell us about your member base, crafts represented, or partnership goals..."
                )}
                className="w-full bg-muted/60 border border-border rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/30 resize-none min-h-[90px]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/60">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-b from-[#F5A623] to-[#DF9115] text-zinc-950 font-bold text-sm sm:text-base hover:brightness-105 active:scale-[0.98] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.4)] disabled:opacity-50 cursor-pointer shrink-0 text-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>{t("associations.form.submitting", "Submitting Inquiry...")}</span>
                </>
              ) : (
                <span>{t("associations.form.submit", "Submit Partnership Inquiry")}</span>
              )}
            </button>

            {/* Association Member Signup Link */}
            <div className="text-xs text-muted-foreground text-left sm:text-right">
              <span>{t("associations.section.memberPrompt", "Are you a member of an association?")} </span>
              <button
                type="button"
                onClick={handleMemberSignup}
                className="text-primary font-semibold hover:underline cursor-pointer ml-1 inline"
              >
                {t("associations.section.memberCta", "Onboard as Association Member")}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

